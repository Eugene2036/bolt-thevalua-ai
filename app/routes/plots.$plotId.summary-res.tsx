import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { z } from 'zod';

import { useForm } from '~/components/ActionContextProvider';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { PrimaryButton } from '~/components/PrimaryButton';
import SavePanel from '~/components/SavePanel';
import { SummaryChip } from '~/components/SummaryChip';
import { prisma } from '~/db.server';
import { StatusCode, badRequest, bardRound, formatAmount, getQueryParams, getValidatedId, processBadRequest, roundDown } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { getValuer } from '~/models/plots.validations';
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
        plotNumber: true,
        reviewedById: true,
        valuer: true,
        valuedById: true,
        valuedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
        inspectionDate: true,
        analysisDate: true,
        plotDesc: true,
        plotExtent: true,
        address: true,
        zoning: true,
        classification: true,
        usage: true,
        storedValues: {
          select: { id: true, identifier: true, value: true },
        },
        valuers: {
          select: { firstName: true, lastName: true },
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
          },
        },
        grcRecords: {
          select: {
            rate: true,
            size: true,
            bull: true,
          },
        },
        grcFeeRecords: {
          select: {
            perc: true,
          },
        },
        mvRecords: {
          select: {
            price: true,
            size: true,
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

  const landRate = getStoredValue(StoredValueId.LandRate);
  const buildRate = getStoredValue(StoredValueId.BuildRate);
  const perculiar = getStoredValue(StoredValueId.Perculiar);

  const subjectLandValue = (landRate?.value || 0) * plot.plotExtent;

  const subjectBuildValue = plot.grcRecords.filter((el) => el.bull).reduce((acc, record) => acc + record.size, 0) * (buildRate?.value || 0);

  const projectedValue = subjectLandValue + subjectBuildValue;

  const marketValue = projectedValue + projectedValue * (perculiar?.value || 0);
  const sayMarket = roundDown(marketValue, -5);

  const forcedSaleValue = marketValue * 0.9;
  const sayForced = bardRound(forcedSaleValue, -5);

  const grcTotal = plot.grcRecords.reduce((acc, record) => acc + record.rate * record.size, 0);

  const netTotal =
    grcTotal +
    plot.grcFeeRecords.reduce((acc, record) => {
      const rowTotal = Number((record.perc * 0.01 * grcTotal).toFixed(2));
      return acc + rowTotal;
    }, 0);

  const totalReplacementValue =
    netTotal -
    plot.grcFeeRecords.reduce((acc, record) => {
      const rowTotal = roundDown(record.perc * 0.01 * grcTotal, -5);
      return acc + rowTotal;
    }, 0);

  const sayReplacementValue = Math.round(totalReplacementValue / 100_000) * 100_000;

  // const cantEdit = plot.reviewedById ? !currentUser.isSuper : false;
  // const cantEdit = !!plot.reviewedById || !currentUser.isSuper;

  // const cant = (!plot.valuedById && !plot.reviewedById) ? false : !currentUser.isSuper;
  const canEdit = (!plot.valuedById && !plot.reviewedById) || currentUser.isSuper;

  // new -> any1
  // valued -> super
  // reviewed -> super

  return json({
    currentUser,
    redirectTo,
    plot,
    // cantEdit,
    canEdit,
    sayMarket,
    sayForced,
    sayReplacementValue,
  });
}

const Schema = z.object({
  redirectTo: z.string(),
});
export const action = async ({ request, params }: ActionArgs) => {
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

export default function PlotSummaryResPage() {
  const {
    redirectTo,
    plot,
    // cantEdit,
    canEdit,
    sayMarket,
    sayForced,
    sayReplacementValue,
    currentUser,
  } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const details = useMemo(() => {
    return [
      ['Plot Number', plot.plotNumber],
      ['Valuer', plot.valuer || '-'],
      ['Last Reviewed By', plot.reviewer || '-'],
      ['Valuation Date', dayjs(plot.analysisDate).format('ddd DD MMM YYYY')],
      ['Inspection Date', dayjs(plot.inspectionDate).format('ddd DD MMM YYYY')],
      ['Plot Description', plot.plotDesc],
      ['Plot Extent', formatAmount(plot.plotExtent)],
      ['Address', plot.address],
      ['Zoning', plot.zoning],
      // ['Classification', plot.classification],
      ['Usage', plot.usage],
    ] as const;
  }, [plot]);

  const details2 = useMemo(() => {
    return [
      ['GBA m2', formatAmount(plot.gba)],
      ['Market Value', formatAmount(sayMarket)],
      ['Forced Sale Value', formatAmount(sayForced)],
      ['Total Replacement Value', formatAmount(sayReplacementValue)],
    ] as const;
  }, [plot, sayMarket, sayForced, sayReplacementValue]);

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
    <div className="flex flex-col items-stretch gap-6 p-6">
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
      <SavePanel>
        <fetcher.Form method="post" className="flex flex-col items-end">
          <input type="hidden" {...getNameProp('redirectTo')} value={redirectTo || ''} />
          {/* <PrimaryButton type="submit" disabled={cantEdit || isProcessing}> */}
          <PrimaryButton type="submit" disabled={!canEdit || isProcessing}>
            {buttonLabel}
          </PrimaryButton>
        </fetcher.Form>
      </SavePanel>
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
