import type { RowGrcDepr } from '~/models/core.validations';
import { X } from 'tabler-icons-react';
import { formatAmount, getStateId } from '~/models/core.validations';
import { FormTextField } from './FormTextField';
import { GridCell } from './GridCell';
import { SecondaryButton } from './SecondaryButton';
import { TextField } from './TextField';

interface Props extends RowGrcDepr {
  index: number;
  recordId: string;
  grcTotal: number;
  deleteRow: (index: number) => void;
  err?: string;
}
export function GrcDeprRow(props: Props) {
  const { index, recordId, identifier, perc, grcTotal, deleteRow, err } = props;

  const total = grcTotal * (perc || 0) * 0.01;

  return (
    <div className="flex flex-col items-stretch">
      <div className="flex flex-row items-stretch">
        <input type="hidden" name="id" value={recordId} />
        <div className="grid grid-cols-3 grow">
          <GridCell>
            <FormTextField name={getStateId(['depr', index, 'identifier'])} defaultValue={identifier} isCamo required />
          </GridCell>
          <GridCell>
            <div className="flex flex-row items-center gap-2">
              <div className="flex flex-col items-stretch grow">
                <FormTextField name={getStateId(['depr', index, 'perc'])} defaultValue={perc} type="number" className="text-end" step={0.01} isCamo required />
              </div>
              <span className="text-lg font-light">%</span>
            </div>
          </GridCell>
          <GridCell className="flex flex-col items-stretch">
            <TextField value={formatAmount(total) || '0'} className="text-end" disabled={true} isCamo required />
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
