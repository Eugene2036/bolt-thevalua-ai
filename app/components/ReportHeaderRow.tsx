import type { RowOutgoing, RowReportHeader } from '~/models/core.validations';

import { X } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';

import { formatAmount, getStateId } from '~/models/core.validations';

import { useDisabled } from './ActionContextProvider';
import { FormTextField } from './FormTextField';
import { GridCell } from './GridCell';
import { SecondaryButton } from './SecondaryButton';
import { TextField } from './TextField';

interface Props extends RowReportHeader {
  index: number;
  headerId: string;
  itemType?: string | undefined;
  deleteRow: (index: number) => void;
  err?: string;
}
export function ReportHeaderRow(props: Props) {
  const { headerId, headerTitle, itemType, index, deleteRow, err } = props;

  const cantEdit = useDisabled();

  return (
    <div className="flex flex-col items-stretch">
      <div className="flex flex-row items-stretch">
        <input type="hidden" name="id" value={headerId || ''} />
        <div className="grid grid-cols-1 grow">
          <GridCell>
            <FormTextField name={getStateId(['ReportHeader', index, 'headerTitle'])} defaultValue={headerTitle} disabled isCamo required />
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
