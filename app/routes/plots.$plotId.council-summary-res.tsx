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
import { getValuer } from '~/models/plots.validations';
import { StoredValueId } from '~/models/storedValuest';
import { requireUser, requireUserId } from '~/session.server';

var landValue = 0;
var valueOfImprovements = 0;
var capValue = 0;


async function createESRIValues(identifier: String, value: Number) {

}


export async function loader({ request, params }: LoaderArgs) {
  const currentUser = await requireUser(request);

  const plotId = getValidatedId(params.plotId);
  const queryParams = getQueryParams(request.url, ['redirectTo']);
  const redirectTo = queryParams.redirectTo || '';

  const plot = await prisma.plot
    .findUnique({
      where: { id: plotId },
      include: {
        valuedBy: true,
        reviewedBy: true,
        plotAndComparables: { include: { comparablePlot: true } },
        storedValues: true,
        valuers: true,
        tenants: { include: { propertyType: true } },
        grcRecords: true,
        grcFeeRecords: true,
        grcDeprRecords: true,
        mvRecords: true,
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
        avgPrice: plot.plotAndComparables.length
          ? plot.plotAndComparables.reduce((acc, plotAndComparable) => {
            return acc + Number(plotAndComparable.comparablePlot.price);
          }, 0) / plot.plotAndComparables.length
          : 0,
        plotExtent: Number(plot.plotExtent),
        gba: plot.grcRecords.filter((el) => el.bull).reduce((acc, record) => acc + Number(record.size), 0),
        tenants: plot.tenants.map((tenant) => ({
          ...tenant,
          startDate: dayjs(tenant.startDate).format('YYYY-MM-DD'),
          endDate: dayjs(tenant.endDate).format('YYYY-MM-DD'),
          remMonths: dayjs(tenant.endDate).diff(dayjs(), 'month'),
          grossMonthlyRental: Number(tenant.grossMonthlyRental),
          escalation: Number(tenant.escalation),
        })),
        grcRecords: plot.grcRecords.map((record) => ({
          ...record,
          rate: Number(record.rate),
          size: Number(record.size),
        })),
        grcFeeRecords: plot.grcFeeRecords.map((record) => ({
          ...record,
          perc: Number(record.perc),
        })),
        mvRecords: plot.mvRecords.map((record) => ({
          ...record,
          size: Number(record.size),
          price: Number(record.price),
        })),
        grcDeprRecords: (() => {
          const records = plot.grcDeprRecords.map((record) => ({
            ...record,
            perc: Number(record.perc),
          }));
          if (records.length) {
            return records;
          }
          return [{ id: '', identifier: '', perc: 0 }];
        })(),
      };
    })
    .then(async (plot) => {
      if (!plot) {
        return undefined;
      }
      if (!plot.valuer) {
        const { valuedBy } = await prisma.plot.update({
          where: { id: plot.id },
          data: { valuedById: currentUser.id },
          include: { valuedBy: true },
        });
        const valuer = getValuer(valuedBy);
        return { ...plot, valuer };
      }
      return plot;
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

  const perculiar = getStoredValue(StoredValueId.Perculiar);

  // const landValue = getStoredValue(StoredValueId.LandValue);

  // const valueOfDevelopments = getStoredValue(StoredValueId.ValueOfDevelopments);

  const avgPrice = plot.avgPrice;

  const marketValue = avgPrice + Number(avgPrice * (perculiar?.value || 0) * 0.01);
  const sayMarket = marketValue;

  const forcedSaleValue = marketValue * 0.9;
  const sayForced = forcedSaleValue;

  const grcTotal = plot.grcRecords.reduce((acc, record) => acc + record.rate * record.size, 0);

  const sayReplacementValue = grcTotal;

  const netTotal =
    grcTotal +
    plot.grcFeeRecords.reduce((acc, record) => {
      const rowTotal = Number((record.perc * 0.01 * grcTotal).toFixed(2));
      return acc + rowTotal;
    }, 0);

  const deprTotal =
    netTotal -
    plot.grcDeprRecords.reduce((acc, record) => {
      const rowTotal = record.perc * 0.01 * grcTotal;
      return acc + rowTotal;
    }, 0);

  // LandRate
  const landRate = getStoredValue(StoredValueId.LandRate);

  // LandValue
  const subjectLandValue = (landRate?.value || 0) * plot.plotExtent;
  landValue = subjectLandValue;


  // CapitalValue
  const capitalValue = subjectLandValue + deprTotal;
  capValue = capitalValue;


  // Value Of Improvements/ Developments
  const improvementsValue = deprTotal;
  valueOfImprovements = improvementsValue;

  console.log('Land Value: ', landValue)
  console.log('Value of Developments: ', valueOfImprovements)
  console.log('Capital Value: ', capValue)

  const canEdit = (!plot.valuedById && !plot.reviewedById) || currentUser.isSuper;
  // const cantEdit = plot.reviewedById ? !currentUser.isSuper : false;
  // const cantEdit = !!plot.reviewedById || !currentUser.isSuper;

  return json({
    redirectTo,
    canEdit,
    currentUser,
    plot,
    sayMarket,
    sayForced,
    sayReplacementValue,
    subjectLandValue,
    deprTotal,
    capitalValue,
    improvementsValue,
    netTotal,
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
      select: {
        valuedById: true,
        reviewedById: true,
        plotNumber: true,
        plotExtent: true,
        id: true,
      },
    });
    if (!plot) {
      throw new Error('Plot not found');
    }

    if (plot.valuedById) {
      if (plot.valuedById === currentUserId) {
        // throw new Error("Can't review what you valued");
      } else {
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
      }
    } else if (plot.valuedById === currentUserId) {
      // Upsert Land Value
      await prisma.$transaction(async (tx) => {
        const updated = await tx.storedValue.upsert({
          where: { id },
          update: { identifier: StoredValueId.LandValue, value: landValue },
          create: { identifier: StoredValueId.LandValue, value: landValue },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.StoredValue,
            action: EventAction.Update,
            recordId: updated.id,
            recordData: JSON.stringify(updated),
          },
        });
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
    // return redirect(AppLinks.SearchCouncilPlot(ValuationType.Residential));
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
};

export default function PlotCouncilSummaryResPage() {
  const { plot, sayMarket, sayForced, subjectLandValue, improvementsValue, capitalValue, netTotal, canEdit, redirectTo, currentUser } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const details = useMemo(() => {
    return [
      ['Plot Number', plot.plotNumber],
      ['Valuer', plot.valuer || '-'],
      ['Last Reviewed By', plot.reviewer || '-'],
      ['Valuation Date', dayjs(plot.analysisDate).format('ddd DD MMM YYYY')],
      ['Inspection Date', dayjs(plot.inspectionDate).format('ddd DD MMM YYYY')],
      ['Plot Description', plot.plotDesc || '-'],
      ['Plot Extent', formatAmount(plot.plotExtent)],
      // ['Neighbourhood', plot.address],
      ['Location', plot.propertyLocation],
      ['Zoning', 'Residential'],
      // ['Zoning', plot.zoning],
      // ['Classification', plot.classification],
      ['Usage', plot.usage || 'Residential'],
    ] as const;
  }, [plot]);

  const details2 = useMemo(() => {
    return [
      ['GBA m2', formatAmount(plot.gba)],
      ['Market Value', formatAmount(sayMarket)],
      ['Forced Sale Value', formatAmount(sayForced)],
      ['Gross Replacement Cost', formatAmount(netTotal)],
      ['Land Value', formatAmount(subjectLandValue)],
      ['Value of Developments', formatAmount(improvementsValue)],
      ['Capital Value', formatAmount(capitalValue)],
    ] as const;
  }, [
    plot,
    sayMarket,
    sayForced,
    // sayReplacementValue,
    capitalValue,
    subjectLandValue,
    improvementsValue,
    netTotal,
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
    <div className="flex flex-col items-stretch gap-6">
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
      <div className="grid items-stretch gap-2">
        {/* <SavePanel>
          <fetcher.Form method="post" className="flex flex-col items-end">
            <input type="hidden" {...getNameProp('redirectTo')} value={redirectTo || ''} />
            <PrimaryButton type="submit" disabled={!canEdit || isProcessing}>
              {buttonLabel}
            </PrimaryButton>
          </fetcher.Form>
        </SavePanel> */}
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
