import type { RowOutgoing } from '~/models/core.validations';

import { X } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';

import { formatAmount, getStateId } from '~/models/core.validations';

import { useDisabled } from './ActionContextProvider';
import { FormTextField } from './FormTextField';
import { GridCell } from './GridCell';
import { SecondaryButton } from './SecondaryButton';
import { TextField } from './TextField';

interface Props extends RowOutgoing {
  index: number;
  outgoingId: string;
  itemType?: string | undefined;
  deleteRow: (index: number) => void;
  err?: string;
}
export function OutgoingRow(props: Props) {
  const { outgoingId, identifier, unitPerClient, ratePerClient, itemType, index, deleteRow, err } = props;

  const calcTotal = (unit: number, rate: number, itemType: string | undefined) => {
    const effectiveRate = itemType === '%' ? rate * 0.01 : rate;
    return effectiveRate * unit;
  };

  const total = calcTotal(unitPerClient, ratePerClient, itemType);

  const disabled = ['Maintenance and Repairs', 'Insurance', 'Management Fee'].includes(identifier);

  const cantEdit = useDisabled();

  return (
    <div className="flex flex-col items-stretch">
      <div className="flex flex-row items-stretch">
        <input type="hidden" name="id" value={outgoingId || ''} />
        <div className="grid grid-cols-4 grow">
          <GridCell>
            <FormTextField name={getStateId(['outgoing', index, 'identifier'])} defaultValue={identifier} disabled={disabled} isCamo required />
          </GridCell>
          <GridCell>
            {!!disabled && (
              <>
                <input type="hidden" name={getStateId(['outgoing', index, 'unitPerClient'])} value={unitPerClient} />
                <span className="text-sm font-light text-end px-2">{formatAmount(unitPerClient, 2)}</span>
              </>
            )}
            {!disabled && (
              <FormTextField name={getStateId(['outgoing', index, 'unitPerClient'])} defaultValue={unitPerClient} type="number" className="text-end" step={0.01} isCamo required />
            )}
          </GridCell>
          <GridCell>
            <div className="flex flex-row items-stretch gap-1">
              <div className="flex flex-col items-stretch grow">
                <FormTextField
                  name={getStateId(['outgoing', index, 'ratePerClient'])}
                  defaultValue={ratePerClient}
                  type="number"
                  className="text-end"
                  step={0.01}
                  isCamo
                  required
                />
              </div>
              {itemType === '%' && (
                <div className="flex flex-col justify-center items-center">
                  <span className="text-lg font-light">%</span>
                </div>
              )}
            </div>
          </GridCell>
          <GridCell className="flex flex-col items-stretch">
            <TextField value={formatAmount(total, 2) || '0'} className="text-end" disabled={true} isCamo required />
          </GridCell>
        </div>
        <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
          <SecondaryButton type="button" isIcon title="Delete" className="bg-transparent" disabled={cantEdit} onClick={() => deleteRow(index)}>
            <X className={twMerge('text-red-600', cantEdit && 'text-stone-400')} size={16} />
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
