import type { FormEvent } from 'react';
import type { WithIndexAndError } from '~/models/core.validations';
import type { action } from '~/routes/update-range-values';

import { useFetcher } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { UpdateRangeValuesSchema, type YearRangeData } from '~/models/construction.schema';
import { YearRange } from '~/models/construction.types';
import { createStateUpdater, getStateId, hasSuccess } from '~/models/core.validations';
import { AppLinks } from '~/models/links';

import { ActionContextProvider, useForm } from './ActionContextProvider';
import { FormTextField } from './FormTextField';
import { GridCell } from './GridCell';
import { GridHeading } from './GridHeading';
import { PrimaryButton } from './PrimaryButton';
import SavePanel from './SavePanel';

interface Props {
  data: YearRangeData[];
}
export function ConstructionValuesInline(props: Props) {
  const { data } = props;

  for (let item of data) {
    console.log(item.identifier, item.first);
  }

  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, UpdateRangeValuesSchema);

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    fetcher.submit(event.currentTarget);
  }

  return (
    <fetcher.Form method="post" action={AppLinks.UpdateRangeValues} onSubmit={handleSubmit} className="flex flex-col items-stretch shadow-2xl border border-stone-200 rounded-md">
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
          <div className="flex flex-col items-start">
            <PrimaryButton type="submit" disabled={isProcessing}>
              Save Changes
            </PrimaryButton>
          </div>
        </SavePanel>
      </ActionContextProvider>
    </fetcher.Form>
  );
}
