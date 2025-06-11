import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { z } from 'zod';

import { useForm } from '~/components/ActionContextProvider';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { SummaryChip } from '~/components/SummaryChip';
import { prisma } from '~/db.server';
import { StatusCode, badRequest, formatAmount, getQueryParams, getValidatedId, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import {
  getAnnualOutgoingsPerBoth,
  getCapitalisedValue,
  getGrossRental,
  getMonthlyOutgoings,
  getNetAnnualRentalIncome,
  getOutgoingsIncomeRatio,
  getTotalAreaPerBoth,
  getTotalParkingPerBoth,
  getTotalRentalPerBoth,
  getValuer,
  roundToDecimal,
} from '~/models/plots.validations';
import { StoredValueId } from '~/models/storedValuest';
import { requireUser, requireUserId } from '~/session.server';

export async function loader({ request, params }: LoaderArgs) {
  const currentUser = await requireUser(request);

  const plotId = getValidatedId(params.plotId);
  const queryParams = getQueryParams(request.url, ['redirectTo']);
  const redirectTo = queryParams.redirectTo || '';

  const plot = await prisma.plot
    .findUnique({
      where: { id: plotId },
      select: {
        id: true,
        propertyId: true,
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedById: true,
        plotNumber: true,
        inspectionDate: true,
        analysisDate: true,
        plotDesc: true,
        plotExtent: true,
        address: true,
        zoning: true,
        classification: true,
        usage: true,
        undevelopedPortion: true,
        rateForUndevelopedPortion: true,
        valuedById: true,
        valuedBy: { select: { firstName: true, lastName: true, email: true } },
        valuers: {
          select: { firstName: true, lastName: true, email: true },
        },
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
            propertyType: { select: { identifier: true } },
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
      const valuer = getValuer(plot.valuedBy);
      const reviewer = plot.reviewedBy ? `${plot.reviewedBy?.firstName} ${plot.reviewedBy?.lastName}` : undefined;
      return {
        ...plot,
        valuer,
        reviewer,
        undevelopedPortion: Number(plot.undevelopedPortion),
        rateForUndevelopedPortion: Number(plot.rateForUndevelopedPortion),
        plotExtent: Number(plot.plotExtent),
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
        insuranceRecords: plot.insuranceRecords.map((record) => ({
          ...record,
          rate: Number(record.rate),
          area: Number(record.area),
        })),
      };
    });
  if (!plot) {
    throw new Response('Plot record not found', {
      status: StatusCode.NotFound,
    });
  }

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
  const profFee = getStoredValue(StoredValueId.ProfFees);
  const recoveryFigure = getStoredValue(StoredValueId.RecoveryFigure);
  const capitalisationRate = getStoredValue(StoredValueId.CapitalisationRate);
  const insuranceVat = getStoredValue(StoredValueId.InsuranceVat);
  const preTenderEscalationAt = getStoredValue(StoredValueId.PreTenderEscalationAt);
  const preTenderEscalationPerc = getStoredValue(StoredValueId.PreTenderEscalationPerc);
  const postTenderEscalationAt = getStoredValue(StoredValueId.PostTenderEscalationAt);
  const postTenderEscalationPerc = getStoredValue(StoredValueId.PostTenderEscalationPerc);

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

  const marketValue = roundToDecimal(capitalisedValue + valueOfUndeveloped, 2);

  const fsv = marketValue - (fsvAdjustment?.value || 0) * 0.01 * marketValue;

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

  const canEdit = (!plot.valuedById && !plot.reviewedById) || currentUser.isSuper;
  // const cantEdit = plot.reviewedById ? !currentUser.isSuper : false;
  // const cantEdit = !!plot.reviewedById || !currentUser.isSuper;

  return json({
    currentUser,
    redirectTo,
    valueOfUndeveloped,
    fsv,
    plot,
    GLA,
    canEdit,
    annualGross: grossRental.annual,
    netAnnualRentalIncome,
    outgoings,
    outgoingsRentalRatio,
    capitalisationRate,
    vacancyPercentage,
    capitalisedValue,
    capitalisedFigure,
    totalReplacementValue,
    marketValue,
  });
}

const Schema = z.object({
  redirectTo: z.string(),
});
export const action = async ({ params, request }: ActionArgs) => {
  const currentUserId = await requireUserId(request);

  try {
    const id = getValidatedId(params.plotId);
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { redirectTo } = result.data;

    const plot = await prisma.plot.findUnique({
      where: { id },
      select: { valuedById: true },
    });
    if (!plot) {
      throw new Error('Plot not found');
    }

    if (plot.valuedById) {
      if (plot.valuedById === currentUserId) {
        // throw new Error("Can't review what you valued");
      }
      await prisma.$transaction(async (tx) => {
        const updated = await tx.plot.update({
          where: { id },
          data: { reviewedById: currentUserId },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Plot,
            action: EventAction.Update,
            recordId: updated.id,
            recordData: JSON.stringify(updated),
          },
        });
        // Check if current user is a Report Reviewer
        // If not, throw an error

        const isReviewer = await tx.user.findUnique({
          where: { id: currentUserId },
          select: { isSuper: true, isSignatory: true },
        });
        if (!isReviewer?.isSignatory) {
          throw new Error('You are not allowed to review this plot');
        } else {
          await tx.plot.update({
            where: { id },
            data: { reportReviewedById: currentUserId },
          });
        }
      });
    } else {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.plot.update({
          where: { id },
          data: { valuedById: currentUserId },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Plot,
            action: EventAction.Update,
            recordId: updated.id,
            recordData: JSON.stringify(updated),
          },
        });
      });
    }

    if (redirectTo) {
      return redirect(redirectTo.split('_').join('/'));
    }
    return redirect(AppLinks.CouncilValuationType);
    // return redirect(AppLinks.ValuedCouncilPlots);
    // return redirect(AppLinks.SearchCouncilPlot(ValuationType.Residential));
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
};

export default function PlotSummaryPage() {
  const {
    valueOfUndeveloped,
    plot,
    GLA,
    annualGross,
    netAnnualRentalIncome,
    outgoings,
    outgoingsRentalRatio,
    capitalisationRate,
    vacancyPercentage,
    capitalisedValue,
    capitalisedFigure,
    marketValue,
    totalReplacementValue,
    canEdit,
    fsv,
    redirectTo,
    currentUser,
  } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const details = useMemo(() => {
    return [
      ['Plot Number', plot.plotNumber],
      ['Valuer', [plot.valuedBy?.firstName, plot.valuedBy?.lastName].filter(Boolean).join(' ') || plot.valuer || '-'],
      ['Last Reviewed By', plot.reviewer || '-'],
      ['Valuation Date', dayjs(plot.analysisDate).format('ddd DD MMM YYYY')],
      ['Inspection Date', dayjs(plot.inspectionDate).format('ddd DD MMM YYYY')],
      ['Plot Description', plot.plotDesc],
      ['Plot Extent', formatAmount(plot.plotExtent)],
      ['Address', plot.address],
      ['Zoning', plot.zoning],
      ['Usage', plot.usage],
    ] as const;
  }, [plot]);

  const details2 = useMemo(() => {
    return [
      ['GLA m²', formatAmount(GLA)],
      ['Gross Annual Income', formatAmount(annualGross)],
      ['Net Annual Income', formatAmount(netAnnualRentalIncome)],
      ['Annual Expenditure', formatAmount(outgoings.annual)],
      ['Operating Costs / Month (P/m²)', formatAmount(outgoings.monthly)],
      ['Annual Expenditure as %', `${formatAmount(outgoingsRentalRatio)}%`],
      ['Capitalisation Rate', `${formatAmount(capitalisationRate?.value || 0)}%`],
      ['Vacancy Rate', `${formatAmount(vacancyPercentage?.value || 0)}%`],
      ['Land Value', formatAmount(valueOfUndeveloped)],
      ['Capitalised Value', formatAmount(capitalisedValue)],
      ['Market Value', formatAmount(marketValue)],
      ['Force Sale Value', formatAmount(fsv)],
      // ['Force Sale Value', formatAmount(bardRound(capitalisedValue * 0.9, -6))],
      ['Rate/m² based on MV (GLA)', formatAmount(capitalisedFigure)],
      ['Total Replacement Value', formatAmount(totalReplacementValue)],
    ] as const;
  }, [
    GLA,
    valueOfUndeveloped,
    annualGross,
    netAnnualRentalIncome,
    outgoings,
    outgoingsRentalRatio,
    capitalisationRate,
    vacancyPercentage,
    capitalisedValue,
    capitalisedFigure,
    totalReplacementValue,
    fsv,
    marketValue,
  ]);

  const buttonLabel = (() => {
    if (isProcessing) {
      return 'Processing...';
    }
    if (plot.valuedById) {
      if (currentUser.id === plot.valuedById) {
        return 'Save';
      }
      if (currentUser.isSuper) {
        return 'Mark As Reviewed';
      }
    }
    if (!plot.valuedById && !plot.reviewedById) {
      return 'Mark As Valued';
    }
    // else if (plot.reviewedById && currentUser.isSuper && (currentUser.id != plot.valuedById) || (currentUser.id === plot.valuedById)) {
    //   return 'Create Valuation Report';
    // }
    return 'Save';
  })();

  return (
    <div className="flex flex-col items-stretch gap-6 pb-6">
      <div className="grid-cols-2 grid gap-6">
        <div className="flex flex-col items-stretch">
          {details.map(([subtitle, detail]) => (
            <SummaryChip key={subtitle} subtitle={subtitle} detail={detail} />
          ))}
        </div>
        <div className="flex flex-col items-stretch">
          {details2.map(([subtitle, detail]) => (
            <SummaryChip key={subtitle} subtitle={subtitle} detail={detail} />
          ))}
        </div>
      </div>
      {/* <SavePanel>
        <fetcher.Form method="post" className="flex flex-col items-end">
          <input type="hidden" {...getNameProp('redirectTo')} value={redirectTo || ''} />
          <PrimaryButton type="submit" disabled={!canEdit || isProcessing}>
            {buttonLabel}
          </PrimaryButton>
        </fetcher.Form>
      </SavePanel> */}
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
