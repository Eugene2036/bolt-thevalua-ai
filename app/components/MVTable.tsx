import type { ComponentProps } from 'react';
import type { RowMV } from '~/models/core.validations';

import { Plus, X } from 'tabler-icons-react';

import { GridHeading } from './GridHeading';
import { MVRow } from './MVRow';
import { SecondaryButton } from './SecondaryButton';

interface Props {
  records: (RowMV & { index: number; err?: string })[];
  addRow: () => void;
  deleteRow: ComponentProps<typeof MVRow>['deleteRow'];
}
export function MVTable(props: Props) {
  const { records, addRow, deleteRow } = props;

  return (
    <div className="flex flex-col items-stretch">
      <div className="flex flex-row items-stretch">
        <div className="grow grid grid-cols-5">
          <GridHeading>Plot</GridHeading>
          <GridHeading className="text-end">Size (sqm)</GridHeading>
          <GridHeading className="text-end">Date</GridHeading>
          <GridHeading className="text-end">Location</GridHeading>
          <GridHeading className="text-end">Price</GridHeading>
        </div>
        <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
          <SecondaryButton isIcon disabled className="invisible">
            <X size={16} />
          </SecondaryButton>
        </div>
      </div>
      {records.map((record) => (
        <MVRow key={record.index} {...record} recordId={record.id} deleteRow={deleteRow} />
      ))}
      <div className="flex flex-col items-end py-2">
        <SecondaryButton type="button" onClick={addRow} className="flex flex-row items-center gap-2">
          <Plus className="text-teal-600" />
          Add Row
        </SecondaryButton>
      </div>
    </div>
  );
}
