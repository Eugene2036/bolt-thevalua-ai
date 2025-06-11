import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { Response, json } from '@remix-run/node';
import { Form, useFetcher, useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import { PrimaryButton } from '~/components/PrimaryButton';
import { SecondaryButton } from '~/components/SecondaryButton';
import { TextField } from '~/components/TextField';
import { Select } from '~/components/Select';
import { prisma } from '~/db.server';
import { badRequest, bardRound, formatAmount, getGrcAndFees, getGrcLessDepr, getGrcTotal, getMarketValue, getQueryParams, getSubjectBuildValue, getSubjectLandValue, processBadRequest, roundDown, StatusCode } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import { getAnnualOutgoingsPerBoth, getCapitalisedValue, getGrossRental, getMonthlyOutgoings, getNetAnnualRentalIncome, getOutgoingsIncomeRatio, getTotalAreaPerBoth, getTotalParkingPerBoth, getTotalRentalPerBoth, getValuer, roundToDecimal, ValuationType } from '~/models/plots.validations';
import dayjs from 'dayjs';
import { StoredValueId } from '~/models/storedValuest';
import { Decimal } from '@prisma/client/runtime/library';
import { CustomTableHeading } from './dashboard';
import { TableCell } from '~/components/TableCell';
import { Pagination } from '~/components/Pagination';
import { PAGE_SIZES, usePagination } from '~/hooks/usePagination';
import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields, hasFieldErrors } from '~/models/forms';
import { requireUserId } from '~/session.server';
import { useState } from 'react';
import { EventAction, EventDomain } from '~/models/events';
import { FormTextField } from '~/components/FormTextField';
import { FormTextArea } from '~/components/FormTextArea';
import { FormPhoneNumberTextField } from '~/components/FormPhoneNumberTextField';

const Schema = z.object({
  searchTerm: z
    .string()
    .transform((arg) => {
      if (arg) {
        const result = z.coerce.number().safeParse(arg);
        if (result.success) {
          const res = Number(arg).toString();
          console.log(res);
          return res;
        }
        return arg;
      }
    })
    .optional(),
  valuationType: z.string().optional(),
  address: z.string().optional(),
  propertyLocation: z.string().optional(),
});

interface StoredValue {
  identifier: string;
  value: Decimal;
}

function getStoredValue(storedValues: StoredValue[], identifier: StoredValueId) {
  if (!storedValues) {
    return undefined;
  }
  const match = storedValues.find((el) => el.identifier === identifier);
  if (!match) {
    return undefined;
  }
  return { ...match, value: Number(match.value) };
}

function getStoredValues(storedValues: StoredValue[], ids: StoredValueId[]) {
  return ids.map((id) => getStoredValue(storedValues, id));
}

export async function loader({ request }: LoaderArgs) {
  const queryParams = getQueryParams(request.url, ['valuationType', 'searchTerm', 'address', 'propertyLocation']);

  const result = Schema.safeParse(queryParams);
  if (!result.success) {
    throw new Response('Invalid input provided, please reload the page', {
      status: StatusCode.BadRequest,
    });
  }
  const { searchTerm, valuationType, address } = result.data;

  const numPlots = await prisma.plot.count({
    where: {
      valuationType,
      council: true,
      address: address || undefined,
      plotNumber: searchTerm ? { contains: searchTerm } : undefined,
    },
  });

  const plots = await prisma.plot.findMany({
    where: {
      valuationType,
      council: true,
      address: address || undefined,
      plotNumber: searchTerm ? { contains: searchTerm } : undefined,
      propertyLocation: queryParams.propertyLocation || undefined,
    },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      plotDesc: true,
      undevelopedPortion: true,
      rateForUndevelopedPortion: true,
      address: true,
      propertyLocation: true,
      valuationType: true,
      reviewedById: true,
      reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      analysisDate: true,
      plotNumber: true,
      plotExtent: true,
      valuedById: true,
      valuedBy: { select: { firstName: true, lastName: true, email: true } },
      valuers: {
        select: { firstName: true, lastName: true, email: true },
      },
      storedValues: { select: { id: true, identifier: true, value: true } },
      tenants: {
        select: {
          name: true,
          termOfLease: true,
          startDate: true,
          endDate: true,
          grossMonthlyRental: true,
          escalation: true,
          areaPerClient: true,
          areaPerMarket: true,
          ratePerMarket: true,
          grossRatePerValuer: true,
          propertyType: { select: { identifier: true } },
        }
      },
      parkingRecords: {
        select: {
          id: true,
          parkingTypeId: true,
          parkingType: { select: { identifier: true } },
          unitPerClient: true,
          ratePerClient: true,
          unitPerMarket: true,
          ratePerMarket: true
        }
      },
      grcRecords: { select: { id: true, identifier: true, unit: true, size: true, rate: true, bull: true } },
      grcFeeRecords: { select: { id: true, identifier: true, perc: true } },
      grcDeprRecords: { select: { id: true, identifier: true, perc: true } },
      mvRecords: { select: { id: true, identifier: true, size: true, date: true, location: true, price: true } },
      outgoingRecords: {
        select: {
          id: true,
          identifier: true,
          itemType: true,
          unitPerClient: true,
          unitPerMarket: true,
          ratePerClient: true,
          ratePerMarket: true
        }
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
  }).then((plots) => {
    if (!plots) {
      return undefined;
    }
    return plots.map((rawPlot) => {
      const plot = {
        ...rawPlot,
        valuer: getValuer(rawPlot.valuedBy),
        reviewer: rawPlot.reviewedBy ? `${rawPlot.reviewedBy?.firstName} ${rawPlot.reviewedBy?.lastName}` : undefined,
        undevelopedPortion: Number(rawPlot.undevelopedPortion),
        rateForUndevelopedPortion: Number(rawPlot.rateForUndevelopedPortion),
        plotExtent: Number(rawPlot.plotExtent),
        gba: rawPlot.grcRecords.filter((el) => el.bull).reduce((acc, record) => acc + Number(record.size), 0),
        grcDeprRecords: rawPlot.grcDeprRecords.length ? rawPlot.grcDeprRecords : [{ id: '', identifier: '', perc: 0 }],
        tenants: rawPlot.tenants.map((tenant) => ({
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
        grcRecords: rawPlot.grcRecords.map((record) => ({
          ...record,
          rate: Number(record.rate),
          size: Number(record.size),
        })),
        grcFeeRecords: rawPlot.grcFeeRecords.map((record) => ({
          ...record,
          perc: Number(record.perc),
        })),
        mvRecords: rawPlot.mvRecords.map((record) => ({
          ...record,
          size: Number(record.size),
          price: Number(record.price),
        })),
        parkingRecords: rawPlot.parkingRecords.map((record) => ({
          ...record,
          ratePerClient: Number(record.ratePerClient),
          ratePerMarket: Number(record.ratePerMarket),
        })),
        outgoingRecords: rawPlot.outgoingRecords
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

      const storedValues = getStoredValues(plot.storedValues, [
        StoredValueId.LandRate,
        StoredValueId.BuildRate,
        StoredValueId.Perculiar,
        StoredValueId.VacancyPercentage,
        StoredValueId.RecoveryFigure,
        StoredValueId.CapitalisationRate,
        StoredValueId.FsvAdjustment,
        StoredValueId.ProfFees,
        StoredValueId.InsuranceVat,
        StoredValueId.PreTenderEscalationAt,
        StoredValueId.PreTenderEscalationPerc,
        StoredValueId.PostTenderEscalationAt,
        StoredValueId.PostTenderEscalationPerc
      ]);

      const [landRate, buildRate, perculiar, vacancyPercentage, recoveryFigure, capitalisationRate,
        fsvAdjustment, profFee, insuranceVat, preTenderEscalationAt, preTenderEscalationPerc, postTenderEscalationAt, postTenderEscalationPerc] = storedValues;

      const subjectLandValue = getSubjectLandValue(plot.plotExtent, landRate?.value);
      const subjectBuildValue = getSubjectBuildValue(plot.grcRecords, buildRate?.value);

      // const subjectLandValue = (landRate?.value || 0) * plot.plotExtent;
      // const subjectBuildValue = plot.grcRecords.filter((el) => el.bull).reduce((acc, record) => acc + record.size, 0) * (buildRate?.value || 0);
      // const subjectBuildValue = plot.grcRecords.filter((el) => el.bull).reduce((acc, plot) => acc + plot.size, 0) * (buildRate?.value || 0);
      const projectedValue = subjectLandValue + subjectBuildValue;

      const marketValue = getMarketValue(projectedValue, perculiar?.value);
      // const marketValue = projectedValue + projectedValue * (perculiar?.value || 0);
      const sayMarket = roundDown(marketValue, -5);

      const forcedSaleValue = marketValue * 0.9;
      const sayForced = bardRound(forcedSaleValue, -5);

      const grcTotal = getGrcTotal(plot.grcRecords);
      const netTotal = getGrcAndFees(grcTotal, plot.grcFeeRecords);
      const deprTotal = getGrcLessDepr(grcTotal, netTotal, plot.grcDeprRecords);

      const totalArea = getTotalAreaPerBoth(plot.tenants).client;

      const GLA = plot.tenants.reduce((acc, tenant) => acc + tenant.areaPerClient, 0);

      const totalRental = getTotalRentalPerBoth(
        plot.tenants.map((tenant) => ({
          ...tenant,
          grossMonthlyRental: tenant.areaPerClient * tenant.ratePerMarket,
        })),
      );



      const totalParking = getTotalParkingPerBoth(plot.parkingRecords);

      const grossRental = getGrossRental(totalRental, totalParking);

      const outgoings = (() => {
        const annual = getAnnualOutgoingsPerBoth(plot.outgoingRecords);
        return {
          annual,
          monthly: getMonthlyOutgoings(annual, totalArea),
        };
      })();

      const outgoingsRentalRatio = getOutgoingsIncomeRatio(outgoings.annual, grossRental.annual);

      const netAnnualRentalIncome = getNetAnnualRentalIncome(grossRental.annual, outgoings.annual, vacancyPercentage?.value || 0, recoveryFigure?.value || 0, totalArea);

      const valueOfUndeveloped = roundToDecimal((plot.undevelopedPortion || 0) * (plot.rateForUndevelopedPortion || 0), 2);

      const capitalisedValue = getCapitalisedValue(netAnnualRentalIncome, capitalisationRate?.value || 0);

      const capitalisedFigure = totalArea ? Number((capitalisedValue / totalArea).toFixed(2)) : 0;

      const marketValueComm = roundToDecimal(capitalisedValue + valueOfUndeveloped, 2);

      const fsv = marketValueComm - (fsvAdjustment?.value || 0) * 0.01 * marketValueComm;

      const subTotal = plot.insuranceRecords.reduce((acc, record) => {
        const result = acc + record.rate * (record.area || 0);
        // const result = acc + record.rate * totalArea;
        return Number(result.toFixed(2));
      }, 0);

      const vat = (() => {
        const result = subTotal * ((insuranceVat?.value || 0) / 100);
        return Number(result.toFixed(2));
      })();

      const comProperty = (() => {
        // const result = 0.2 * subTotal;
        // return Number(result.toFixed(2));
        return 0;
      })();
      // }, [subTotal]);

      const profFees = (() => {
        const result = (profFee?.value || 0) * 0.01 * (subTotal + vat + comProperty);
        // const result = 0.15 * (subTotal + vat + comProperty);
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

      const totalReplacementValue = (() => {
        const result = replacementCost + preTenderEscl + postTenderEscl;
        return roundToDecimal(result, 2);
      })();

      const capitalValue = (() => {
        if (rawPlot.valuationType === ValuationType.Commercial) {
          return getCapitalisedValue(netAnnualRentalIncome, capitalisationRate?.value || 0);
        }
        return subjectLandValue + deprTotal;
      })();

      const improvementsValue = deprTotal;

      return {
        ...plot,
        marketValue: sayMarket,
        forcedSaleValue: sayForced,
        landValue: subjectLandValue,
        landRate,
        gla: GLA,
        capitalValue,
        netAnnualRentalIncome,
        fsv,
        vacancyPercentage,
        capitalisationRate,
        outgoingsRentalRatio,
        outgoings,
        marketValueComm: marketValueComm,
        valuationDate: plot.analysisDate,
        developmentsValue: improvementsValue,
        numStructures: plot.grcRecords.length,
        plotSize: plot.plotExtent,
        gba: plot.grcRecords.filter((el) => el.bull).reduce((acc, record) => acc + Number(record.size), 0),
      };
    });
  });

  if (!plots) {
    throw new Response('Plot record not found', {
      status: StatusCode.NotFound,
    });
  }

  const locations = await prisma.plot.findMany({
    distinct: ['propertyLocation'],
    orderBy: { propertyLocation: 'asc' },
    select: { propertyLocation: true },
  });

  return json({
    queryParams,
    plots: searchTerm && locations ? plots : [],
    searchTerm,
    valuationType,
    numPlots,
    locations: locations.map((a) => a.propertyLocation).filter(Boolean), // Filter out null/undefined locations
  });
}

const SchemaEnquiry = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().min(1),
  phone: z.string().min(1),
  messageBody: z.string().min(1),
  formAction: z.string().optional(), // Add formAction to the schema
  plotId: z.string().min(1),
});

export async function action({ request }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  console.log('currentUserId', currentUserId);

  const user = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    }
  });

  const userExists = await prisma.user.findUnique({
    where: { id: user?.id },
  });

  if (!userExists) {
    throw new Error("User does not exist.");
  }

  try {
    const fields = await getRawFormFields(request);
    const result = SchemaEnquiry.safeParse(fields);
    if (!result.success) {
      console.log('Error parsing form data', result.error);
      return processBadRequest(result.error, fields);
    }

    const formAction = result.data.formAction;

    if (formAction === 'sendEnquiry') {

      await prisma.propertyOwnerEnquiries.create({
        data: {
          plotId: result.data.plotId,
          firstName: user?.firstName ?? 'unknown',
          lastName: user?.lastName ?? 'unknown',
          email: user?.email ?? 'unknown@example.com',
          phone: user?.phone ?? 'unknown',
          message: result.data.messageBody,
          userId: currentUserId,
        }
      });

      await prisma.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.PropertyOwnerEnquiries,
          action: EventAction.Create,
          recordId: result.data.plotId,
          recordData: JSON.stringify({ from: {}, to: { ...result.data } }),
        }
      });

    }

    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}

export default function PlotIndexPage() {
  const { plots, searchTerm, valuationType, numPlots, locations, queryParams } = useLoaderData<typeof loader>();

  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, SchemaEnquiry);

  const [sendEnquiryPopup, setSendEnquiryPopup] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [currentPlotId, setCurrentPlotId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

  const handleClosePopup = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setSendEnquiryPopup(false);
      setIsFadingOut(false);
    }, 300); // Match the duration of the fade-out animation
  };

  const {
    pageSize: plotsPageSize,
    handlePageSizeChange: handlePlotsPageSizeChange,
    currentPage: plotsCurrentPage,
    numPages: plotsNumPages,
    paginatedRecords: paginatedPlots,
    toFirstPage: toPlotsFirstPage,
    toLastPage: toPlotsLastPage,
    toNextPage: toPlotsNextPage,
    toPreviousPage: toPlotsPreviousPage,
  } = usePagination(plots);

  function calculateAgeing(dateReceived: string): string {
    const receivedDate = dayjs(dateReceived);
    const currentDate = dayjs();
    const diffInDays = currentDate.diff(receivedDate, 'day');

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return '1 day';
    if (diffInDays < 7) return `${diffInDays} days`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} week${diffInDays >= 14 ? 's' : ''}`;
    return `${Math.floor(diffInDays / 30)} month${diffInDays >= 60 ? 's' : ''}`;
  }

  return (
    <div className="flex flex-col items-center grow">
      <div className="flex flex-col items-stretch gap-6 w-[100%] grow">
        <div className="flex flex-col justify-center items-center">
          <span className="text-2xl font-bold">PROPERTY REGISTER FOR THE CITY OF GABORONE</span>
          <span className="text-xl font-light mt-3">
            Search For {valuationType ? `${valuationType} ` : ''}Plots ({numPlots} plots total)
          </span>
        </div>
        <div className="flex flex-col justify-center items-center">
          <Form method="get" className="flex flex-row justify-center items-center gap-2 w-[60%]" >
            <div className="flex flex-col items-stretch grow gap-2">
              <div className="flex flex-row gap-4">
                <div className="flex-1">
                  <TextField name="searchTerm" defaultValue={searchTerm} label="Search By Plot #" />
                </div>
                <div className="flex-1">
                  <Select name="address" label="Filter By Location" defaultValue={queryParams.propertyLocation || ''}>
                    <option value={''}>All Locations</option>
                    {locations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <PrimaryButton type="submit">Search</PrimaryButton>
            </div>
          </Form>
        </div>
        {!!plots.length && (
          <div>
            <table className="min-w-full items-stretch bg-white overflow-hidden shadow-md border border-stone-200 mt-6" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <CustomTableHeading className="py-2 px-4 text-left align-top">Property Reference</CustomTableHeading>
                  <CustomTableHeading className="py-2 px-4 text-left align-top">Registered or other Description of the Property</CustomTableHeading>
                  <CustomTableHeading className="py-2 px-4 text-left align-top">Rating Category of the Property</CustomTableHeading>
                  <CustomTableHeading className="py-2 px-4 text-left align-top">Physical address of the Property</CustomTableHeading>
                  <CustomTableHeading className="py-2 px-4 text-left align-top">Extent of the Property (m<sup>2</sup>)</CustomTableHeading>
                  <CustomTableHeading className="py-2 px-4 text-left align-top">Market Value</CustomTableHeading>
                  <CustomTableHeading className="py-2 px-4 text-left align-top">Valuation Reason</CustomTableHeading>
                  <CustomTableHeading className="py-2 px-4 text-left align-top">Effective Date</CustomTableHeading>
                  <CustomTableHeading className="py-2 px-4 text-left align-top">Dispute Expiry Date</CustomTableHeading>
                  <CustomTableHeading className="py-2 px-7 text-right align-top">Action</CustomTableHeading>
                </tr>
              </thead>
              <tbody className="font-thin">
                {paginatedPlots.map((plot) => {
                  const to = AppLinks.Plot(plot.id);
                  const timestamp = dayjs(plot.updatedAt).format('DD/MM/YYYY');

                  const totalArea = getTotalAreaPerBoth(plot.tenants).client;

                  const GLA = plot.tenants.reduce((acc, tenant) => acc + tenant.areaPerClient, 0);

                  const totalRental = getTotalRentalPerBoth(
                    plot.tenants.map((tenant) => ({
                      ...tenant,
                      grossMonthlyRental: tenant.areaPerClient * tenant.ratePerMarket,
                    })),
                  );

                  const totalParking = getTotalParkingPerBoth(plot.parkingRecords);

                  const grossRental = getGrossRental(totalRental, totalParking);

                  const outgoings = (() => {
                    const annual = getAnnualOutgoingsPerBoth(plot.outgoingRecords);
                    return {
                      annual,
                      monthly: getMonthlyOutgoings(annual, totalArea),
                    };
                  })();

                  const netAnnualRentalIncome = getNetAnnualRentalIncome(grossRental.annual, outgoings.annual, 0, 0, totalArea);

                  const valueOfUndeveloped = roundToDecimal((plot.undevelopedPortion || 0) * (plot.rateForUndevelopedPortion || 0), 2);

                  const capitalisedValue = getCapitalisedValue(netAnnualRentalIncome, 0);

                  const marketValue = roundToDecimal(capitalisedValue + valueOfUndeveloped, 2);

                  const fsv = marketValue;

                  const totalReplacementValue = roundToDecimal(0, 2);

                  return (
                    <tr key={plot.id} className="hover:bg-gray-100 transition duration-200 ease-in-out">
                      <TableCell className="py-1 px-2 border-b border-gray-200 text-left">{plot.id.toUpperCase()}</TableCell>
                      <TableCell className="py-2 px-4 border-b border-gray-200 text-left">{plot.plotDesc}</TableCell>
                      <TableCell className="py-1 px-2 border-b border-gray-200 text-left">{plot.valuationType}</TableCell>
                      <TableCell className="py-1 px-2 border-b border-gray-200 text-left">{plot.plotNumber + ' ' + plot.propertyLocation + ' ' + plot.address}</TableCell>
                      <TableCell className="py-1 px-2 border-b border-gray-200 text-left">{plot.plotExtent}</TableCell>
                      <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{plot.capitalValue ? formatAmount(plot.capitalValue) : '0.00'}</TableCell>
                      <TableCell className="py-1 px-2 border-b border-gray-200 text-left">SECTION 78(1)(g) (RC)</TableCell>
                      <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{dayjs(plot.analysisDate).format('DD-MM-YYYY')}</TableCell>
                      <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{dayjs(plot.valuationDate).format('DD-MM-YYYY')}</TableCell>
                      <TableCell className="py-1 px-2 border-b border-gray-200 text-right">
                        <SecondaryButton
                          type="button"
                          onClick={() => {
                            setCurrentPlotId(plot.id);
                            setSendEnquiryPopup(true);
                          }}
                        >
                          Appeal?
                        </SecondaryButton>
                      </TableCell>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex flex-row items-center gap-2 p-2">
              <div className="grow" />
              <Pagination
                pageSizes={PAGE_SIZES}
                pageSize={plotsPageSize}
                handlePageSizeChange={handlePlotsPageSizeChange}
                currentPage={plotsCurrentPage}
                numPages={plotsNumPages}
                toFirstPage={toPlotsFirstPage}
                toLastPage={toPlotsLastPage}
                toNextPage={toPlotsNextPage}
                toPreviousPage={toPlotsPreviousPage}
              />
            </div>
          </div>



        )}
        {!plots.length && !!searchTerm && (
          <div className="flex flex-col justify-center items-center">
            <span className="text-slate-400 text-base font-light">No matches found</span>
          </div>
        )}

        {
          sendEnquiryPopup && (
            <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${isFadingOut ? 'fade-out' : 'fade-in'}`}>
              <div className="bg-white p-6 rounded-lg w-[40%]">
                <fetcher.Form method="post" className="flex flex-col items-stretch w-[100%] gap-2">
                  <ActionContextProvider {...fetcher.data} fields={fetcher.data?.fields} isSubmitting={isProcessing}>
                    <h2 className="text-lg font-bold mb-4">Send Enquiry or Query</h2>
                    <FormTextField {...getNameProp('firstName')} label="First Name" errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['firstName'] : undefined} />
                    <FormTextField {...getNameProp('lastName')} label="Last Name" errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['lastName'] : undefined} />
                    <FormTextField {...getNameProp('email')} label="Email" type="email" errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['email'] : undefined} />
                    <FormPhoneNumberTextField
                      {...getNameProp('phone')}
                      label="Phone"
                      onChange={(phone) => setPhone(phone)}
                      defaultCountry="BW"
                      required value={phone ?? ''} />
                    <FormTextArea
                      {...getNameProp('messageBody')}
                      placeholder="Enter your message"
                      required
                      rows={4}
                    />
                    <input type="hidden" {...getNameProp('plotId')} value={currentPlotId || ''} />
                    <input type="hidden" {...getNameProp('phone')} value={phone ?? ''} />
                    <input type="hidden" {...getNameProp('formAction')} value="sendEnquiry" />
                    <div className="flex justify-end gap-4 mt-4">
                      <SecondaryButton onClick={handleClosePopup}>Cancel</SecondaryButton>
                      <PrimaryButton type='submit' disabled={isProcessing}>Submit</PrimaryButton>
                    </div>
                  </ActionContextProvider>
                </fetcher.Form>
              </div>
            </div>
          )
        }

        <div className="grow" />
      </div>
    </div>
  );
}

