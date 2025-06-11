import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { FormEvent } from 'react';
import type { RowOutgoing, RowParking, StateTupleSchema, StoredValues } from '~/models/core.validations';

import { json } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { CustomStoredValue } from '~/components/CustomStoredValue';
import { PrimaryButton } from '~/components/PrimaryButton';
import SavePanel from '~/components/SavePanel';
import { TableCell } from '~/components/TableCell';
import { TableHeading } from '~/components/TableHeading';
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
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { fieldErrorsToArr, getRawFormFields, hasFieldErrors } from '~/models/forms';
import {
  getAnnualOutgoingsPerBoth,
  getCapitalisedValue,
  getGrossRental,
  getMonthlyOutgoings,
  getNetAnnualRentalIncome,
  getTotalAreaPerBoth,
  getTotalParking,
  getTotalRentalPerBoth,
} from '~/models/plots.validations';
import { StoredValueId } from '~/models/storedValuest';
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
        },
      })
      .then((plot) => {
        if (!plot) {
          return undefined;
        }
        return {
          ...plot,
          tenants: plot.tenants.map((tenant) => ({
            ...tenant,
            startDate: dayjs(tenant.startDate).format('YYYY-MM-DD'),
            endDate: dayjs(tenant.endDate).format('YYYY-MM-DD'),
            remMonths: dayjs(tenant.endDate).diff(dayjs(), 'month'),
            grossMonthlyRental: Number(tenant.grossMonthlyRental),
            escalation: Number(tenant.escalation),
            areaPerClient: Number(tenant.areaPerClient),
            areaPerMarket: Number(tenant.areaPerMarket),
            ratePerMarket: Number(tenant.ratePerMarket),
          })),
          parkingRecords: plot.parkingRecords.map((record) => ({
            ...record,
            ratePerClient: Number(record.ratePerClient),
            ratePerMarket: Number(record.ratePerMarket),
          })),
          outgoingRecords: plot.outgoingRecords
            .sort((a, b) => {
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
        };
      }),
  ]);
  if (!plot) {
    throw new Response('Plot record not found', {
      status: StatusCode.NotFound,
    });
  }
  console.log(
    '>DCF total unit per client',
    plot.outgoingRecords.reduce((acc, record) => acc + record.unitPerClient, 0),
  );
  console.log(
    '>DCF total rate per client',
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
  const mgmtValue = totalRental - (vacancyPercentage?.value || 0) * 0.01;
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

  console.log('DCF grossRental.annual', grossRental.annual);
  console.log('DCF outgoings.annual', outgoings.annual);
  console.log('DCF vacancyPercentage?.value || 0', vacancyPercentage?.value || 0);
  console.log('DCF recoveryFigure?.value || 0', recoveryFigure?.value || 0);
  console.log('DCF totalArea.client', totalArea.client);
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

  return json({
    cantEdit,
    storedValues: {
      vacancyPercentage,
      recoveryFigure,
      capitalisationRate,
      capitalisedFigure,
      netAnnualEscalation,
      discountRate,
      lastCapitalisedPerc,
    },
    netAnnualRentalIncome,
    plot: updatedPlot,
    parkingTypes,
  });
}

const Schema = z.object({
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
    const { storedValues } = result.data;

    await prisma.$transaction(async (tx) => {
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

export default function PlotDCFPage() {
  const { storedValues: initialStoredValues, plot, cantEdit, netAnnualRentalIncome } = useLoaderData<typeof loader>();

  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const formRef = useRef<HTMLFormElement>(null);

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

  // const totalRental = getTotalRentalPerBoth(
  //   plot.tenants.map((tenant) => ({
  //     ...tenant,
  //     grossMonthlyRental: tenant.areaPerClient * tenant.ratePerMarket,
  //   })),
  // );
  // const totalParking = getTotalParking(
  //   parkings.map((record) => record.unitPerClient * record.ratePerClient),
  // );
  // const grossRental = getGrossRental(totalRental, totalParking);

  const [outgoings, setOutgoings] = useState<(RowOutgoing & { index: number; err?: string })[]>(
    plot.outgoingRecords.map((record, index) => ({
      ...record,
      index,
    })) || [],
  );

  const totalArea = getTotalAreaPerBoth(plot.tenants);
  // const { annual: annualOutgoings } = (() => {
  //   const annual = getAnnualOutgoingsPerBoth(outgoings);
  //   return {
  //     annual,
  //     // monthly: getMonthlyOutgoings(annual, totalArea.client),
  //   };
  // })();

  const [storedValues, setStoredValues] = useState<StoredValues>({
    vacancyPercentage: initialStoredValues.vacancyPercentage?.value || 0,
    recoveryFigure: initialStoredValues.recoveryFigure?.value || 0,
    capitalisationRate: initialStoredValues.capitalisationRate?.value || 0,
    netAnnualEscalation: initialStoredValues.netAnnualEscalation?.value || 0,
    discountRate: initialStoredValues.discountRate?.value || 0,
    lastCapitalisedPerc: initialStoredValues.lastCapitalisedPerc?.value || 0,
    fsvAdjustment: 0,
  });

  // console.log('DCF grossRental.annual', grossRental.annual);
  // console.log('DCF annualOutgoings', annualOutgoings);
  // console.log(
  //   'DCF storedValues.vacancyPercentage',
  //   storedValues.vacancyPercentage,
  // );
  // console.log('DCF storedValues.recoveryFigure', storedValues.recoveryFigure);
  // console.log('DCF totalArea.client', totalArea.client);
  // const netAnnualRentalIncome = (() => {
  //   return getNetAnnualRentalIncome(
  //     grossRental.annual,
  //     annualOutgoings,
  //     storedValues.vacancyPercentage,
  //     storedValues.recoveryFigure,
  //     totalArea.client,
  //   );
  // })();

  interface YearInfo {
    netAnnualIncome: number;
    PV: number;
  }
  const [yearInfo, year10Capitalised] = (() => {
    let year10Capitalised = 0;
    const yearInfo = [...Array(10).keys()].reduce((acc, index) => {
      const year = index + 1;
      const netAnnualIncome = (() => {
        if (year === 1) {
          return netAnnualRentalIncome;
        }
        const prevYear = acc[index - 1];
        const result = prevYear.netAnnualIncome * (1 + storedValues.netAnnualEscalation / 100);
        return result;
      })();
      year10Capitalised = index === 9 ? (storedValues.lastCapitalisedPerc ? netAnnualIncome / (storedValues.lastCapitalisedPerc / 100) : 0) : 0;
      const PV = (index === 9 ? year10Capitalised : netAnnualIncome) * (1 / (1 + storedValues.discountRate / 100)) ** (year === 10 ? 9 : year);
      return [...acc, { netAnnualIncome, PV }];
    }, [] as YearInfo[]);
    return [yearInfo, year10Capitalised];
  })();

  const MV = (() => {
    const result = yearInfo.reduce((acc, year) => acc + year.PV, 0);
    return Number(result.toFixed(2));
  })();

  interface SingleTenant {
    area: number;
    rate: number;
    gla: number;
    grossRental: number;
  }

  let singleTenant: SingleTenant = {
    area: 0,
    rate: 0,
    gla: 0,
    grossRental: 0,
  };

  let assetTypes: [string, number, number, number, number][] = [];

  let effArea = 0;
  for (let i = 0; i < plot.tenants.length; i++) {
    const tenant = plot.tenants[i];
    const tenantGLA = totalArea.client ? tenant.areaPerClient / totalArea.client : 0;
    effArea = effArea + tenant.areaPerClient;
    singleTenant.area += tenant.areaPerClient;
    singleTenant.gla += tenantGLA;
    singleTenant.grossRental += tenant.grossMonthlyRental;

    const match = assetTypes.find((a) => a[0] === tenant.propertyType.identifier);
    if (match) {
      const newArea = match[1] + tenant.areaPerClient;
      const newGross = match[2] + tenant.grossMonthlyRental;
      const rate = tenant.areaPerClient ? tenant.grossMonthlyRental / tenant.areaPerClient : 0;
      // const newRate = match[3] + (newArea ? newGross / newArea : 0);
      const newNum = match[4] + 1;
      const newRate = (match[3] + rate) / newNum;
      assetTypes[assetTypes.indexOf(match)] = [match[0], newArea, newGross, newRate, newNum];
    } else {
      const newNum = 1;
      const rate = tenant.areaPerClient ? tenant.grossMonthlyRental / tenant.areaPerClient : 0;
      assetTypes.push([tenant.propertyType.identifier, tenant.areaPerClient, tenant.grossMonthlyRental, rate, newNum]);
    }
  }
  for (let assetType of assetTypes) {
    const area = assetType[1];
    const gross = assetType[2];
    const rate = area ? gross / area : 0;
    assetTypes[assetTypes.indexOf(assetType)] = [assetType[0], area, gross, rate, 1];
  }

  singleTenant.rate = effArea ? singleTenant.grossRental / effArea : 0;

  useEffect(() => {
    if (hasFieldErrors(fetcher.data)) {
      const fieldErrors = fetcher.data.fieldErrors;
      for (let err in fieldErrors) {
        toast.error(fieldErrors[err]?.toString() || 'Something went wrong saving changes, please try again');
      }
    }
  }, [fetcher.data]);

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

  return (
    <fetcher.Form ref={formRef} method="post" onSubmit={handleSubmit} className="flex flex-col items-stretch gap-8 text-xs">
      <ActionContextProvider {...fetcher.data} updateState={updateState} isSubmitting={isProcessing} disabled={cantEdit}>
        <input type="hidden" {...getNameProp('storedValues')} value={JSON.stringify(storedValues)} />
        <div className="flex flex-col items-stretch gap-2">
          <div className="flex flex-row items-end gap-6">
            <h3 className="text-lg font-semibold">Discounted Cash Flow</h3>
            {/* <div className="grow" /> */}
            <div className="flex flex-row items-center gap-6 grow">
              <div className="flex flex-row items-center gap-1">
                <span>Net Annual Escalation</span>
                <div className="flex flex-row items-center gap-2">
                  <CustomStoredValue name="netAnnualEscalation" defaultValue={storedValues.netAnnualEscalation} isCamo type="number" step={0.01} className="text-end" />
                  <span className="font-light">%</span>
                </div>
              </div>
              <div className="flex flex-row items-center gap-1">
                <span>Discount Rate</span>
                <div className="flex flex-row items-center gap-2">
                  <CustomStoredValue name="discountRate" defaultValue={storedValues.discountRate} isCamo type="number" step={0.01} className="text-end" />
                  <span className="font-light">%</span>
                </div>
              </div>
            </div>
            <div className="flex flex-row items-center gap-1">
              <span>Yr 10 capitalised in perpetuity @</span>
              <div className="flex flex-row items-center gap-2">
                <CustomStoredValue name="lastCapitalisedPerc" defaultValue={storedValues.lastCapitalisedPerc} isCamo type="number" step={0.01} className="text-end" />
                <span className="font-light">%</span>
              </div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <TableHeading>Net Annual Escalation</TableHeading>
                <TableHeading className="text-xs text-end">Year 1</TableHeading>
                <TableHeading className="text-xs text-end">Year 2</TableHeading>
                <TableHeading className="text-xs text-end">Year 3</TableHeading>
                <TableHeading className="text-xs text-end">Year 4</TableHeading>
                <TableHeading className="text-xs text-end">Year 5</TableHeading>
                <TableHeading className="text-xs text-end">Year 6</TableHeading>
                <TableHeading className="text-xs text-end">Year 7</TableHeading>
                <TableHeading className="text-xs text-end">Year 8</TableHeading>
                <TableHeading className="text-xs text-end">Year 9</TableHeading>
                <TableHeading className="text-xs text-end">Year 10</TableHeading>
              </tr>
            </thead>
            <tbody>
              <tr>
                <TableCell className="text-xs">Net Annual Income</TableCell>
                {yearInfo.map((year, index) => (
                  <TableCell className="text-end text-xs" key={index}>
                    {formatAmount(year.netAnnualIncome, 2)}
                  </TableCell>
                ))}
              </tr>
              <tr>
                <TableCell className="whitespace-nowrap text-xs">Yr 10 capitalised in perpetuity @</TableCell>
                {yearInfo.map((_, index) => (
                  <TableCell className="text-end text-xs" key={index}>
                    {index === 9 ? formatAmount(year10Capitalised) : ''}
                  </TableCell>
                ))}
              </tr>
              <tr>
                <TableCell className="text-xs">PV</TableCell>
                {/* <TableCell></TableCell> */}
                {yearInfo.map((year, index) => (
                  <TableCell className="text-end text-xs" key={index}>
                    {formatAmount(year.PV, 2)}
                  </TableCell>
                ))}
              </tr>
              <tr>
                <TableCell className="text-xs">MV</TableCell>
                <TableCell colSpan={9} />
                <TableCell className="text-end text-xs">
                  <span className="font-semibold text-end">{formatAmount(MV, 2)}</span>
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
  );
}
export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
