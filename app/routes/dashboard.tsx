import type { ChangeEvent, ComponentProps } from 'react';

import { Response, json, type LoaderArgs } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import ActualVsTarget from '~/components/ActualVsTarget';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { CenteredView } from '~/components/CenteredView';
import GraphTitle from '~/components/GraphTitle';
import NeighbourhoodChart from '~/components/NeighbourhoodChart';
import HorizontalBarChart from '~/components/Sideways2';
import StackedBarChart from '~/components/StackedBarChart';
import { TableHeading } from '~/components/TableHeading';
import { TextField } from '~/components/TextField';
import { Toolbar } from '~/components/Toolbar';
import { prisma } from '~/db.server';
import { StatusCode, getFullName } from '~/models/core.validations';
import { getYearMonthFromDate, isDateInMonth } from '~/models/dates';
import { AppLinks } from '~/models/links';
import { getValidatedValuationType } from '~/models/plots.validations';
import { requireUser } from '~/session.server';
import { useUser } from '~/utils';

const MonthSchema = z.string().refine(
  (value) => {
    try {
      const date = new Date(value);
      return date.getMonth() !== undefined && date.getDate() === 1;
    } catch (error) {
      return false;
    }
  },
  { message: 'Invalid month format. Use YYYY-MM' },
);
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

export default function Dash() {
  const currentUser = useUser();
  const { plots } = useLoaderData<typeof loader>();

  const [month, setMonth] = useState(getYearMonthFromDate(new Date()));

  function handleMonthChange(event: ChangeEvent<HTMLInputElement>) {
    const newValue = event.target.value;
    const result = MonthSchema.safeParse(newValue);
    if (result.success) {
      setMonth(result.data);
    }
  }

  const relevantPlots = plots.filter((p) => {
    const date = dayjs(p.valuedBy.createdAt).toDate();
    return isDateInMonth(date, month);
  });

  const numValuedPlots = plots.filter((p) => p.valuedById).length;

  let dailyData: {
    date: Date;
    numPlots: number;
  }[] = [];
  let userData: { name: string; numPlots: number }[] = [];
  let locationData: { name: string; numPlots: number }[] = [];

  for (let plot of relevantPlots) {
    const locationIndex = locationData.findIndex((location) => location.name === plot.address);
    if (locationIndex === -1) {
      locationData.push({
        name: plot.address,
        numPlots: 1,
      });
    } else {
      locationData[locationIndex].numPlots++;
    }

    const userIndex = userData.findIndex((user) => user.name === plot.username);
    if (userIndex === -1) {
      userData.push({
        name: plot.username,
        numPlots: 1,
      });
    } else {
      userData[userIndex].numPlots++;
    }

    const index = dailyData.findIndex((date) => {
      return dayjs(plot.valuedBy.createdAt).isSame(date.date, 'date');
    });
    if (index === -1) {
      dailyData.push({
        date: dayjs(plot.valuedBy.createdAt).toDate(),
        numPlots: 1,
      });
    } else {
      dailyData[index].numPlots++;
    }
  }

  return (
    <div className="flex h-screen flex-col items-stretch">
      <Toolbar currentUserName={currentUser.email} isSuper={currentUser.isSuper} isBanker={currentUser.isBanker} isSignatory={currentUser.isSignatory} />
      <div className="flex grow flex-row items-stretch pt-6 pb-12">
        <CenteredView className="w-full" innerProps={{ className: twMerge('h-full gap-4') }}>
          <div className="flex flex-row items-center gap-6 pb-6">
            <GraphTitle className="items-start">Valuation Dashboard</GraphTitle>
            <Link to={AppLinks.DashboardValuers} className="text-teal-600 hover:underline">
              View Valuers
            </Link>
            <div className="grow" />
            <TextField isCamo type="month" value={month} className="text-end font-semibold text-lg" onChange={handleMonthChange} />
          </div>
          <div className="grid grid-cols-2 gap-16">
            <div className="flex flex-col items-stretch grow bg-stone-100 py-4 rounded-md">
              <ActualVsTarget actual={numValuedPlots} target={plots.length} />
            </div>
            <div className="flex flex-col items-stretch grow bg-stone-100 py-4 rounded-md">
              <StackedBarChart dates={dailyData} />
            </div>
            <div className="flex flex-col items-stretch grow bg-stone-100 py-4 rounded-md">
              <HorizontalBarChart users={userData} />
            </div>
            <div className="flex flex-col items-stretch grow bg-stone-100 py-4 rounded-md">
              <NeighbourhoodChart locations={locationData} />
            </div>
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
  return <TableHeading className={twMerge('bg-stone-400 rounded-t overflow-hidden', className)} {...rest} />;
}
