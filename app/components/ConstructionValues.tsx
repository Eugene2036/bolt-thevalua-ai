import type { FormEvent } from 'react';
import type { YearRangeData } from '~/models/construction.schema';
import type { WithIndexAndError } from '~/models/core.validations';
import type { action } from '~/routes/update-range-values';

import { Menu, Transition } from '@headlessui/react';
import { useFetcher } from '@remix-run/react';
import { Fragment, useState } from 'react';
import { DotsVertical } from 'tabler-icons-react';
import { z } from 'zod';

import { UpdateRangeValuesSchema } from '~/models/construction.schema';
import { YearRange } from '~/models/construction.types';
import { createStateUpdater, getStateId } from '~/models/core.validations';

import { ActionContextProvider, useForm } from './ActionContextProvider';
import { FormTextField } from './FormTextField';
import { TableCell } from './TableCell';
import { TableHeading } from './TableHeading';

interface Props {
  data: YearRangeData[];
}
export function ConstructionValues(props: Props) {
  const { data } = props;

  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, UpdateRangeValuesSchema);

  const [values, setValues] = useState<WithIndexAndError<YearRangeData>[]>(data.map((r, index) => ({ ...r, index })));

  const updateState = createStateUpdater(
    [] as const,
    [
      ['record', 'identifier', z.string(), setValues],
      ['record', 'first', z.coerce.number(), setValues],
      ['record', 'second', z.coerce.number(), setValues],
      ['record', 'third', z.coerce.number(), setValues],
    ] as const,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    fetcher.submit(event.currentTarget);
  }

  return (
    <div className="relative">
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button type="button" className="rounded p-2 transition-all duration-300 hover:bg-stone-100 flex flex-row items-center gap-2">
            <span className="text-sm">Options</span>
            <DotsVertical data-testid="menu" size={16} />
          </Menu.Button>
        </div>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <fetcher.Form
            method="post"
            onSubmit={handleSubmit}
            className="absolute right-0 z-50 mt-2 w-[500px] origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none p-1"
          >
            <ActionContextProvider {...fetcher.data} updateState={updateState} isSubmitting={isProcessing}>
              <input type="hidden" {...getNameProp('rangeValues')} value={JSON.stringify(values)} />
              <table>
                <thead>
                  <tr>
                    <TableHeading>Option</TableHeading>
                    <TableHeading>{YearRange.Third}</TableHeading>
                    <TableHeading>{YearRange.Second}</TableHeading>
                    <TableHeading>{YearRange.First}</TableHeading>
                  </tr>
                </thead>
                <tbody>
                  {values.map((value, index) => (
                    <tr key={index}>
                      <TableCell>
                        <span>{value.identifier}</span>
                      </TableCell>
                      <TableCell>
                        <FormTextField name={getStateId(['record', index, 'third'])} defaultValue={value.third} type="number" className="text-end" isCamo required />
                      </TableCell>
                      <TableCell>
                        <FormTextField name={getStateId(['record', index, 'second'])} defaultValue={value.second} type="number" className="text-end" isCamo required />
                      </TableCell>
                      <TableCell>
                        <FormTextField name={getStateId(['record', index, 'first'])} defaultValue={value.first} type="number" className="text-end" isCamo required />
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ActionContextProvider>
          </fetcher.Form>
        </Transition>
      </Menu>
    </div>
  );
}
