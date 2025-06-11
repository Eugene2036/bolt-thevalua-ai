import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { ChangeEvent } from 'react';

import { json } from '@remix-run/node';
import { useFetcher, useLoaderData, useNavigate } from '@remix-run/react';
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
import { SecondaryButtonExternalLink } from '~/components/SecondaryButton';
import { prisma } from '~/db.server';
import { getValidatedId, hasSuccess, processBadRequest, stringifyZodError } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EXCEL_TABLE_COLUMNS, ExcelRowSchema } from '~/models/excel';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { logParseError } from '~/models/logger.server';
import { requireUserId } from '~/session.server';

export const loader = async ({ request, params }: LoaderArgs) => {
  await requireUserId(request);
  const plotId = getValidatedId(params.plotId);
  const tenants = await prisma.tenant.findMany({
    where: { plotId },
    select: { id: true, name: true },
  });
  return json({ plotId, tenants });
};

const Schema = z.object({
  rows: z.preprocess((arg) => {
    try {
      if (typeof arg === 'string') {
        return JSON.parse(arg);
      }
    } catch (error) {
      return undefined;
    }
  }, ExcelRowSchema.array()),
});

export async function action({ request, params }: ActionArgs) {
  await requireUserId(request);
  const plotId = getValidatedId(params.plotId);
  const fields = await getRawFormFields(request);
  const result = Schema.safeParse(fields);
  if (!result.success) {
    logParseError(request, result.error, fields);
    return processBadRequest(result.error, fields);
  }
  const { rows } = result.data;

  let numImported = 0;
  for (let row of rows) {
    const [tenantName, propertyType, area, startDate, endDate, grossMonthly, escalation] = row;

    // const numDuplicates = await prisma.tenant.count({
    //   where: { plotId, name: tenantName },
    // });
    // if (numDuplicates) {
    //   continue;
    // }

    const propertyTypeId = await (async () => {
      const record = await prisma.propertyType.findFirst({
        select: { id: true },
        where: { identifier: propertyType },
      });
      if (record) {
        return record.id;
      }
      const { id } = await prisma.propertyType.create({
        data: { identifier: propertyType },
      });
      return id;
    })();

    await prisma.tenant.create({
      select: { id: true },
      data: {
        plotId,
        name: tenantName,
        termOfLease: '',
        propertyTypeId,
        areaPerClient: area,
        areaPerMarket: 1,
        startDate,
        endDate,
        grossMonthlyRental: grossMonthly,
        escalation,
        grossRatePerValuer: 1,
      },
    });
    numImported++;
  }

  return json({ success: true, numImported });
}

export default function ImportFromExcelPage() {
  const { plotId } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  type CustomRow = readonly [string, string, number, string, string, number, number];

  const [rows, setRows] = useState<(CustomRow | Error)[]>([]);
  // const [rows, setRows] = useState<(ParsedExcelRow | Error)[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      toast.success('Imported tenant records successfully');
      // navigate(AppLinks.PlotValuations(plotId));
    }
  }, [fetcher.data, navigate, plotId]);

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
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
      const namedColumns = EXCEL_TABLE_COLUMNS.map(([columnName, _]) => {
        const match = headingRow.find((cell) => cell === columnName);
        if (!match) {
          return { index: undefined, columnName };
        }
        return { index: headingRow.indexOf(match), columnName };
      });
      console.log('namedColumns', namedColumns);
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
      console.log('orderedRows', orderedRows);
      const parsedRows = orderedRows.map((row) => {
        const result = ExcelRowSchema.safeParse(row);
        if (!result.success) {
          console.log(row);
          console.log(result.error.flatten());
          return new Error(stringifyZodError(result.error));
        }
        // const duplicate = tenants.some(
        //   (tenant) => tenant.name === result.data[0],
        // );
        // if (duplicate) {
        //   return new Error('Duplicate tenant found');
        // }
        const startDate = result.data[3];
        const endDate = result.data[4];
        return [
          result.data[0],
          result.data[1],
          result.data[2],
          dayjs(startDate).format('DD-MM-YYYY'),
          dayjs(endDate).format('DD-MM-YYYY'),
          result.data[5],
          result.data[6],
        ] as const;
        // return result.data;
      });
      setRows(parsedRows);
    } catch (error) {
      console.log(error);
      return setError(getErrorMessage(error) || 'Something went wrong reading excel file, please try again');
    }
  }, []);

  const ImportedSchema = z.object({
    numImported: z.number(),
  });
  function hasImported(data: unknown): data is z.infer<typeof ImportedSchema> {
    return ImportedSchema.safeParse(data).success;
  }

  const numImported = hasImported(fetcher.data) ? fetcher.data.numImported : 0;

  return (
    <Card>
      <div className="flex flex-row items-center justify-start gap-4 border-b border-b-stone-200 px-4 py-2">
        <div className="flex flex-col items-start justify-center">
          <h2 className="text-lg font-semibold">Import From Excel</h2>
          {!!error && <InlineAlert>{error}</InlineAlert>}
        </div>
        {!!numImported && <span className="text-sm font-light text-stone-600">{numImported} tenant records imported successfully</span>}
        <div className="grow" />
        {!!rows.filter((row) => !(row instanceof Error)).length && (
          <fetcher.Form method="post">
            <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
              <input type="hidden" {...getNameProp('rows')} value={JSON.stringify(rows.filter((row) => !(row instanceof Error)))} />
              <PrimaryButton type="submit" className="bg-teal-600 hover:bg-teal-800 focus:bg-teal-800">
                <div className="flex flex-row items-center gap-4">
                  <Check className="text-white" size={18} />
                  <span>Import The Tenants Below</span>
                </div>
              </PrimaryButton>
            </ActionContextProvider>
          </fetcher.Form>
        )}
        <label htmlFor="excelFile">
          <InputFileLabel />
        </label>
        <input type="file" id="excelFile" accept=".xlsx, .xls" onChange={handleFileChange} disabled={false} className="top-0, invisible absolute left-0" />
        <SecondaryButtonExternalLink href={AppLinks.BackupTenants(plotId)} target="_blank" rel="noopener noreferrer">
          Download Template
        </SecondaryButtonExternalLink>
      </div>
      <div className="flex flex-col items-stretch justify-center overflow-auto p-4 shadow-inner">
        <table className="table-auto border-collapse text-left">
          <thead className="divide-y rounded border border-stone-200">
            <tr className="divide-x border border-stone-200">
              {EXCEL_TABLE_COLUMNS.map(([col, _], index) => (
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
                  {EXCEL_TABLE_COLUMNS.map((_, index) => (
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
