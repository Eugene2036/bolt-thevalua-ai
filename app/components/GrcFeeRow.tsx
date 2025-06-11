import type { RowGrcFee } from '~/models/core.validations';

import { formatAmount, getStateId } from '~/models/core.validations';

import { FormTextField } from './FormTextField';
import { GridCell } from './GridCell';
import { TextField } from './TextField';

interface Props extends RowGrcFee {
  index: number;
  recordId: string;
  grcTotal: number;
  err?: string;
}
export function GrcFeeRow(props: Props) {
  const { index, recordId, identifier, perc, grcTotal, err } = props;

  const total = grcTotal * (perc || 0) * 0.01;

  return (
    <div className="flex flex-col items-stretch">
      <div className="flex flex-row items-stretch">
        <div className="grid grid-cols-3 grow">
          <input type="hidden" name="id" value={recordId} />
          <GridCell>
            <FormTextField name={getStateId(['grcFee', index, 'identifier'])} defaultValue={identifier} isCamo required />
          </GridCell>
          <GridCell>
            <div className="flex flex-row items-center gap-2">
              <div className="flex flex-col items-stretch grow">
                <FormTextField name={getStateId(['grcFee', index, 'perc'])} defaultValue={perc} type="number" className="text-end" step={0.01} isCamo required />
              </div>
              <span className="text-lg font-light">%</span>
            </div>
          </GridCell>
          <GridCell className="flex flex-col items-stretch">
            <TextField value={formatAmount(total) || '0'} className="text-end" disabled={true} isCamo required />
          </GridCell>
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
