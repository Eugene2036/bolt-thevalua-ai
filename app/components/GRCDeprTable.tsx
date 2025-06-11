import type { ComponentProps } from 'react';
import type { RowGrcDepr } from '~/models/core.validations';
import { Plus, X } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';
import { formatAmount } from '~/models/core.validations';
import { useDisabled } from './ActionContextProvider';
import { GrcDeprRow } from './GrcDeprRow';
import { GridCell } from './GridCell';
import { GridHeading } from './GridHeading';
import { SecondaryButton } from './SecondaryButton';

interface Props {
  grcTotal: number;
  netTotal: number;
  records: (RowGrcDepr & { index: number; err?: string })[];
  addRow: () => void;
  deleteRow: ComponentProps<typeof GrcDeprRow>['deleteRow'];
}
export function GrcDeprsTable(props: Props) {
  const { records, grcTotal, netTotal, addRow, deleteRow } = props;

  const total =
    netTotal -
    records.reduce((acc, record) => {
      const rowTotal = (record.perc || 0) * 0.01 * grcTotal;
      return acc + rowTotal;
    }, 0);
  console.log('depr total', total);

  const disabled = useDisabled();

  return (
    <div className="flex flex-col items-stretch">
      <div className="flex flex-row items-stretch">
        <div className="grow grid grid-cols-3">
          <GridHeading>Details</GridHeading>
          <GridHeading className="text-end">Percentage</GridHeading>
          <GridHeading className="text-end">Total</GridHeading>
        </div>
        <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
          <SecondaryButton isIcon disabled className="invisible">
            <X size={16} />
          </SecondaryButton>
        </div>
      </div>
      {records.map((record, index) => (
        <GrcDeprRow key={index} {...record} recordId={record.id} grcTotal={grcTotal} deleteRow={deleteRow} />
      ))}
      <div className="flex flex-col items-end py-2">
        <SecondaryButton type="button" onClick={addRow} disabled={disabled} className="flex flex-row items-center gap-2">
          <Plus className={twMerge('text-teal-600', disabled && 'text-stone-400')} />
          Add Row
        </SecondaryButton>
      </div>
      <div className="flex flex-row items-stretch">
        <div className="flex flex-col items-stretch grow">
          <div className="grid grid-cols-4 grow">
            <GridCell className="col-span-2 flex flex-col justify-center items-end">
              <span className="text-end font-semibold text-sm">Depreciated Replacement Cost</span>
            </GridCell>
            <GridCell className="col-span-2 flex flex-col justify-center items-end">
              <span className="text-end font-semibold text-sm">Gross Replacement Cost</span>
            </GridCell>
          </div>
        </div>
        <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
          <SecondaryButton isIcon disabled className="invisible">
            <X size={16} />
          </SecondaryButton>
        </div>
      </div>
      <div className="flex flex-row items-stretch">
        <div className="flex flex-col items-stretch grow">
          <div className="grid grid-cols-4">
            <GridCell className="col-span-2 text-end py-4">
              <span className="font-light px-2">{formatAmount(total)}</span>
            </GridCell>
            <GridCell className="col-span-2 text-end py-4">
              <span className="font-light px-2">{formatAmount(netTotal)}</span>
            </GridCell>
          </div>
        </div>
        <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
          <SecondaryButton isIcon disabled className="invisible">
            <X size={16} />
          </SecondaryButton>
        </div>
      </div>
      {/* <div className="flex flex-row items-stretch">
        <div className="flex flex-col items-stretch grow">
          <div className="grid grid-cols-4">
            <GridCell className="col-span-3 flex flex-col justify-center items-end">
              <span className="text-end">Say:</span>
            </GridCell>
            <GridCell className="text-end py-4">
              <span className="font-semibold px-2">{formatAmount(say)}</span>
            </GridCell>
          </div>
        </div>
        <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
          <SecondaryButton isIcon disabled className="invisible">
            <X size={16} />
          </SecondaryButton>
        </div>
      </div> */}
    </div>
  );
}
