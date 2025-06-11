import type { RowParking } from '~/models/core.validations';

import { X } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';

import { formatAmount, getStateId } from '~/models/core.validations';

import { useDisabled } from './ActionContextProvider';
import { FormSelect } from './FormSelect';
import { FormTextField } from './FormTextField';
import { GridCell } from './GridCell';
import { SecondaryButton } from './SecondaryButton';
import { TextField } from './TextField';

interface Props extends RowParking {
  index: number;
  parkingId: string;
  parkingTypes: { id: string; identifier: string }[];
  deleteRow: (index: number) => void;
  err?: string;
}
export function ParkingRow(props: Props) {
  const { index, parkingId, parkingTypeId, unitPerClient, ratePerClient, parkingTypes, deleteRow, err } = props;

  const total = ratePerClient * unitPerClient;

  const disabled = useDisabled();

  return (
    <div className="flex flex-col items-stretch">
      <div className="flex flex-row items-stretch">
        <input type="hidden" name="id" value={parkingId || ''} />
        <div className="grid grid-cols-4 grow">
          <GridCell>
            <FormSelect name={getStateId(['parking', index, 'parkingTypeId'])} defaultValue={parkingTypeId} isCamo required>
              <option value="">Select Parking Type</option>
              {parkingTypes.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.identifier}
                </option>
              ))}
            </FormSelect>
          </GridCell>
          <GridCell>
            <FormTextField name={getStateId(['parking', index, 'unitPerClient'])} defaultValue={unitPerClient} type="number" className="text-end" step={0.01} isCamo required />
          </GridCell>
          <GridCell>
            <FormTextField name={getStateId(['parking', index, 'ratePerClient'])} defaultValue={ratePerClient} type="number" className="text-end" step={0.01} isCamo required />
          </GridCell>
          <GridCell className="flex flex-col items-stretch">
            <TextField value={formatAmount(total) || '0'} className="text-end" disabled={true} isCamo required />
          </GridCell>
          <input type="submit" className="invisible absolute top-0" />
        </div>
        <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
          <SecondaryButton type="button" isIcon title="Delete" className="bg-transparent" onClick={() => deleteRow(index)} disabled={disabled}>
            <X className={twMerge('text-red-600', disabled && 'text-stone-400')} size={16} />
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
