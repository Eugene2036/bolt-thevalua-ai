import type { LoaderArgs } from '@remix-run/node';

import { Response, json } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import { PrimaryButton } from '~/components/PrimaryButton';
import { SecondaryButton, SecondaryButtonLink } from '~/components/SecondaryButton';
import { TextField } from '~/components/TextField';
import { prisma } from '~/db.server';
import { StatusCode, getQueryParams } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import { ValuationType } from '~/models/plots.validations';
import { getUser } from '~/session.server';

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
});

export async function loader({ request }: LoaderArgs) {
  const queryParams = getQueryParams(request.url, ['valuationType', 'searchTerm']);

  const result = Schema.safeParse(queryParams);
  if (!result.success) {
    throw new Response('Invalid input provided, please reload the page', {
      status: StatusCode.BadRequest,
    });
  }
  const { searchTerm, valuationType } = result.data;

  const currUser = await getUser(request);

  const user = await prisma.user.findUnique({
    where: { id: currUser?.id },
    include: {
      UserGroup: {
        include: {
          company: {
            select: {
              id: true,
              CompanyName: true,
            }
          }
        },
      },
    },
  });

  const companyId = user?.UserGroup?.company.id;
  
  const numPlots = await prisma.plot.count({
    where: { valuationType, council: true, companyId },
  });

  const plots = await prisma.plot.findMany({
    where: {
      valuationType,
      council: true,
      companyId: companyId,
      plotNumber: searchTerm ? { contains: searchTerm } : undefined,
    },
    select: {
      id: true,
      valuedById: true,
      council: true,
      propertyId: true,
      plotNumber: true,
      valuationType: true,
      companyId: true,
    },
  });
  return json({
    plots: searchTerm ? plots : [],
    searchTerm,
    valuationType,
    numPlots,
  });
}

export default function PlotIndexPage() {
  const { plots, searchTerm, valuationType, numPlots } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col items-center grow">
      <div className="flex flex-col items-stretch gap-6 w-[60%] grow">
        <div className="flex flex-col justify-center items-center">
          <span className="text-xl font-light">
            Search For {valuationType ? `${valuationType} ` : ''}Plots ({numPlots} plots total)
          </span>
        </div>
        <Form method="get" className="flex flex-row items-stretch gap-2">
          <div className="flex flex-col items-stretch grow">
            <TextField name="searchTerm" defaultValue={searchTerm} placeholder="Search By Plot #" />
            <input type="hidden" name="valuationType" value={valuationType} />
          </div>
          <PrimaryButton type="submit">Search</PrimaryButton>
        </Form>
        {!!plots.length && (
          <div className="grid grid-cols-1 gap-6">
            {plots.map((plot) => {
              if (plot.valuedById) {
                return (
                  <SecondaryButton key={plot.id} disabled>
                    Plot {plot.plotNumber} has already been valued, to view this property go to review.
                  </SecondaryButton>
                );
              }
              const to = (() => {
                if (plot.valuationType !== ValuationType.Residential && !plot.council) {
                  return AppLinks.PlotValuations(plot.id);
                }
                if (plot.valuationType === ValuationType.Residential && !plot.council) {
                  return AppLinks.PlotGrc(plot.id);
                }
                if (plot.valuationType === ValuationType.Residential && plot.council) {
                  return AppLinks.PlotCouncilGrc(plot.id);
                }
                if (plot.valuationType === ValuationType.Commercial && plot.council) {
                  return AppLinks.PlotValuations(plot.id);
                }
                return AppLinks.Plot(plot.id);
              })();
              return (
                <SecondaryButtonLink key={plot.id} to={to}>
                  Plot {plot.plotNumber}
                </SecondaryButtonLink>
              );
            })}
          </div>
        )}
        {!plots.length && !!searchTerm && (
          <div className="flex flex-col justify-center items-center">
            <span className="text-slate-400 text-base font-light">No matches found</span>
          </div>
        )}
        {/* <SecondaryButtonLink to={AppLinks.NewPlot} >Create New Plot</SecondaryButtonLink> */}
        <div className="grow" />
        <SecondaryButtonLink to={AppLinks.ValuedCouncilPlots}>Review Valuation</SecondaryButtonLink>
        <div className="grow" />
      </div>
    </div>
  );
}
