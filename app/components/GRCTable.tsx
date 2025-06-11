import type { ComponentProps } from 'react';
import type { RowGrc } from '~/models/core.validations';
import { Plus, X } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';
import { formatAmount } from '~/models/core.validations';
import { useDisabled } from './ActionContextProvider';
import { GrcRow } from './GrcRow';
import { GridCell } from './GridCell';
import { GridHeading } from './GridHeading';
import { SecondaryButton } from './SecondaryButton';

interface Props {
  bulls: (RowGrc & {
    index: number;
    err?: string;
  })[];
  addBull: () => void;
  deleteRow: ComponentProps<typeof GrcRow>['deleteRow'];

  normals: (RowGrc & {
    index: number;
    err?: string;
  })[];
  addNormal: () => void;

  openCalcDialog: (grcId: string, index: number) => void;
}
export function GrcTable(props: Props) {
  const { bulls, addBull, normals, addNormal, deleteRow, openCalcDialog } = props;

  const total = [...bulls, ...normals].reduce((acc, record) => acc + (record.rate || 0) * (record.size || 0), 0);

  const disabled = useDisabled();

  return (
    <div className="flex flex-col items-stretch">
      <div className="flex flex-row items-stretch">
        <div className="grow grid grid-cols-5">
          <GridHeading>Developments</GridHeading>
          <GridHeading className="text-end">Size</GridHeading>
          <GridHeading className="text-end">Unit</GridHeading>
          <GridHeading className="text-end">Rate</GridHeading>
          <GridHeading className="text-end">Total</GridHeading>
        </div>
        <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
          <SecondaryButton isIcon disabled className="invisible">
            <X size={16} />
          </SecondaryButton>
        </div>
      </div>
      {bulls.map((record, index) => (
        <GrcRow key={index} {...record} recordId={record.id} deleteRow={deleteRow} err={record.err} openCalcDialog={openCalcDialog} />
      ))}
      <div className="flex flex-col items-end py-2">
        <SecondaryButton type="button" onClick={addBull} disabled={disabled} className="flex flex-row items-center gap-2">
          <Plus className={twMerge('text-teal-600', disabled && 'text-stone-400')} />
          Add Row
        </SecondaryButton>
      </div>
      <div className="flex flex-row items-stretch">
        <div className="grow grid grid-cols-5">
          <GridHeading>Improvements</GridHeading>
          <GridHeading className="text-end">Size</GridHeading>
          <GridHeading className="text-end">Unit</GridHeading>
          <GridHeading className="text-end">Rate</GridHeading>
          <GridHeading className="text-end">Total</GridHeading>
        </div>
        <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
          <SecondaryButton isIcon disabled className="invisible">
            <X size={16} />
          </SecondaryButton>
        </div>
      </div>
      {normals.map((record, index) => (
        <GrcRow key={index} {...record} recordId={record.id} deleteRow={deleteRow} err={record.err} openCalcDialog={openCalcDialog} />
      ))}
      <div className="flex flex-col items-end py-2">
        <SecondaryButton type="button" onClick={addNormal} disabled={disabled} className="flex flex-row items-center gap-2">
          <Plus className={twMerge('text-teal-600', disabled && 'text-stone-400')} />
          Add Row
        </SecondaryButton>
      </div>
      <div className="flex flex-row items-stretch">
        <div className="flex flex-col items-stretch grow">
          <div className="grid grid-cols-5">
            <GridCell className="col-span-4 flex flex-col justify-center items-end">
              <span className="text-end">Replacement Cost:</span>
            </GridCell>
            <GridCell className="text-end py-4">
              <span className="font-semibold px-2">{formatAmount(total)}</span>
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
