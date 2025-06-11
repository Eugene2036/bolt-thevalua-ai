import type { ActionArgs } from '@remix-run/node';

import { redirect } from '@remix-run/node';

import { RouteErrorBoundary } from '~/components/Boundaries';
import { prisma } from '~/db.server';
import { getValidatedId } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';

export const action = async ({ params, request }: ActionArgs) => {
  await requireUserId(request);

  const id = getValidatedId(params.plotId);
  await prisma.plot.delete({ where: { id } });

  return redirect(AppLinks.Plots);
};

export default function PlotDetailsIndexPage() {
  return (
    <div className="flex flex-col justify-center items-center grow">
      <span className="text-xl font-light text-stone-400">Click on a tab at the top to access this plot's information</span>
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
