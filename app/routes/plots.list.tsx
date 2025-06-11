import type { LoaderArgs } from '@remix-run/node';

import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

import { SecondaryButtonLink } from '~/components/SecondaryButton';
import { prisma } from '~/db.server';
import { AppLinks } from '~/models/links';

export async function loader({ request }: LoaderArgs) {
  const plots = await prisma.plot
    .findMany({
      select: {
        id: true,
        propertyId: true,
        plotNumber: true,
        valuationType: true,
        council: true,
        _count: { select: { tenants: true } },
        propertyLocation: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    .then((plots) => plots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
  return json({ plots });
}

export default function PlotIndexPage() {
  const { plots } = useLoaderData<typeof loader>();

  return (
    <div className="grid grid-cols-4 gap-2">
      {plots.map((plot) => (
        <SecondaryButtonLink key={plot.id} to={AppLinks.Plot(plot.id)}>
          <div className="flex flex-col items-stretch">
            <span>Plot {plot.plotNumber}</span>
            <span>
              {plot.valuationType} {plot.council ? '(Council)' : ''}
            </span>
            <span>{plot._count.tenants} tenant(s)</span>
            <span>Location: {plot.propertyLocation}</span>
          </div>
        </SecondaryButtonLink>
      ))}
    </div>
  );
}
