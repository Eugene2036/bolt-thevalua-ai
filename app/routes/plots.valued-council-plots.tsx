import type { LoaderArgs } from '@remix-run/node';

import { json } from '@remix-run/node';
import { Form, useLoaderData, useNavigate, useNavigation } from '@remix-run/react';
import dayjs from 'dayjs';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { FormTextField } from '~/components/FormTextField';
import { SecondaryButtonLink } from '~/components/SecondaryButton';
import { prisma } from '~/db.server';
import { StatusCode, formatAmount, getQueryParams } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import { ValuationType } from '~/models/plots.validations';
import { StoredValueId } from '~/models/storedValuest';

const Schema = z.object({
  valuationType: z.string().optional(),
  searchTerms: z
    .string()
    .optional()
    .transform((arg) => {
      if (arg) {
        const result = z.coerce.number().safeParse(arg);
        if (result.success) {
          return result.data.toString();
        }
        return arg;
      }
    }),
});
export async function loader({ request }: LoaderArgs) {
  const queryParams = getQueryParams(request.url, ['valuationType', 'searchTerms']);

  const result = Schema.safeParse(queryParams);
  if (!result.success) {
    throw new Response('Invalid input provided, please try again', {
      status: StatusCode.BadRequest,
    });
  }
  const { valuationType, searchTerms } = result.data;

  const numPlots = await prisma.plot.count({
    where: { valuationType, valuedById: { not: null } },
  });

  const plots = await (async () => {
    if (!searchTerms) {
      return [];
    }
    return prisma.plot
      .findMany({
        where: {
          valuationType,
          plotNumber: searchTerms ? { contains: searchTerms } : undefined,
          council: true,
          valuedById: { not: null },
        },
        include: {
          storedValues: true,
          grcRecords: true,
          grcFeeRecords: true,
          grcDeprRecords: true,
          _count: { select: { tenants: true, grcRecords: true } },
        },
      })
      .then((plots) => {
        return plots.map((plot) => {
          return {
            ...plot,
            plotExtent: Number(plot.plotExtent),
            grcRecords: (() => {
              return plot.grcRecords.map((record) => ({
                ...record,
                size: Number(record.size),
                rate: Number(record.rate),
              }));
            })(),
            grcFeeRecords: plot.grcFeeRecords.map((record) => ({
              ...record,
              perc: Number(record.perc),
            })),
            grcDeprRecords: (() => {
              return plot.grcDeprRecords.map((record) => ({
                ...record,
                perc: Number(record.perc),
              }));
            })(),
          };
        });
      })
      .then((plots) => {
        return plots.map((plot) => {
          const grcTotal = plot.grcRecords.reduce((acc, record) => acc + record.rate * record.size, 0);
          const netTotal =
            grcTotal +
            plot.grcFeeRecords.reduce((acc, record) => {
              const rowTotal = Number((record.perc * 0.01 * grcTotal).toFixed(2));
              return acc + rowTotal;
            }, 0);
          const total =
            netTotal -
            plot.grcDeprRecords.reduce((acc, record) => {
              const rowTotal = record.perc * 0.01 * grcTotal;
              // const rowTotal = roundDown(record.perc * 0.01 * grcTotal, -5);
              return acc + rowTotal;
            }, 0);
          return {
            ...plot,
            developmentValue: total,
          };
        });
      });
  })();

  function getStoredValue(plot: (typeof plots)[number], identifier: StoredValueId) {
    if (!plot) {
      return undefined;
    }
    const match = plot.storedValues.find((el) => el.identifier === identifier);
    if (!match) {
      return undefined;
    }
    return { ...match, value: Number(match.value) };
  }

  const refinedPlots = plots.map((plot) => {
    const landRate = getStoredValue(plot, StoredValueId.LandRate);

    const subjectLandValue = (landRate?.value || 0) * plot.plotExtent;

    const grcTotal = plot.grcRecords.reduce((acc, record) => acc + record.rate * record.size, 0);

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

    const capitalValue = subjectLandValue + deprTotal;

    return {
      ...plot,
      subjectLandValue,
      capitalValue,
    };
  });

  return json({ plots: refinedPlots, valuationType, numPlots });
}

export default function ValuedCouncilPlotsPage() {
  const { plots, numPlots } = useLoaderData<typeof loader>();

  const navigate = useNavigate();
  const nav = useNavigation();
  const { getNameProp, isProcessing } = useForm({ data: { plots }, state: nav.state }, Schema);

  function handleClick(href: string) {
    return navigate(href);
  }

  return (
    <div className="flex flex-col items-center w-full">
      <Form method="get" className="flex flex-col items-stretch gap-6">
        <ActionContextProvider isSubmitting={isProcessing}>
          <div className="flex flex-col justify-center items-center">
            <span className="text-xl font-light">Valued plots ({numPlots} in total)</span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <FormTextField placeholder="Search By Plot #" {...getNameProp('searchTerms')} />
            <div className="grow" />
            {!!plots.length && (
              <div className="flex flex-col justify-center items-center">
                <span className="text-lg font-light text-stone-600">{plots.length} valued plot(s) found</span>
              </div>
            )}
          </div>
          <table>
            <thead>
              <tr>
                <th className="sticky top-0 bg-white px-4 py-2 font-semibold text-left text-sm border border-stone-200">Plot Number</th>
                <th className="sticky top-0 bg-white px-4 py-2 font-semibold text-left text-sm border border-stone-200">Plot Size</th>
                <th className="sticky top-0 bg-white px-4 py-2 font-semibold text-left text-sm border border-stone-200">Valuation Date</th>
                <th className="sticky top-0 bg-white px-4 py-2 font-semibold text-left text-sm border border-stone-200">Structures</th>
                <th className="sticky top-0 bg-white px-4 py-2 font-semibold text-left text-sm border border-stone-200">Land Value</th>
                <th className="sticky top-0 bg-white px-4 py-2 font-semibold text-left text-sm border border-stone-200">Development Value</th>
                <th className="sticky top-0 bg-white px-4 py-2 font-semibold text-left text-sm border border-stone-200">Capital Value</th>
              </tr>
            </thead>
            <tbody>
              {plots.map((plot) => {
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
                  <tr key={plot.id} onClick={() => handleClick(to)} className="cursor-pointer">
                    <td className="text-sm p-4 font-light border border-stone-200">
                      <SecondaryButtonLink to={to}>Plot {plot.plotNumber}</SecondaryButtonLink>
                    </td>
                    <td className="text-sm p-4 font-light border border-stone-200">{plot.plotExtent}</td>
                    <td className="text-sm p-4 font-light border border-stone-200">{dayjs(plot.analysisDate).format('DD/MM/YYYY')}</td>
                    <td className="text-sm p-4 font-light border border-stone-200">{plot._count.grcRecords}</td>
                    <td className="text-sm p-4 font-light border border-stone-200 text-end">{formatAmount(plot.subjectLandValue)}</td>
                    <td className="text-sm p-4 font-light border border-stone-200 text-end">{formatAmount(plot.developmentValue)}</td>
                    <td className="text-sm p-4 font-light border border-stone-200 text-end">{formatAmount(plot.capitalValue)}</td>
                  </tr>
                );
              })}
              {!plots.length && (
                <tr>
                  <td className="text-sm text-center p-4 font-light border border-stone-200" colSpan={7}>
                    <span className="text-slate-400 text-base font-light">No matches found</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ActionContextProvider>
      </Form>
    </div>
  );
}
