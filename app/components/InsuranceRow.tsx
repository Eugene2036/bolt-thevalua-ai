import type { RowInsurance } from '~/models/core.validations';

import { ChevronDown, X } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';

import { formatAmount, getStateId } from '~/models/core.validations';
import { ROOFLESS } from '~/models/insurance';

import { useDisabled } from './ActionContextProvider';
import { FormSelect } from './FormSelect';
import { FormTextField } from './FormTextField';
import { GridCell } from './GridCell';
import { SecondaryButton } from './SecondaryButton';

interface Props extends RowInsurance {
  index: number;
  insuranceId: string;
  area: number | '';
  items: { id: string; identifier: string }[];
  roofTypes: { id: string; identifier: string }[];
  deleteRow: (index: number) => void;
  err?: string;

  openCalcDialog: (grcId: string, index: number) => void;
}
export function InsuranceRow(props: Props) {
  const { openCalcDialog, index, insuranceId, area, itemId, roofTypeId, rate, items, roofTypes, deleteRow, err, id } = props;
  const total = (rate || 0) * (area || 0);
  const disabled = useDisabled();
  const rooflessItems = items.filter((item) => ROOFLESS.some((el) => el === item.identifier));
  const roofDisabled = rooflessItems.some((item) => item.id === itemId);

  return (
    <div className="flex flex-col items-stretch">
      <div className="flex flex-row items-stretch">
        <input type="hidden" name="id" value={insuranceId || ''} />
        <div className="grid grid-cols-5 grow">
          <GridCell>
            <FormSelect name={getStateId(['insurance', index, 'itemId'])} defaultValue={itemId} isCamo required>
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.identifier}
                </option>
              ))}
            </FormSelect>
          </GridCell>
          <GridCell>
            <FormSelect name={getStateId(['insurance', index, 'roofTypeId'])} defaultValue={roofTypeId} isCamo disabled={roofDisabled}>
              <option value="">No Roof Type</option>
              {roofTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.identifier}
                </option>
              ))}
            </FormSelect>
          </GridCell>
          <GridCell>
            <FormTextField name={getStateId(['insurance', index, 'area'])} defaultValue={area} type="number" className="text-end" step={0.01} isCamo />
          </GridCell>
          <GridCell>
            {/* <FormTextField
              name={getStateId(['insurance', index, 'rate'])}
              defaultValue={rate}
              type="number"
              className="text-end"
              step={0.01}
              isCamo
            /> */}
            <button
              type="button"
              disabled={disabled}
              className={twMerge(
                'w-full transition-all duration-300 bg-white flex flex-row gap-2',
                'rounded-lg p-2 text-sm font-light outline-none',
                'border border-stone-400 hover:bg-stone-100 focus:bg-stone-100',
              )}
              onClick={() => openCalcDialog(id, index)}
            >
              <span>{formatAmount(rate || 0)}</span>
              <div className="grow" />
              <ChevronDown className="text-teal-600 ml-2 h-5 w-5 transition duration-150 ease-in-out group-hover:text-orange-300/80" aria-hidden="true" />
            </button>
            <input type="hidden" name={getStateId(['insurance', index, 'rate'])} value={rate} />
          </GridCell>
          <GridCell className="flex flex-col items-stretch">
            <span className="text-end pr-2">{formatAmount(total, 2)}</span>
          </GridCell>
        </div>
        <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
          <SecondaryButton type="button" isIcon title="Delete" className="bg-transparent" disabled={disabled} onClick={() => deleteRow(index)}>
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
