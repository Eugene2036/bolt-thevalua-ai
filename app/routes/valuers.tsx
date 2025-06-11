import type { ComponentProps } from 'react';

import { Response, json, type LoaderArgs } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { twMerge } from 'tailwind-merge';

import { RouteErrorBoundary } from '~/components/Boundaries';
import { CenteredView } from '~/components/CenteredView';
import GraphTitle from '~/components/GraphTitle';
import { TableCell } from '~/components/TableCell';
import { TableHeading } from '~/components/TableHeading';
import { Toolbar } from '~/components/Toolbar';
import { prisma } from '~/db.server';
import { StatusCode, getFullName } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import { ValuationType, getValidatedValuationType } from '~/models/plots.validations';
import { requireUser } from '~/session.server';
import { useUser } from '~/utils';

export async function loader({ request }: LoaderArgs) {
  const currentUser = await requireUser(request);
  if (!currentUser.isSuper) {
    throw new Response("You don't have permission to access this page", {
      status: StatusCode.Unauthorised,
    });
  }

  const plots = await prisma.plot
    .findMany({
      select: {
        valuationType: true,
        address: true,
        valuedById: true,
        valuedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
      },
    })
    .then((plots) => {
      return plots
        .map((plot) => {
          if (!plot.valuedBy) {
            return undefined;
          }
          const valuedBy = plot.valuedBy;
          const valuationType = getValidatedValuationType(plot.valuationType);
          if (!valuationType) {
            throw new Error('Invalid valuation type');
          }
          return {
            ...plot,
            valuedBy,
            valuationType,
            username: getFullName(plot.valuedBy.firstName, plot.valuedBy.lastName) || plot.valuedBy.email,
          };
        })
        .filter(Boolean);
    });

  return json({
    plots: plots.sort((a, b) => a.valuedBy.createdAt.getTime() - b.valuedBy.createdAt.getTime()),
  });
}

export default function ValuersPage() {
  const currentUser = useUser();
  const { plots } = useLoaderData<typeof loader>();

  let valuerData: {
    id: string;
    name: string;
    numResidential: number;
    numCommercial: number;
  }[] = [];

  for (let plot of plots) {
    const valuerIndex = valuerData.findIndex((valuer) => valuer.name === plot.username);
    if (valuerIndex === -1) {
      valuerData.push({
        id: plot.valuedBy.id,
        name: plot.username,
        numResidential: plot.valuationType === ValuationType.Residential ? 1 : 0,
        numCommercial: plot.valuationType === ValuationType.Commercial ? 1 : 0,
      });
    } else {
      if (plot.valuationType === ValuationType.Residential) {
        valuerData[valuerIndex].numResidential++;
      } else {
        valuerData[valuerIndex].numCommercial++;
      }
    }
  }

  return (
    <div className="flex h-screen flex-col items-stretch">
      <Toolbar currentUserName={currentUser.email} isSuper={currentUser.isSuper} isBanker={currentUser.isBanker} isSignatory={currentUser.isSignatory} />
      <div className="flex grow flex-row items-stretch pt-6">
        <CenteredView className="w-full" innerProps={{ className: twMerge('h-full gap-4') }}>
          <div className="flex flex-col items-stretch py-6 gap-6">
            <GraphTitle className="items-start">Valuers' Performance</GraphTitle>
            <table className="table-fixed">
              <thead>
                <tr>
                  <CustomTableHeading className="w-2/5">Name</CustomTableHeading>
                  <CustomTableHeading>Valuations</CustomTableHeading>
                  <CustomTableHeading>Residential</CustomTableHeading>
                  <CustomTableHeading>Commercial</CustomTableHeading>
                  <CustomTableHeading>Rank (By Performance)</CustomTableHeading>
                </tr>
              </thead>
              <tbody>
                {valuerData
                  .sort((a, b) => {
                    const firstTotal = a.numResidential + a.numCommercial;
                    const secondTotal = b.numResidential + b.numCommercial;
                    return secondTotal - firstTotal;
                  })
                  .map((user, index) => (
                    <tr key={user.name}>
                      <TableCell>
                        <Link to={AppLinks.UserProfile(user.id)} className="text-teal-600 hover:underline">
                          {user.name}
                        </Link>
                      </TableCell>
                      <TableCell>{user.numResidential + user.numCommercial}</TableCell>
                      <TableCell>{user.numResidential}</TableCell>
                      <TableCell>{user.numCommercial}</TableCell>
                      <TableCell>{index + 1}</TableCell>
                    </tr>
                  ))}
                {!valuerData.length && (
                  <tr>
                    <TableCell colSpan={5}>No data to show</TableCell>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CenteredView>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}

export function CustomTableHeading(props: ComponentProps<typeof TableHeading>) {
  const { className, ...rest } = props;
  return <TableHeading className={twMerge('bg-stone-200 rounded-t', className)} {...rest} />;
}
