import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { FormEvent } from 'react';
import type { RowOutgoing, RowParking, StateTupleSchema, StoredValues } from '~/models/core.validations';
import type { action as standardOutgoingAction } from '~/routes/add-standard-outgoings';

import { json } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { RouteErrorBoundary } from '~/components/Boundaries';
import ClientVMarket from '~/components/ClientVMarket';
import { CustomStoredValue } from '~/components/CustomStoredValue';
import { EditableOutgoingsTable } from '~/components/EditableOutgoingsTable';
import { EditableParkingTable } from '~/components/EditableParkingTable';
import { FormTextField } from '~/components/FormTextField';
import { PrimaryButton } from '~/components/PrimaryButton';
import SavePanel from '~/components/SavePanel';
import { TableCell } from '~/components/TableCell';
import { TenantsTable } from '~/components/TenantsTable';
import { prisma } from '~/db.server';
import {
  RowOutgoingSchema,
  RowParkingSchema,
  StatusCode,
  StoredValuesSchma,
  badRequest,
  formatAmount,
  getValidatedId,
  hasSuccess,
  processBadRequest,
  validateStateId,
} from '~/models/core.validations';
import { delay } from '~/models/dates';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { fieldErrorsToArr, getRawFormFields, hasFieldErrors } from '~/models/forms';
import { AppLinks } from '~/models/links';
import {
  getAnnualOutgoingsPerBoth,
  getCapitalisedValue,
  getGrossRental,
  getMonthlyOutgoings,
  getNetAnnualRentalIncome,
  getOutgoingsIncomeRatio,
  getTotalAreaPerBoth,
  getTotalParking,
  getTotalRentalPerBoth,
  roundToDecimal,
  roundToTwoDecimals,
} from '~/models/plots.validations';
import { StoredValueId, getRecoveriesValue, getVacanciesValue } from '~/models/storedValuest';
import { StandardOutgoingsSchema } from '~/routes/add-standard-outgoings';
// import { getGrossRatePerClient } from '~/models/tenants.validations';
import { requireUser, requireUserId } from '~/session.server';
import { AiPlotChat } from '~/components/AiPlotChat';

export async function loader({ request, params }: LoaderArgs) {
  const currentUser = await requireUser(request);
  const plotId = getValidatedId(params.plotId);

  const [parkingTypes, plot] = await Promise.all([
    prisma.parkingType.findMany({
      select: { id: true, identifier: true },
    }),
    prisma.plot
      .findUnique({
        where: { id: plotId },
        select: {
          id: true,
          reviewedById: true,
          plotNumber: true,
          valuer: true,
          inspectionDate: true,
          plotDesc: true,
          plotExtent: true,
          address: true,
          zoning: true,
          classification: true,
          undevelopedPortion: true,
          rateForUndevelopedPortion: true,
          usage: true,
          storedValues: {
            select: { id: true, identifier: true, value: true },
          },
          tenants: {
            select: {
              name: true,
              termOfLease: true,
              startDate: true,
              endDate: true,
              grossMonthlyRental: true,
              escalation: true,
              propertyType: { select: { id: true, identifier: true } },
              areaPerClient: true,
              areaPerMarket: true,
              grossRatePerValuer: true,
              ratePerMarket: true,
            },
          },
          parkingRecords: {
            select: {
              id: true,
              parkingTypeId: true,
              parkingType: { select: { identifier: true } },
              unitPerClient: true,
              ratePerClient: true,
              unitPerMarket: true,
              ratePerMarket: true,
            },
          },
          outgoingRecords: {
            select: {
              id: true,
              identifier: true,
              itemType: true,
              unitPerClient: true,
              ratePerClient: true,
              unitPerMarket: true,
              ratePerMarket: true,
            },
          },
          insuranceRecords: {
            select: {
              id: true,
              item: { select: { id: true, identifier: true } },
              roofType: { select: { id: true, identifier: true } },
              rate: true,
              area: true,
            },
          },
        },
      })
      .then((plot) => {
        if (!plot) {
          return undefined;
        }
        return {
          ...plot,
          undevelopedPortion: Number(plot.undevelopedPortion),
          rateForUndevelopedPortion: Number(plot.rateForUndevelopedPortion),
          tenants: plot.tenants.map((tenant) => ({
            ...tenant,
            startDate: dayjs(tenant.startDate).format('YYYY-MM-DD'),
            endDate: dayjs(tenant.endDate).format('YYYY-MM-DD'),
            remMonths: dayjs(tenant.endDate).diff(dayjs(), 'month'),
            grossMonthlyRental: Number(tenant.grossMonthlyRental),
            escalation: Number(tenant.escalation),
            ratePerMarket: Number(tenant.ratePerMarket),
            areaPerClient: Number(tenant.areaPerClient),
            areaPerMarket: Number(tenant.areaPerMarket),
          })),
          parkingRecords: plot.parkingRecords.map((record) => ({
            ...record,
            ratePerClient: Number(record.ratePerClient),
            ratePerMarket: Number(record.ratePerMarket),
          })),
          outgoingRecords: plot.outgoingRecords
            .sort((a, b) => {
              if (a.identifier === '') {
                return 1;
              }
              const sortOrder: Record<string, number> = {
                '12': 1,
                '1': 2,
                '%': 3,
              } as const;
              return sortOrder[a.itemType || '12'] - sortOrder[b.itemType || '12'];
            })
            .map((record) => ({
              ...record,
              itemType: record.itemType || undefined,
              unitPerClient: Number(record.unitPerClient),
              ratePerClient: Number(record.ratePerClient),
              ratePerMarket: Number(record.ratePerMarket),
            })),
          insuranceRecords: plot.insuranceRecords.map((record) => ({
            ...record,
            rate: Number(record.rate),
            area: Number(record.area),
          })),
        };
      }),
  ]);
  if (!plot) {
    throw new Response('Plot record not found', {
      status: StatusCode.NotFound,
    });
  }
  console.log(
    '>total unit per client',
    plot.outgoingRecords.reduce((acc, record) => acc + record.unitPerClient, 0),
  );
  console.log(
    '>total rate per client',
    plot.outgoingRecords.reduce((acc, record) => acc + record.ratePerClient, 0),
  );

  function getStoredValue(identifier: StoredValueId) {
    if (!plot) {
      return undefined;
    }
    const match = plot.storedValues.find((el) => el.identifier === identifier);
    if (!match) {
      return undefined;
    }
    return { ...match, value: Number(match.value) };
  }

  const vacancyPercentage = getStoredValue(StoredValueId.VacancyPercentage);
  const fsvAdjustment = getStoredValue(StoredValueId.FsvAdjustment);
  const recoveryFigure = getStoredValue(StoredValueId.RecoveryFigure);
  const capitalisationRate = getStoredValue(StoredValueId.CapitalisationRate);
  // const capitalisedFigure = getStoredValue(StoredValueId.CapitalisedFigure);
  const netAnnualEscalation = getStoredValue(StoredValueId.NetAnnualEscalation);
  const discountRate = getStoredValue(StoredValueId.DiscountRate);
  const lastCapitalisedPerc = getStoredValue(StoredValueId.LastCapitalisedPerc);

  /******************************************************************* */
  const totalRental = getTotalRentalPerBoth(
    plot.tenants.map((tenant) => ({
      ...tenant,
      grossMonthlyRental: tenant.areaPerClient * tenant.ratePerMarket,
    })),
  );
  const totalParking = getTotalParking(plot.parkingRecords.map((record) => record.unitPerClient * record.ratePerClient));
  const grossRental = getGrossRental(totalRental, totalParking);
  console.log('grossRental', grossRental.annual);

  // const mgmtValue = calcMaintenanceOutgoing(
  //   grossRental.annual,
  //   vacancyPercentage?.value || 0,
  // );
  const mgmtValue = grossRental.annual - grossRental.annual * (vacancyPercentage?.value || 0) * 0.01;
  console.log('mgmtValue', mgmtValue);
  // const mgmtValue = totalRental - (vacancyPercentage?.value || 0) * 0.01;
  const mgmt = await (async () => {
    const record = await prisma.outgoing.findFirst({
      where: { identifier: 'Management Fee' },
    });
    if (record) {
      return { ...record, unitPerClient: Number(record.unitPerClient) };
    }
    return prisma.outgoing
      .create({
        data: {
          plotId: plot.id,
          identifier: 'Management Fee',
          unitPerClient: mgmtValue,
          ratePerClient: 1,
          unitPerMarket: 1,
          ratePerMarket: 1,
        },
      })
      .then((record) => ({
        ...record,
        unitPerClient: Number(record.unitPerClient),
      }));
  })();
  if (mgmt.unitPerClient !== mgmtValue) {
    await prisma.outgoing.update({
      where: { id: mgmt.id },
      data: { unitPerClient: mgmtValue },
    });
  }
  /******************************************************************* */
  const updatedPlot = {
    ...plot,
    outgoingRecords: plot.outgoingRecords.map((record) => {
      if (record.identifier === 'Management Fee') {
        return { ...record, unitPerClient: mgmtValue };
      }
      return record;
    }),
  };
  /******************************************************************* */
  const totalArea = getTotalAreaPerBoth(plot.tenants);
  console.log('totalArea', totalArea.client);

  const outgoings = (() => {
    const annual = getAnnualOutgoingsPerBoth(plot.outgoingRecords);
    return {
      annual,
      monthly: getMonthlyOutgoings(annual, totalArea.client),
    };
  })();
  console.log('outgoings', outgoings.annual);

  const netAnnualRentalIncome = (() => {
    return getNetAnnualRentalIncome(grossRental.annual, outgoings.annual, vacancyPercentage?.value || 0, recoveryFigure?.value || 0, totalArea.client);
  })();

  const capitalisedValue = (() => {
    return getCapitalisedValue(netAnnualRentalIncome, capitalisationRate?.value || 0);
  })();

  const capitalisedFigure = totalArea.client ? Number((capitalisedValue / totalArea.client).toFixed(0)) : 0;

  /******************************************************************* */

  const cantEdit = plot.reviewedById ? !currentUser.isSuper : false;
  // const cantEdit = !!plot.reviewedById && !currentUser.isSuper;

  /******************************************************************* */

  const subTotal = plot.insuranceRecords.reduce((acc, record) => {
    const recordTotal = record.rate * (record.area || 0);
    const result = acc + roundToTwoDecimals(recordTotal);
    return roundToTwoDecimals(result);
  }, 0);

  const insuranceVat = getStoredValue(StoredValueId.InsuranceVat);
  const profFee = getStoredValue(StoredValueId.ProfFees);
  const preTenderEscalationAt = getStoredValue(StoredValueId.PreTenderEscalationAt);
  const preTenderEscalationPerc = getStoredValue(StoredValueId.PreTenderEscalationPerc);
  const postTenderEscalationAt = getStoredValue(StoredValueId.PostTenderEscalationAt);
  const postTenderEscalationPerc = getStoredValue(StoredValueId.PostTenderEscalationPerc);

  const vat = (() => {
    const result = subTotal * ((insuranceVat?.value || 0) / 100);
    return Number(result.toFixed(2));
  })();

  const comProperty = 0;

  const profFees = (() => {
    const result = (profFee?.value || 0) * 0.01 * (subTotal + vat + comProperty);
    // const result = 0.15 * (subTotal + vat + comProperty);
    return Number(result.toFixed(2));
  })();

  const replacementCost = (() => {
    const result = subTotal + vat + comProperty + profFees;
    return Number(result.toFixed(2));
  })();

  const preTenderEscl = (() => {
    const result = ((((preTenderEscalationPerc?.value || 0) / 100) * (preTenderEscalationAt?.value || 0)) / 12) * replacementCost;
    return Number(result.toFixed(2));
  })();

  const postTenderEscl = (() => {
    const result = ((((postTenderEscalationPerc?.value || 0) / 100) * (postTenderEscalationAt?.value || 0)) / 12) * subTotal;
    return Number(result.toFixed(2));
  })();

  const insuranceTotal = (() => {
    const result = replacementCost + preTenderEscl + postTenderEscl;
    return roundToDecimal(result, 1);
  })();

  const maintenance = await (async () => {
    const record = await prisma.outgoing.findFirst({
      where: { identifier: 'Maintenance and Repairs' },
    });
    if (record) {
      return { ...record, unitPerClient: Number(record.unitPerClient) };
    }
    return prisma.outgoing
      .create({
        data: {
          plotId: plot.id,
          identifier: 'Maintenance and Repairs',
          unitPerClient: insuranceTotal,
          ratePerClient: 1,
          unitPerMarket: 1,
          ratePerMarket: 1,
        },
      })
      .then((record) => ({
        ...record,
        unitPerClient: Number(record.unitPerClient),
      }));
  })();
  if (maintenance.unitPerClient !== insuranceTotal) {
    await prisma.outgoing.update({
      where: { id: maintenance.id },
      data: { unitPerClient: insuranceTotal },
    });
  }
  /******************************************************************* */
  const updatedPlot2 = {
    ...updatedPlot,
    outgoingRecords: updatedPlot.outgoingRecords.map((record) => {
      if (record.identifier === 'Maintenance and Repairs') {
        return { ...record, unitPerClient: insuranceTotal };
      }
      return record;
    }),
  };

  const insuranceRecord = await (async () => {
    const record = await prisma.outgoing.findFirst({
      where: { identifier: 'Insurance' },
    });
    if (record) {
      return { ...record, unitPerClient: Number(record.unitPerClient) };
    }
    return prisma.outgoing
      .create({
        data: {
          plotId: plot.id,
          identifier: 'Insurance',
          unitPerClient: insuranceTotal,
          ratePerClient: 1,
          unitPerMarket: 1,
          ratePerMarket: 1,
        },
      })
      .then((record) => ({
        ...record,
        unitPerClient: Number(record.unitPerClient),
      }));
  })();
  if (insuranceRecord.unitPerClient !== insuranceTotal) {
    await prisma.outgoing.update({
      where: { id: insuranceRecord.id },
      data: { unitPerClient: insuranceTotal },
    });
  }
  /******************************************************************* */
  const updatedPlot3 = {
    ...updatedPlot2,
    outgoingRecords: updatedPlot2.outgoingRecords.map((record) => {
      if (record.identifier === 'Insurance') {
        return { ...record, unitPerClient: insuranceTotal };
      }
      return record;
    }),
  };

  /******************************************************************* */

  return json({
    cantEdit,
    grossRental,
    storedValues: {
      fsvAdjustment,
      vacancyPercentage,
      recoveryFigure,
      capitalisationRate,
      capitalisedFigure,
      netAnnualEscalation,
      discountRate,
      lastCapitalisedPerc,
    },
    plot: updatedPlot3,
    parkingTypes,
  });
}

const Schema = z.object({
  undevelopedPortion: z.literal('').or(z.coerce.number().min(0)),
  rateForUndevelopedPortion: z.literal('').or(z.coerce.number().min(0)),
  parkings: z.preprocess((arg) => {
    try {
      if (typeof arg === 'string') {
        return JSON.parse(arg);
      }
    } catch (error) {
      return undefined;
    }
  }, z.array(RowParkingSchema)),
  outgoings: z.preprocess((arg) => {
    try {
      if (typeof arg === 'string') {
        return JSON.parse(arg);
      }
    } catch (error) {
      return undefined;
    }
  }, z.array(RowOutgoingSchema)),
  storedValues: z.preprocess((arg) => {
    try {
      if (typeof arg === 'string') {
        return JSON.parse(arg);
      }
    } catch (error) {
      return undefined;
    }
  }, StoredValuesSchma),
});

export async function action({ request, params }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  try {
    const plotId = getValidatedId(params.plotId);
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { parkings, outgoings, storedValues, undevelopedPortion, rateForUndevelopedPortion } = result.data;

    await prisma.$transaction(async (tx) => {
      await tx.plot.update({
        where: { id: plotId },
        data: {
          undevelopedPortion: undevelopedPortion || 0,
          rateForUndevelopedPortion: rateForUndevelopedPortion || 0,
        },
      });
      const currentParkings = await tx.parking.findMany({
        where: { plotId },
        select: { id: true },
      });
      const newParkings = parkings.filter((parking) => !parking.id);
      const existingParkings = parkings.filter((parking) => parking.id);
      const parkingsToDelete = currentParkings.filter((parking) => {
        return parkings.every((el) => el.id !== parking.id);
      });
      await parkingsToDelete.reduce(async (acc, parking) => {
        await acc;
        await tx.parking.delete({ where: { id: parking.id } });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Parking,
            action: EventAction.Delete,
            recordId: parking.id,
            recordData: JSON.stringify(parking),
          },
        });
      }, Promise.resolve());
      await newParkings.reduce(async (acc, parking) => {
        await acc;
        const record = await tx.parking.create({
          data: {
            plotId,
            parkingTypeId: parking.parkingTypeId,
            unitPerClient: parking.unitPerClient.toFixed(2),
            ratePerClient: parking.ratePerClient.toFixed(2),
            unitPerMarket: 1,
            ratePerMarket: 1,
          },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Parking,
            action: EventAction.Create,
            recordId: parking.id,
            recordData: JSON.stringify(record),
          },
        });
      }, Promise.resolve());
      await existingParkings.reduce(async (acc, parking) => {
        await acc;
        const updated = await tx.parking.update({
          where: { id: parking.id },
          data: {
            parkingTypeId: parking.parkingTypeId,
            unitPerClient: parking.unitPerClient.toFixed(2),
            ratePerClient: parking.ratePerClient.toFixed(2),
          },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Parking,
            action: EventAction.Update,
            recordId: parking.id,
            recordData: JSON.stringify(updated),
          },
        });
      }, Promise.resolve());

      const currentOutgoings = await tx.outgoing.findMany({
        where: { plotId },
        select: { id: true },
      });
      const newOutgoings = outgoings.filter((outgoing) => !outgoing.id);
      console.log('newOutgoings', newOutgoings);
      const existingOutgoings = outgoings.filter((outgoing) => outgoing.id);
      const outgoingsToDelete = currentOutgoings.filter((outgoing) => {
        return outgoings.every((el) => el.id !== outgoing.id);
      });
      await outgoingsToDelete.reduce(async (acc, outgoing) => {
        await acc;
        await tx.outgoing.delete({ where: { id: outgoing.id } });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Outgoing,
            action: EventAction.Delete,
            recordId: outgoing.id,
            recordData: JSON.stringify(outgoing),
          },
        });
      }, Promise.resolve());
      await newOutgoings.reduce(async (acc, outgoing) => {
        await acc;
        const record = await tx.outgoing.create({
          data: {
            plotId,
            identifier: outgoing.identifier,
            unitPerClient: outgoing.unitPerClient.toFixed(2),
            ratePerClient: outgoing.ratePerClient.toFixed(2),
            unitPerMarket: 1,
            ratePerMarket: 1,
          },
        });
        console.log('Added outgoing', record);
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Outgoing,
            action: EventAction.Create,
            recordId: record.id,
            recordData: JSON.stringify(record),
          },
        });
      }, Promise.resolve());
      await existingOutgoings.reduce(async (acc, outgoing) => {
        await acc;
        const updated = await tx.outgoing.update({
          where: { id: outgoing.id },
          data: {
            identifier: outgoing.identifier,
            unitPerClient: outgoing.unitPerClient.toFixed(2),
            ratePerClient: outgoing.ratePerClient.toFixed(2),
          },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Outgoing,
            action: EventAction.Update,
            recordId: outgoing.id,
            recordData: JSON.stringify(updated),
          },
        });
      }, Promise.resolve());

      const valueRecords = await tx.storedValue.findMany({
        where: { plotId },
        select: { id: true, identifier: true },
      });

      async function updateStoredValueRecord(identifier: string, newValue: number) {
        const record = valueRecords.find((record) => record.identifier === identifier);
        if (record) {
          const updated = await tx.storedValue.update({
            where: { id: record.id },
            data: { value: newValue },
          });
          await tx.event.create({
            data: {
              userId: currentUserId,
              domain: EventDomain.StoredValue,
              action: EventAction.Update,
              recordId: record.id,
              recordData: JSON.stringify(updated),
            },
          });
        } else {
          const record = await tx.storedValue.create({
            data: { plotId, identifier, value: newValue },
          });
          await tx.event.create({
            data: {
              userId: currentUserId,
              domain: EventDomain.StoredValue,
              action: EventAction.Create,
              recordId: record.id,
              recordData: JSON.stringify(record),
            },
          });
        }
      }

      await updateStoredValueRecord(StoredValueId.VacancyPercentage, storedValues.vacancyPercentage);
      await updateStoredValueRecord(StoredValueId.FsvAdjustment, storedValues.fsvAdjustment);
      await updateStoredValueRecord(StoredValueId.RecoveryFigure, storedValues.recoveryFigure);
      await updateStoredValueRecord(StoredValueId.CapitalisationRate, storedValues.capitalisationRate);
      await updateStoredValueRecord(StoredValueId.NetAnnualEscalation, storedValues.netAnnualEscalation);
      await updateStoredValueRecord(StoredValueId.DiscountRate, storedValues.discountRate);
      await updateStoredValueRecord(StoredValueId.LastCapitalisedPerc, storedValues.lastCapitalisedPerc);
    });

    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}

export default function PlotIncomePage() {
  const { storedValues: initialStoredValues, plot, parkingTypes, cantEdit, grossRental } = useLoaderData<typeof loader>();

  const standardFetcher = useFetcher<typeof standardOutgoingAction>();
  const { getNameProp: getStandardNameProp, isProcessing: isStandardProcessing } = useForm(standardFetcher, StandardOutgoingsSchema);

  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const standardFormRef = useRef<HTMLFormElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (hasSuccess(standardFetcher.data)) {
      toast.success('Standard outgoings added');
    }
  }, [standardFetcher.data]);

  useEffect(() => {
    if (fetcher.data) {
      console.log(fetcher.data);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      toast.success('Changes saved');
    }
  }, [fetcher.data]);

  const [parkings, setParkings] = useState<(RowParking & { index: number; err?: string })[]>(
    plot.parkingRecords.map((record, index) => ({
      ...record,
      index,
    })) || [],
  );

  const totalRental = getTotalRentalPerBoth(
    plot.tenants.map((tenant) => ({
      ...tenant,
      grossMonthlyRental: tenant.areaPerClient * tenant.ratePerMarket,
    })),
  );
  const totalParking = getTotalParking(parkings.map((record) => record.unitPerClient * record.ratePerClient));

  const [outgoings, setOutgoings] = useState<(RowOutgoing & { index: number; err?: string })[]>(
    plot.outgoingRecords.map((record, index) => ({
      ...record,
      index,
    })) || [],
  );

  useEffect(() => {
    setOutgoings(
      plot.outgoingRecords.map((record, index) => ({
        ...record,
        index,
      })),
    );
  }, [plot]);

  const totalArea = getTotalAreaPerBoth(plot.tenants);
  const { annual: annualOutgoings, monthly: monthlyOutgoings } = (() => {
    const annual = getAnnualOutgoingsPerBoth(outgoings);
    return {
      annual,
      monthly: getMonthlyOutgoings(annual, totalArea.client),
    };
  })();

  const [storedValues, setStoredValues] = useState<StoredValues>({
    vacancyPercentage: initialStoredValues.vacancyPercentage?.value || 0,
    recoveryFigure: initialStoredValues.recoveryFigure?.value || 0,
    capitalisationRate: initialStoredValues.capitalisationRate?.value || 0,
    netAnnualEscalation: initialStoredValues.netAnnualEscalation?.value || 0,
    discountRate: initialStoredValues.discountRate?.value || 0,
    lastCapitalisedPerc: initialStoredValues.lastCapitalisedPerc?.value || 0,
    fsvAdjustment: initialStoredValues.fsvAdjustment?.value || 0,
  });

  const [undevelopedPortion, setUndevelopedPortion] = useState<number | ''>(plot.undevelopedPortion || '');
  const [rateForUndevelopedPortion, setRateForUndevelopedPortion] = useState<number | ''>(plot.rateForUndevelopedPortion || '');

  /******************************************************************* */

  const outgoingsRentalRatio = getOutgoingsIncomeRatio(annualOutgoings, grossRental.annual);

  console.log('INCOME outgoings', annualOutgoings);

  console.log('INCOME grossRental.annual', grossRental.annual);
  console.log('INCOME vacancyPercentage?.value || 0', storedValues.vacancyPercentage || 0);
  console.log('INCOME recoveryFigure?.value || 0', storedValues.recoveryFigure || 0);
  console.log('INCOME totalArea.client', totalArea.client);

  const netAnnualRentalIncome = (() => {
    return getNetAnnualRentalIncome(grossRental.annual, annualOutgoings, storedValues.vacancyPercentage, storedValues.recoveryFigure, totalArea.client);
  })();

  const capitalisedValue = (() => {
    return getCapitalisedValue(netAnnualRentalIncome, storedValues.capitalisationRate);
  })();

  const capitalisedFigure = totalArea.client ? Number((capitalisedValue / totalArea.client).toFixed(0)) : 0;

  const valueOfUndeveloped = roundToDecimal((undevelopedPortion || 0) * (rateForUndevelopedPortion || 0), 2);

  const marketValue = valueOfUndeveloped + capitalisedValue;

  const fsv = roundToTwoDecimals(marketValue - (storedValues.fsvAdjustment || 0) * 0.01 * marketValue);

  interface Aggregate {
    area: number;
    gla: number;
  }

  interface AssetType extends Aggregate {
    identifier: string;
    num: number;
    rate: number;
    gross: number;
    ratePerMarket: number;
  }

  const groupedAssetTypes = plot.tenants.reduce((acc, tenant) => {
    const match = acc.find((assetType) => assetType.identifier === tenant.propertyType.identifier);
    if (match) {
      const newArea = match.area + tenant.areaPerClient;
      const newGross = match.gross + tenant.areaPerClient * tenant.ratePerMarket;
      const newNum = match.num + 1;

      const newRate = newArea ? newGross / newArea : 0;

      const newRatePerMarket = (match.ratePerMarket + tenant.ratePerMarket) / newNum;

      const gla = totalArea.client ? tenant.areaPerClient / totalArea.client : 0;
      const newGla = match.gla + gla;

      return acc.map((assetType) => {
        if (assetType.identifier === match.identifier) {
          return {
            ...assetType,
            area: newArea,
            gross: newGross,
            gla: newGla,
            rate: newRate,
            num: newNum,
            ratePerMarket: newRatePerMarket,
          };
        }
        return assetType;
      });
    } else {
      const newNum = 1;
      const newArea = tenant.areaPerClient;
      const newGross = tenant.areaPerClient * tenant.ratePerMarket;
      // const newRate = tenant.areaPerClient
      //   ? tenant.grossMonthlyRental / tenant.areaPerClient
      //   : 0;
      const newRate = newArea ? newGross / newArea : 0;
      const newGla = totalArea.client ? tenant.areaPerClient / totalArea.client : 0;
      const newRatePerMarket = tenant.ratePerMarket;
      return [
        ...acc,
        {
          identifier: tenant.propertyType.identifier,
          area: newArea,
          gross: newGross,
          rate: newRate,
          gla: newGla,
          num: newNum,
          ratePerMarket: newRatePerMarket,
        },
      ];
    }
  }, [] as AssetType[]);

  const aggregate = plot.tenants.reduce(
    (acc, tenant) => {
      const newArea = acc.area + tenant.areaPerClient;
      const gla = totalArea.client ? tenant.areaPerClient / totalArea.client : 0;
      const newGla = acc.gla + gla;
      return { ...acc, area: newArea, gla: newGla };
    },
    { area: 0, gla: 0 } as Aggregate,
  );

  useEffect(() => {
    if (hasFieldErrors(fetcher.data)) {
      const fieldErrors = fetcher.data.fieldErrors;
      for (let err in fieldErrors) {
        toast.error(fieldErrors[err]?.toString() || 'Something went wrong saving changes, please try again');
      }
    }
  }, [fetcher.data]);

  async function addParkingRow() {
    setParkings((prevState) => {
      const lastRow = prevState.length ? prevState[prevState.length - 1] : { index: 0 };
      return [
        ...prevState,
        {
          index: lastRow.index + 1,
          id: '',
          parkingTypeId: '',
          unitPerClient: 0,
          ratePerClient: 0,
        },
      ];
    });
    await delay(100);
    if (formRef.current) {
      fetcher.submit(formRef.current);
    }
  }
  async function addOutgoingRow() {
    setOutgoings((prevState) => {
      const lastRow = prevState.length ? prevState[prevState.length - 1] : { index: 0 };
      return [
        ...prevState,
        {
          index: lastRow.index + 1,
          id: '',
          identifier: '',
          unitPerClient: 0,
          ratePerClient: 0,
        },
      ];
    });
    await delay(100);
    if (formRef.current) {
      fetcher.submit(formRef.current);
    }
  }

  const deleteParkingRow = (index: number) => {
    setParkings((prevState) => prevState.filter((el) => el.index !== index));
  };
  const deleteOutgoingRow = (index: number) => {
    setOutgoings((prevState) => prevState.filter((el) => el.index !== index));
  };

  function updateParkingField<T extends z.ZodTypeAny>(stateTuple: z.infer<typeof StateTupleSchema>, Schema: T, data: unknown) {
    const index = stateTuple[1];
    const field = stateTuple[2];
    const result = Schema.safeParse(data);
    if (!result.success) {
      return console.log(field, 'error', result.error);
    }
    console.log('new value for', field, result.data);
    setParkings((prevState) =>
      prevState.map((record) => {
        if (record.index !== index) {
          return record;
        }
        return { ...record, [field]: result.data };
      }),
    );
  }
  function updateOutgoingField<T extends z.ZodTypeAny>(stateTuple: z.infer<typeof StateTupleSchema>, Schema: T, data: unknown) {
    const index = stateTuple[1];
    const field = stateTuple[2];
    const result = Schema.safeParse(data);
    if (!result.success) {
      return console.log(field, 'error', result.error);
    }
    console.log('new value for', field, result.data);
    setOutgoings((prevState) =>
      prevState.map((record) => {
        if (record.index !== index) {
          return record;
        }
        return { ...record, [field]: result.data };
      }),
    );
  }

  function updateStoredValue(id: keyof StoredValues, data: unknown) {
    const result = z.literal('').or(z.coerce.number()).safeParse(data);
    if (!result.success) {
      return console.log(id, 'error', result.error);
    }
    console.log('new value for', id, result.data);
    setStoredValues((prevState) => ({
      ...prevState,
      [id]: result.data,
    }));
  }

  function updateState(name: string, data: unknown) {
    const stateTuple = validateStateId(name);
    if (!stateTuple) {
      return;
    }
    if (!Array.isArray(stateTuple)) {
      if (stateTuple === 'vacancyPercentage') {
        updateStoredValue('vacancyPercentage', data);
      }
      if (stateTuple === 'fsvAdjustment') {
        updateStoredValue('fsvAdjustment', data);
      }
      if (stateTuple === 'recoveryFigure') {
        updateStoredValue('recoveryFigure', data);
      }
      if (stateTuple === 'capitalisationRate') {
        updateStoredValue('capitalisationRate', data);
      }
      if (stateTuple === 'netAnnualEscalation') {
        updateStoredValue('netAnnualEscalation', data);
      }
      if (stateTuple === 'discountRate') {
        updateStoredValue('discountRate', data);
      }
      if (stateTuple === 'lastCapitalisedPerc') {
        updateStoredValue('lastCapitalisedPerc', data);
      }
      if (stateTuple === getNameProp('undevelopedPortion').name) {
        const result = z.literal('').or(z.coerce.number()).safeParse(data);
        if (result.success) {
          setUndevelopedPortion(result.data);
        }
      }
      if (stateTuple === getNameProp('rateForUndevelopedPortion').name) {
        const result = z.literal('').or(z.coerce.number()).safeParse(data);
        if (result.success) {
          setRateForUndevelopedPortion(result.data);
        }
      }
      return;
    }
    const id = stateTuple[0];
    const field = stateTuple[2];
    if (id === 'parking') {
      if (field === 'parkingTypeId') {
        updateParkingField(stateTuple, z.string(), data);
      }
      if (field === 'unitPerClient') {
        updateParkingField(stateTuple, z.literal('').or(z.coerce.number()), data);
      }
      if (field === 'ratePerClient') {
        updateParkingField(stateTuple, z.literal('').or(z.coerce.number()), data);
      }
    }
    if (id === 'outgoing') {
      if (field === 'identifier') {
        updateOutgoingField(stateTuple, z.string(), data);
      }
      if (field === 'unitPerClient') {
        updateOutgoingField(stateTuple, z.literal('').or(z.coerce.number()), data);
      }
      if (field === 'ratePerClient') {
        updateOutgoingField(stateTuple, z.literal('').or(z.coerce.number()), data);
      }
    }
  }

  function validateParkings() {
    const relevantParkings = parkings.filter((el) => el.parkingTypeId);
    const erred = relevantParkings
      .map((el) => {
        const result = RowParkingSchema.safeParse(el);
        if (!result.success) {
          const { fieldErrors, formErrors } = result.error.flatten();
          const error = [...fieldErrorsToArr(fieldErrors), ...formErrors].filter(Boolean).join(', ');
          return [el.index, error] as const;
        }
        return undefined;
      })
      .filter(Boolean);
    if (erred.length) {
      setParkings((prevState) =>
        prevState.map((record) => {
          const match = erred.find(([index]) => index === record.index);
          if (match) {
            return { ...record, err: match[1] };
          }
          return { ...record, err: '' };
        }),
      );
      return true;
    }
    return false;
  }

  function validateOutgoings() {
    const relevantOutgoings = outgoings.filter((el) => el.identifier);
    const erred = relevantOutgoings
      .map((el) => {
        const result = RowOutgoingSchema.safeParse(el);
        if (!result.success) {
          const { fieldErrors, formErrors } = result.error.flatten();
          const error = [...fieldErrorsToArr(fieldErrors), ...formErrors].filter(Boolean).join(', ');
          return [el.index, error] as const;
        }
        return undefined;
      })
      .filter(Boolean);
    if (erred.length) {
      setOutgoings((prevState) =>
        prevState.map((record) => {
          const match = erred.find(([index]) => index === record.index);
          if (match) {
            return { ...record, err: match[1] };
          }
          return { ...record, err: '' };
        }),
      );
      return true;
    }
    return false;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const parkingsErred = validateParkings();
    if (parkingsErred) {
      return;
    }

    const outgoingsErred = validateOutgoings();
    if (outgoingsErred) {
      return;
    }

    fetcher.submit(event.currentTarget);
  }

  function handleAddStandardOutgoings() {
    if (standardFormRef.current) {
      standardFetcher.submit(standardFormRef.current);
    }
  }

  return (
    <>
      <standardFetcher.Form ref={standardFormRef} method="post" action={AppLinks.AddStandardOutgoings}>
        <input type="hidden" {...getStandardNameProp('plotId')} value={plot.id} />
        <button type="submit" className="top-0 left-0 absolute invisible">
          Submit
        </button>
      </standardFetcher.Form>
      <fetcher.Form ref={formRef} method="post" onSubmit={handleSubmit} className="flex flex-col items-stretch gap-8">
        <ActionContextProvider {...fetcher.data} updateState={updateState} isSubmitting={isProcessing || isStandardProcessing} disabled={cantEdit}>
          <input type="hidden" {...getNameProp('parkings')} value={JSON.stringify(parkings.filter((parking) => parking.parkingTypeId))} />
          <input type="hidden" {...getNameProp('outgoings')} value={JSON.stringify(outgoings)} />
          <input type="hidden" {...getNameProp('storedValues')} value={JSON.stringify(storedValues)} />
          <span className="text-xl font-semibold">Income & Outgoings</span>
          <div className="flex flex-col items-stretch gap-2">
            <div className="flex flex-row items-end gap-2">
              <h3 className="text-lg font-semibold">Incomings</h3>
            </div>
            <TenantsTable
              records={[
                {
                  propertyType: 'Total Let Area',
                  areaPerClient: aggregate.area,
                  gla: formatAmount(100),
                },
              ]}
              assetTypes={groupedAssetTypes}
              totalRental={totalRental}
            />
          </div>
          <div className="flex flex-col items-stretch gap-2">
            <div className="flex flex-row items-end gap-2">
              <h3 className="text-lg font-semibold">Other Income</h3>
            </div>
            <EditableParkingTable
              records={parkings}
              parkingTypes={parkingTypes}
              totalParking={totalParking}
              grossRentalMonthly={grossRental.monthly}
              grossRentalAnnual={grossRental.annual}
              addRow={addParkingRow}
              deleteRow={deleteParkingRow}
            />
          </div>
          <div className="flex flex-col items-stretch gap-2">
            <div className="flex flex-row items-end gap-2">
              <h3 className="text-lg font-semibold">Outgoings</h3>
            </div>
            <EditableOutgoingsTable
              records={outgoings}
              annualOutgoings={annualOutgoings}
              outgoingsPerMonth={monthlyOutgoings}
              addRow={addOutgoingRow}
              deleteRow={deleteOutgoingRow}
              addStandardOutgoings={handleAddStandardOutgoings}
            />
          </div>
          <div className="flex flex-col items-stretch gap-2">
            <div className="flex flex-row items-end gap-2">
              <h3 className="text-lg font-semibold">Capitalised Value of Income</h3>
            </div>
            <table>
              <tbody>
                <tr>
                  <TableCell>Gross Annual Income</TableCell>
                  <TableCell colSpan={4} className="text-end">
                    <ClientVMarket client={formatAmount(grossRental.annual)} market={formatAmount(grossRental.annual)} />
                  </TableCell>
                </tr>
                <tr>
                  <TableCell>
                    <i className="font-light">less</i> Vacancies
                  </TableCell>
                  <TableCell colSpan={3} className="text-end p-2">
                    <div className="flex flex-row items-center gap-1">
                      <CustomStoredValue name="vacancyPercentage" defaultValue={storedValues.vacancyPercentage} isCamo type="number" step={0.01} className="text-end" />
                      <span className="font-light text-lg">%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-end">
                    <ClientVMarket
                      client={formatAmount(getVacanciesValue(storedValues.vacancyPercentage, grossRental.annual))}
                      market={formatAmount(getVacanciesValue(storedValues.vacancyPercentage, grossRental.annual))}
                    />
                  </TableCell>
                </tr>
                <tr>
                  <TableCell>
                    <i className="font-light">less</i> Annual Outgoings
                  </TableCell>
                  <TableCell colSpan={4} className="text-end">
                    <ClientVMarket client={formatAmount(annualOutgoings)} market={formatAmount(annualOutgoings)} />
                  </TableCell>
                </tr>
                <tr>
                  <TableCell>
                    <i className="font-light">add</i> Recoveries
                  </TableCell>
                  <TableCell colSpan={2} className="text-end">
                    <ClientVMarket client={formatAmount(totalArea.client)} market={formatAmount(totalArea.market)} />
                  </TableCell>
                  <TableCell className="text-end p-2">
                    <div className="flex flex-row items-center gap-1">
                      <CustomStoredValue name="recoveryFigure" defaultValue={storedValues.recoveryFigure} isCamo type="number" step={0.01} className="text-end" />
                      {/* <span className="font-light text-lg">%</span> */}
                    </div>
                  </TableCell>
                  <TableCell className="text-end">
                    <ClientVMarket
                      client={formatAmount(getRecoveriesValue(storedValues.recoveryFigure, totalArea.client))}
                      market={formatAmount(getRecoveriesValue(storedValues.recoveryFigure, totalArea.market))}
                    />
                  </TableCell>
                </tr>
                <tr>
                  <TableCell>Net Annual Income</TableCell>
                  <TableCell colSpan={4} className="text-end">
                    <ClientVMarket client={formatAmount(netAnnualRentalIncome)} market={formatAmount(netAnnualRentalIncome)} />
                  </TableCell>
                </tr>
                <tr>
                  <TableCell>Ratio Outgoings / Gross Income</TableCell>
                  <TableCell colSpan={3} className="text-end">
                    <ClientVMarket client={formatAmount(outgoingsRentalRatio) + ' %'} market={formatAmount(outgoingsRentalRatio) + ' %'} />
                  </TableCell>
                  <TableCell className="text-end" />
                </tr>
                <tr>
                  <TableCell>Capitalisation Rate</TableCell>
                  <TableCell colSpan={3} className="text-end p-2">
                    <div className="flex flex-row items-center gap-1">
                      <CustomStoredValue name="capitalisationRate" defaultValue={storedValues.capitalisationRate} isCamo type="number" step={0.01} className="text-end" />
                      <span className="font-light text-lg">%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-end" />
                </tr>
                <tr>
                  <TableCell>
                    <span className="font-semibold">Capitalised Value</span>
                  </TableCell>
                  <TableCell colSpan={3} className="text-end">
                    <ClientVMarket className="gap-2 font-semibold" client={formatAmount(capitalisedFigure) + '/m2'} market={formatAmount(capitalisedFigure)} />
                  </TableCell>
                  <TableCell className="text-end">
                    <ClientVMarket className="gap-2 font-semibold" client={formatAmount(capitalisedValue)} market={formatAmount(capitalisedValue)} />
                  </TableCell>
                </tr>
                <tr>
                  <TableCell>
                    <span className="font-semibold">Undeveloped Portion</span>
                  </TableCell>
                  <TableCell className="text-end">
                    <FormTextField {...getNameProp('undevelopedPortion')} defaultValue={undevelopedPortion} type="number" step={0.01} isCamo />
                  </TableCell>
                  <TableCell className="text-end">
                    <span className="font-semibold">Land Rate For Undeveloped Portion</span>
                  </TableCell>
                  <TableCell className="text-end">
                    <FormTextField {...getNameProp('rateForUndevelopedPortion')} defaultValue={rateForUndevelopedPortion} type="number" step={0.01} isCamo />
                  </TableCell>
                  <TableCell className="text-end">
                    <ClientVMarket className="gap-2 font-semibold" client={formatAmount(valueOfUndeveloped)} market={formatAmount(valueOfUndeveloped)} />
                  </TableCell>
                </tr>
                <tr>
                  <TableCell>Market Value</TableCell>
                  <TableCell colSpan={4} className="text-end">
                    <ClientVMarket client={formatAmount(marketValue)} market={formatAmount(marketValue)} />
                  </TableCell>
                </tr>
                <tr>
                  <TableCell>
                    <span className="font-semibold">Forced Sale Value</span>
                  </TableCell>
                  <TableCell colSpan={3} className="text-end">
                    <div className="flex flex-row items-center gap-1">
                      <CustomStoredValue name="fsvAdjustment" defaultValue={storedValues.fsvAdjustment} isCamo type="number" step={0.01} className="text-end" />
                      <span className="font-light text-lg">%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-end">
                    <ClientVMarket className="gap-2 font-semibold" client={formatAmount(fsv)} market={formatAmount(fsv)} />
                  </TableCell>
                </tr>
              </tbody>
            </table>
          </div>
          <SavePanel>
            <div className="flex flex-col items-start">
              <PrimaryButton type="submit" disabled={isProcessing || cantEdit}>
                Save Changes
              </PrimaryButton>
            </div>
            <div className="flex flex-col items-end">
              <AiPlotChat plotId={plot.id} />
            </div>
          </SavePanel>
        </ActionContextProvider>
      </fetcher.Form>
    </>
  );
}
export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
