import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { YearRangeData } from '~/models/construction.schema';
import type { WithIndexAndError } from '~/models/core.validations';

import { json } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { CenteredView } from '~/components/CenteredView';
import { FormTextField } from '~/components/FormTextField';
import { GridCell } from '~/components/GridCell';
import { GridHeading } from '~/components/GridHeading';
import { PrimaryButton } from '~/components/PrimaryButton';
import SavePanel from '~/components/SavePanel';
import { Toolbar } from '~/components/Toolbar';
import { prisma } from '~/db.server';
import { UpdateRangeValuesSchema } from '~/models/construction.schema';
import { getYearRangeValues } from '~/models/construction.server';
import { CalculatorKind, YearRange } from '~/models/construction.types';
import { badRequest, createStateUpdater, getQueryParams, getStateId, hasSuccess, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields } from '~/models/forms';
import { requireUserId } from '~/session.server';
import { useUser } from '~/utils';

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);

  const { kind } = getQueryParams(request.url, ['kind']);
  const values = await getYearRangeValues(kind);

  return json({ kind, values });
}

const Schema = UpdateRangeValuesSchema.merge(z.object({ kind: z.string().optional().nullable() }));
export async function action({ request }: ActionArgs) {
  await requireUserId(request);
  try {
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { rangeValues, kind } = result.data;

    await prisma.$transaction(async (tx) => {
      const currentRecords = await tx.yearRangeValue.findMany({
        where: { kind: kind || null },
      });
      const itemsToDelete = currentRecords.filter((r) => {
        return rangeValues.every((v) => v.identifier !== r.identifier);
      });
      for (let item of itemsToDelete) {
        await tx.yearRangeValue.delete({
          where: { id: item.id },
        });
      }

      const newItems = rangeValues.filter((v) => {
        return currentRecords.every((r) => r.identifier !== v.identifier);
      });
      for (let item of newItems) {
        await tx.yearRangeValue.create({
          data: {
            identifier: item.identifier,
            first: item.first,
            second: item.second,
            third: item.third,
            kind: kind || CalculatorKind.Residential_SS_up_to_100m2,
          },
        });
      }

      const existingItems = rangeValues
        .map((v) => {
          const match = currentRecords.find((r) => r.identifier === v.identifier);
          if (!match) {
            return undefined;
          }
          return { id: match.id, ...v };
        })
        .filter(Boolean);
      for (let item of existingItems) {
        await tx.yearRangeValue.update({
          where: { id: item.id },
          data: {
            first: item.first,
            second: item.second,
            third: item.third,
          },
        });
      }
    });

    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}

export default function ManageYearRangeValues() {
  const currentUser = useUser();
  const { kind, values: data } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      toast.success('Changes saved');
    }
  }, [fetcher.data]);

  const [values, setValues] = useState<WithIndexAndError<YearRangeData>[]>(data.map((r, index) => ({ ...r, index })));

  const updateState = createStateUpdater(
    [] as const,
    [
      ['record', 'identifier', z.string(), setValues],
      ['record', 'first', z.literal('').or(z.coerce.number()), setValues],
      ['record', 'second', z.literal('').or(z.coerce.number()), setValues],
      ['record', 'third', z.literal('').or(z.coerce.number()), setValues],
    ] as const,
  );

  return (
    <div className="flex h-screen flex-col items-stretch">
      <Toolbar currentUserName={currentUser.email} isSuper={currentUser.isSuper} isBanker={currentUser.isBanker} isSignatory={currentUser.isSignatory} />
      <div className="flex grow flex-row items-stretch pt-6 overflow-auto">
        <CenteredView className="w-full" innerProps={{ className: twMerge('h-full') }}>
          <div className="flex flex-col items-start py-4">
            <span className="text-lg">{kind || CalculatorKind.Residential_SS_up_to_100m2}</span>
          </div>
          <div className="flex flex-row items-stretch gap-2 overflow-y-auto">
            <fetcher.Form method="post" className="flex flex-col items-stretch border border-stone-200 rounded-md">
              <ActionContextProvider {...fetcher.data} updateState={updateState} isSubmitting={isProcessing}>
                <div className="flex flex-col items-stretch mb-24">
                  <div className="grid grid-cols-4">
                    <GridHeading>Option</GridHeading>
                    <GridHeading>{YearRange.Third}</GridHeading>
                    <GridHeading>{YearRange.Second}</GridHeading>
                    <GridHeading>{YearRange.First}</GridHeading>
                  </div>
                  {values.map((value, index) => (
                    <div key={index} className="grid grid-cols-4">
                      <GridCell>
                        <span className="text-xs">{value.identifier}</span>
                      </GridCell>
                      <GridCell>
                        <FormTextField name={getStateId(['record', index, 'third'])} defaultValue={value.third} type="number" className="text-end" isCamo required />
                      </GridCell>
                      <GridCell>
                        <FormTextField name={getStateId(['record', index, 'second'])} defaultValue={value.second} type="number" className="text-end" isCamo required />
                      </GridCell>
                      <GridCell>
                        <FormTextField name={getStateId(['record', index, 'first'])} defaultValue={value.first} type="number" className="text-end" isCamo required />
                      </GridCell>
                    </div>
                  ))}
                </div>
                <SavePanel>
                  <input type="hidden" {...getNameProp('rangeValues')} value={JSON.stringify(values)} />
                  <input type="hidden" {...getNameProp('kind')} value={kind || ''} />
                  <div className="flex flex-col items-start">
                    <PrimaryButton type="submit" disabled={isProcessing}>
                      Save Changes
                    </PrimaryButton>
                  </div>
                </SavePanel>
              </ActionContextProvider>
            </fetcher.Form>
          </div>
        </CenteredView>
      </div>
    </div>
  );
}
