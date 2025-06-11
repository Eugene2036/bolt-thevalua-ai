import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { ChangeEvent } from 'react';

import { json } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import readXlsxFile from 'read-excel-file';
import { toast } from 'sonner';
import { Check } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { Card } from '~/components/Card';
import { InlineAlert } from '~/components/InlineAlert';
import { PrimaryButton } from '~/components/PrimaryButton';
import { prisma } from '~/db.server';
import { hasSuccess, processBadRequest, stringifyZodError } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { COUNCIL_PLOT_TABLE_COLUMNS, CouncilPlotExcelRowSchema } from '~/models/excel';
import { getRawFormFields } from '~/models/forms';
import { logParseError } from '~/models/logger.server';
import { GrcFeeType, GrcFeeTypePercs, ValuationType } from '~/models/plots.validations';
import { requireUserId } from '~/session.server';

export async function loader({ request }: LoaderArgs) {
  const plots = await prisma.plot.findMany({
    select: { plotNumber: true },
  });
  return json({ plots });
}

const Schema = z.object({
  rows: z.preprocess((arg) => {
    try {
      if (typeof arg === 'string') {
        return JSON.parse(arg);
      }
    } catch (error) {
      return undefined;
    }
  }, CouncilPlotExcelRowSchema.array()),
});

export async function action({ request, params }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  const fields = await getRawFormFields(request);
  const result = Schema.safeParse(fields);
  if (!result.success) {
    logParseError(request, result.error, fields);
    return processBadRequest(result.error, fields);
  }
  const { rows } = result.data;

  const plots = await prisma.plot.findMany();

  let numDupl = 0;

  let nextPlotId = 0;
  for (let row of rows) {
    const [plotNumber, plotSize, inspectionDate, structure, neighbourhood, location] = row;
    console.log(neighbourhood, location);

    const plot = plots.find((p) => p.plotNumber === plotNumber.toString());

    if (plot) {
      numDupl = numDupl + 1;
      continue;
    }

    const temp = nextPlotId;
    nextPlotId = (() => {
      if (temp) {
        return temp + 1;
      }
      const lastPlotId = plots.length ? plots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].propertyId : 0;
      return lastPlotId + 1;
    })();

    const outgoingIdentifiers = [
      ['Rates', '1'],
      ['Levies', '12'],
      ['Electricity and Water in Common Areas', '12'],
      ['Maintenance and Repairs', '%'],
      ['Refurbishment', '1'],
      ['Management Fee', '%'],
      ['Auditors Fee', '1'],
      ['Insurance', '%'],
      ['Security Services', '12'],
      ['Cleaning Services', '12'],
      ['Maintenance - Lift', '12'],
      ['Maintenance - A/C', '12'],
    ];

    const { id } = await prisma.plot.create({
      data: {
        council: true,
        plotNumber: plotNumber.toString(),
        plotExtent: plotSize,
        inspectionDate,
        grcRecords: {
          create: [...Array(structure).keys()].map((_) => ({
            identifier: '',
            unit: '',
            size: 0,
            rate: 0,
            bull: true,
          })),
        },
        propertyId: nextPlotId,
        valuer: '',
        plotDesc: '',
        address: location,
        zoning: '',
        classification: '',
        usage: '',
        userId: currentUserId,
        valuationType: ValuationType.Residential,
        grcFeeRecords: {
          create: [
            {
              identifier: GrcFeeType.Professional,
              perc: GrcFeeTypePercs[GrcFeeType.Professional],
            },
            {
              identifier: GrcFeeType.Contigencies,
              perc: GrcFeeTypePercs[GrcFeeType.Contigencies],
            },
            {
              identifier: GrcFeeType.Statutory,
              perc: GrcFeeTypePercs[GrcFeeType.Statutory],
            },
          ].map(({ identifier, perc }) => ({
            identifier,
            perc,
          })),
        },
        outgoingRecords: {
          create: outgoingIdentifiers.map(([identifier, itemType]) => ({
            identifier,
            itemType,
            unitPerClient: 0,
            ratePerClient: 0,
            unitPerMarket: 0,
            ratePerMarket: 0,
          })),
        },
      },
      select: { id: true },
    });
    console.log(rows.indexOf(row), 'row created', id);
  }
  console.log('numDupl', numDupl);

  return json({ success: true });
}

export default function ImportCouncilPlotsPage() {
  const { plots } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  type CustomRow = readonly [
    string | number,
    string | number,
    string, // Date,
    string | number,
    string,
    string,
  ];

  const [rows, setRows] = useState<(CustomRow | Error)[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      toast.success('Imported council plot records successfully');
    }
  }, [fetcher.data]);

  useEffect(() => {
    const newRows = rows.filter((el) => {
      if (el instanceof Error) {
        return el;
      }
      return plots.every((plot) => plot.plotNumber !== el[0]);
    });
    console.log('newRows', newRows.length);
  }, [rows, plots]);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      try {
        if (!event.target.files) {
          return;
        }
        setError('');
        const files = Array.from(event.target.files);
        const rawRows = await readXlsxFile(files[0]);
        if (!rawRows.length) {
          throw new Error('No rows found on spreadsheet');
        }
        if (rawRows.length === 1) {
          throw new Error('Only found one row, note that the first row is meant for column headings');
        }
        const [headingRow, ...dataRows] = rawRows;
        const namedColumns = COUNCIL_PLOT_TABLE_COLUMNS.map(([columnName, _]) => {
          const match = headingRow.find((cell) => cell === columnName);
          if (!match) {
            return { index: undefined, columnName };
          }
          return { index: headingRow.indexOf(match), columnName };
        });
        const orderedRows = dataRows.map((row) => {
          return namedColumns.map((namedColumn) => {
            if (namedColumn.index === undefined) {
              return undefined;
            }
            const match = row[namedColumn.index];
            if (match === undefined) {
              return undefined;
            }
            return match;
          });
        });
        const parsedRows = orderedRows.map((row) => {
          const result = CouncilPlotExcelRowSchema.safeParse(row);
          if (!result.success) {
            console.log(row.map((el) => [el, typeof el]));
            console.log(result.error.flatten());
            return new Error(stringifyZodError(result.error));
          }
          return [result.data[0], result.data[1], dayjs(result.data[2]).format('YYYY-MM-DD'), result.data[3], result.data[4], result.data[5]] as const;
        });
        const newRows = parsedRows.filter((el) => {
          if (el instanceof Error) {
            return el;
          }
          return plots.every((plot) => plot.plotNumber !== el[0]);
        });
        console.log('newRows', newRows.length);
        setRows(
          parsedRows.filter((el) => {
            if (el instanceof Error) {
              return el;
            }
            return plots.every((plot) => plot.plotNumber !== el[0]);
          }),
          // .slice(0, 1_000),
          // .slice(0, 500),
        );
      } catch (error) {
        console.log(error);
        return setError(getErrorMessage(error) || 'Something went wrong reading excel file, please try again');
      }
    },
    [plots],
  );

  return (
    <Card>
      <div className="flex flex-row items-center justify-start gap-4 border-b border-b-stone-200 px-4 py-2">
        <div className="flex flex-col items-start justify-center">
          <h2 className="text-lg font-semibold">Import From Excel</h2>
          {!!error && <InlineAlert>{error}</InlineAlert>}
        </div>
        <div className="grow" />
        {!!rows.filter((row) => !(row instanceof Error)).length && (
          <fetcher.Form method="post">
            <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
              <input type="hidden" {...getNameProp('rows')} value={JSON.stringify(rows.filter((row) => !(row instanceof Error)))} />
              <PrimaryButton type="submit" disabled={isProcessing} className="bg-teal-600 hover:bg-teal-800 focus:bg-teal-800">
                <div className="flex flex-row items-center gap-4">
                  <Check className="text-white" size={18} />
                  {isProcessing && <span>Importing....</span>}
                  {!isProcessing && <span>Import The {rows.length} Plot(s) Below</span>}
                </div>
              </PrimaryButton>
            </ActionContextProvider>
          </fetcher.Form>
        )}
        <label htmlFor="excelFile">
          <InputFileLabel />
        </label>
        <input type="file" id="excelFile" accept=".xlsx, .xlsm, .xls" onChange={handleFileChange} disabled={false} className="top-0, invisible absolute left-0" />
      </div>
      <div className="flex flex-col items-stretch justify-center overflow-auto p-4 shadow-inner">
        <table className="table-auto border-collapse text-left">
          <thead className="divide-y rounded border border-stone-200">
            <tr className="divide-x border border-stone-200">
              {COUNCIL_PLOT_TABLE_COLUMNS.map(([col, _], index) => (
                <th key={index} className="whitespace-nowrap px-2 py-1">
                  <span className="text-base font-semibold text-stone-800">{col}</span>
                </th>
              ))}
            </tr>
          </thead>
          {!rows.length && (
            <tbody className="text-base">
              {[...Array(10).keys()].map((key) => (
                <tr key={key} className="divide-x divide-stone-200 border border-stone-200">
                  {COUNCIL_PLOT_TABLE_COLUMNS.map((_, index) => (
                    <td key={index} className="whitespace-nowrap bg-stone-100 p-2">
                      <span className="invisible text-base font-normal text-stone-400">Placeholder text</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
          {!!rows.length && (
            <tbody className="text-base">
              {rows.map((row, index) => (
                <tr key={index} className="divide-x divide-stone-200 border border-stone-200">
                  {row instanceof Error && (
                    <td colSpan={39} className="bg-red-100 p-2">
                      <span className="font-light text-red-600">{row.message}</span>
                    </td>
                  )}
                  {!(row instanceof Error) && (
                    <>
                      {row.map((cell, index) => (
                        <td key={index} className="whitespace-nowrap bg-teal-50 p-2">
                          {!cell && <span className="text-base font-light">-</span>}
                          {!!cell && <span className="text-base font-light">{cell.toString()}</span>}
                        </td>
                      ))}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
    </Card>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}

function InputFileLabel() {
  return (
    <div
      className={twMerge(
        'cursor-pointer',
        'rounded-md px-4 py-2 text-center text-base text-teal-600 shadow-lg transition-all duration-150',
        'bg-stone-200 hover:bg-stone-300 focus:bg-stone-300',
      )}
    >
      Choose Excel File To Import
    </div>
  );
}
