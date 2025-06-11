import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';

import { RouteErrorBoundary } from '~/components/Boundaries';
import { prisma } from '~/db.server';
import { StatusCode, getValidatedId } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';

export async function loader({ request, params }: LoaderArgs) {
  await requireUserId(request);
  const plotId = getValidatedId(params.plotId);

  const plot = await prisma.plot
    .findUnique({
      where: { id: plotId },
      select: {
        id: true,
        propertyId: true,
        plotNumber: true,
        valuer: true,
        inspectionDate: true,
        analysisDate: true,
        plotDesc: true,
        plotExtent: true,
        address: true,
        zoning: true,
        classification: true,
        usage: true,
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
        })),
      };
    });
  if (!plot) {
    throw new Response('Plot record not found', {
      status: StatusCode.NotFound,
    });
  }

  return json({ plot });
}

export const action = async ({ params, request }: ActionArgs) => {
  await requireUserId(request);

  const id = getValidatedId(params.plotId);
  await prisma.plot.delete({ where: { id } });

  return redirect(AppLinks.Plots);
};

export default function PlotSummaryPage() {
  const { plot } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col items-stretch gap-6">
      <span className="text-xl font-light">Comparables {plot.id}</span>
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
