import type { ComponentProps } from 'react';
import type { RowOutgoing } from '~/models/core.validations';
import { Plus, X } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';
import { formatAmount } from '~/models/core.validations';
import { useDisabled } from './ActionContextProvider';
import { GridCell } from './GridCell';
import { GridHeading } from './GridHeading';
import { OutgoingRow } from './OutgoingRow';
import { SecondaryButton } from './SecondaryButton';

interface Props {
  records: (RowOutgoing & {
    id: string;
    itemType?: string | undefined;
    index: number;
    err?: string;
  })[];
  annualOutgoings: number;
  outgoingsPerMonth: number;
  addRow: () => void;
  deleteRow: ComponentProps<typeof OutgoingRow>['deleteRow'];
  addStandardOutgoings: () => void;
}
export function EditableOutgoingsTable(props: Props) {
  const { records, annualOutgoings, outgoingsPerMonth, addRow, deleteRow, addStandardOutgoings } = props;

  const disabled = useDisabled();

  return (
    <div className="flex flex-col items-stretch">
      <div className="flex flex-row items-stretch">
        <div className="grow grid grid-cols-4">
          <GridHeading>Item</GridHeading>
          <GridHeading className="text-end">Amount</GridHeading>
          <GridHeading className="text-end">Rate</GridHeading>
          <GridHeading className="text-end">Total</GridHeading>
        </div>
        <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
          <SecondaryButton isIcon disabled className="invisible">
            <X size={16} />
          </SecondaryButton>
        </div>
      </div>
      {records.map((outgoing, index) => (
        <OutgoingRow key={index} {...outgoing} outgoingId={outgoing.id} deleteRow={deleteRow} err={outgoing.err} />
      ))}
      <div className="flex flex-row items-center justify-end py-2 gap-2">
        <SecondaryButton type="button" onClick={addStandardOutgoings} disabled={disabled} className="flex flex-row items-center gap-2">
          <Plus className={twMerge('text-teal-600', disabled && 'text-stone-400')} />
          Add Standard Outgoings
        </SecondaryButton>
        <SecondaryButton type="button" onClick={addRow} disabled={disabled} className="flex flex-row items-center gap-2">
          <Plus className={twMerge('text-teal-600', disabled && 'text-stone-400')} />
          Add Outgoing
        </SecondaryButton>
      </div>
      <div className="flex flex-row items-stretch">
        <div className="flex flex-col items-stretch grow">
          <div className="grid grid-cols-4">
            <GridCell className="col-span-3 flex flex-col justify-center items-end">
              <span className="text-end">Annual Outgoings:</span>
            </GridCell>
            <GridCell className="text-end py-4">
              <span className="font-semibold px-2">{formatAmount(annualOutgoings)}</span>
            </GridCell>
          </div>
          <div className="grid grid-cols-4">
            <GridCell className="col-span-3 flex flex-col justify-center items-end">
              <span className="text-end">Outgoings per rentable m² per month:</span>
            </GridCell>
            <GridCell className="text-end py-4">
              <span className="font-semibold px-2">{formatAmount(outgoingsPerMonth)}/m²</span>
            </GridCell>
          </div>
        </div>
        <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
          <SecondaryButton isIcon disabled className="invisible">
            <X size={16} />
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}
