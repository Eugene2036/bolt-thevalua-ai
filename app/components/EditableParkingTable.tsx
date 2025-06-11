import type { ComponentProps } from 'react';
import type { RowParking } from '~/models/core.validations';
import { Plus, X } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';
import { formatAmount } from '~/models/core.validations';
import { useDisabled } from './ActionContextProvider';
import { GridCell } from './GridCell';
import { GridHeading } from './GridHeading';
import { ParkingRow } from './ParkingRow';
import { SecondaryButton } from './SecondaryButton';

interface Props {
  records: (RowParking & { index: number; err?: string })[];
  totalParking: number;
  grossRentalMonthly: number;
  grossRentalAnnual: number;
  parkingTypes: { id: string; identifier: string }[];
  addRow: () => void;
  deleteRow: ComponentProps<typeof ParkingRow>['deleteRow'];
}
export function EditableParkingTable(props: Props) {
  const { records, parkingTypes, totalParking, grossRentalMonthly, grossRentalAnnual, addRow, deleteRow } = props;

  const disabled = useDisabled();

  return (
    <div className="flex flex-col items-stretch">
      <div className="flex flex-row items-stretch">
        <div className="grow grid grid-cols-4">
          <GridHeading>Type</GridHeading>
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
      {records.map((parking) => (
        <ParkingRow key={parking.index} {...parking} index={parking.index} parkingId={parking.id} parkingTypes={parkingTypes} deleteRow={deleteRow} err={parking.err} />
      ))}
      <div className="flex flex-col items-end py-2">
        <SecondaryButton type="button" onClick={addRow} disabled={disabled} className="flex flex-row items-center gap-2">
          <Plus className={twMerge('text-teal-600', disabled && 'text-stone-400')} />
          Add Income Record
        </SecondaryButton>
        {/* cdjncdc */}
      </div>
      <div className="flex flex-row items-stretch">
        <div className="flex flex-col items-stretch grow">
          <div className="grid grid-cols-4">
            <GridCell className="col-span-3 flex flex-col justify-center items-end">
              <span className="text-end">Total Other Income:</span>
            </GridCell>
            <GridCell className="text-end py-4">
              <span className="font-semibold px-2">{formatAmount(totalParking)}</span>
            </GridCell>
          </div>
          <div className="grid grid-cols-4">
            <GridCell className="col-span-3 flex flex-col justify-center items-end">
              <span className="text-end">Monthly Gross:</span>
            </GridCell>
            <GridCell className="text-end py-4">
              <span className="font-semibold px-2">{formatAmount(grossRentalMonthly)}</span>
            </GridCell>
          </div>
          <div className="grid grid-cols-4">
            <GridCell className="col-span-3 flex flex-col justify-center items-end">
              <span className="text-end">Annual Gross:</span>
            </GridCell>
            <GridCell className="text-end py-4">
              <span className="font-semibold px-2">{formatAmount(grossRentalAnnual)}</span>
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
