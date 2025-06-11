import type { RowGrc } from '~/models/core.validations';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { ChevronDown, X } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';

import { formatAmount, getStateId } from '~/models/core.validations';

import { useDisabled } from './ActionContextProvider';
import { FormSelect } from './FormSelect';
import { FormTextField } from './FormTextField';
import { GridCell } from './GridCell';
import { SecondaryButton } from './SecondaryButton';
import { TextField } from './TextField';

interface Props extends RowGrc {
  index: number;
  recordId: string;
  deleteRow: (index: number) => void;
  err?: string;

  openCalcDialog: (grcId: string, index: number) => void;
}
export function GrcRow(props: Props) {
  const { openCalcDialog, index, recordId, identifier, unit, rate, size, deleteRow, err, id } = props;

  const total = (rate || 0) * (size || 0);

  const disabled = useDisabled();

  useEffect(() => {
    if (err) {
      toast.error(err);
    }
  }, [err]);

  return (
    <div className="flex flex-col items-stretch">
      <div className="flex flex-row items-stretch">
        <input type="hidden" name="id" value={recordId} />
        <div className="grid grid-cols-5 grow">
          <GridCell>
            <FormTextField name={getStateId(['grc', index, 'identifier'])} defaultValue={identifier} isCamo required />
          </GridCell>
          <GridCell>
            <FormTextField name={getStateId(['grc', index, 'size'])} defaultValue={size} type="number" className="text-end" step={0.01} disabled={false} isCamo />
          </GridCell>
          <GridCell>
            <FormSelect name={getStateId(['grc', index, 'unit'])} defaultValue={unit} isCamo>
              <option value="SQM">SQM</option>
              <option value="Unit">Unit</option>
              <option value="M">M</option>
            </FormSelect>
          </GridCell>
          <GridCell>
            <button
              type="button"
              disabled={disabled}
              className={twMerge(
                'w-full transition-all duration-300 bg-white flex flex-row gap-2',
                'rounded-lg p-2 text-sm font-light outline-none',
                'border border-stone-400 hover:bg-stone-100 focus:bg-stone-100',
              )}
              onClick={() => openCalcDialog(id, index)}
            >
              <span>{formatAmount(rate || 0)}</span>
              <div className="grow" />
              <ChevronDown className="text-teal-600 ml-2 h-5 w-5 transition duration-150 ease-in-out group-hover:text-orange-300/80" aria-hidden="true" />
            </button>
            <input type="hidden" name={getStateId(['grc', index, 'rate'])} value={rate} />
          </GridCell>
          <GridCell className="flex flex-col items-stretch">
            <TextField value={formatAmount(total) || '0'} className="text-end" disabled={true} isCamo required />
          </GridCell>
        </div>
        <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
          <SecondaryButton type="button" isIcon title="Delete" className="bg-transparent" onClick={() => deleteRow(index)} disabled={disabled}>
            <X className={twMerge('text-red-600', disabled && 'text-stone-400')} size={16} />
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}
