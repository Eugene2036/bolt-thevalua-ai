import type { RowMV } from '~/models/core.validations';

import dayjs from 'dayjs';
import { X } from 'tabler-icons-react';

import { getStateId } from '~/models/core.validations';
import { DATE_INPUT_FORMAT } from '~/models/dates';

import { FormTextField } from './FormTextField';
import { GridCell } from './GridCell';
import { SecondaryButton } from './SecondaryButton';

interface Props extends RowMV {
  index: number;
  recordId: string;
  deleteRow: (index: number) => void;
  err?: string;
}
export function MVRow(props: Props) {
  const { index, recordId, identifier, size, date, location, price, deleteRow, err } = props;

  return (
    <div className="flex flex-col items-stretch">
      <div className="flex flex-row items-stretch">
        <input type="hidden" name="id" value={recordId} />
        <div className="grid grid-cols-5 grow">
          <GridCell>
            <FormTextField name={getStateId(['mv', index, 'identifier'])} defaultValue={identifier} isCamo required />
          </GridCell>
          <GridCell>
            <FormTextField name={getStateId(['mv', index, 'size'])} defaultValue={size} type="number" className="text-end" step={0.01} isCamo required />
          </GridCell>
          <GridCell>
            <FormTextField name={getStateId(['mv', index, 'date'])} defaultValue={dayjs(date).format(DATE_INPUT_FORMAT)} type="date" isCamo required />
          </GridCell>
          <GridCell>
            <FormTextField name={getStateId(['mv', index, 'location'])} defaultValue={location} isCamo required />
          </GridCell>
          <GridCell>
            <FormTextField name={getStateId(['mv', index, 'price'])} defaultValue={price} type="number" className="text-end" step={0.01} isCamo required />
          </GridCell>
        </div>
        <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
          <SecondaryButton type="button" isIcon title="Delete" className="bg-transparent" onClick={() => deleteRow(index)}>
            <X className="text-red-600" size={16} />
          </SecondaryButton>
        </div>
      </div>
      {err && (
        <div className="flex flex-col items-stretch border border-stone-200">
          <span className="text-red-600 text-xs p-2 pt-1 pb-3">{err}</span>
        </div>
      )}
    </div>
  );
}
