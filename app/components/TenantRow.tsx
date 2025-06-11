import type { RowTenant } from '~/models/core.validations';

import dayjs from 'dayjs';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { X } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';

import { getStateId } from '~/models/core.validations';
import { DATE_INPUT_FORMAT } from '~/models/dates';

import { useDisabled } from './ActionContextProvider';
import { FormSelect } from './FormSelect';
import { FormTextField } from './FormTextField';
import { GridCell } from './GridCell';
import { SecondaryButton } from './SecondaryButton';
import { TextField } from './TextField';

interface Props extends RowTenant {
  index: number;
  analysisDate: Date;
  propertyTypes: { id: string; identifier: string }[];
  deleteRow: (index: number) => void;
  err?: string;
}
export function TenantRow(props: Props) {
  const {
    index,
    id,
    name,
    propertyTypeId,
    area,
    startDate,
    endDate,
    grossMonthly,
    escl,
    // analysisDate,
    propertyTypes,
    deleteRow,
    err,
    ratePerMarket,
  } = props;

  useEffect(() => {
    console.log('err', err);
    if (err) {
      toast.error(err);
    }
  }, [err]);

  const calcRate = (gross: number, area: number) => {
    const result = area ? gross / area : 0;
    return Number(result.toFixed(2));
  };

  const calcDateDiff = (startDate: Date, endDate: Date) => {
    const diff = dayjs(endDate).diff(dayjs(startDate), 'months');
    return Number(diff.toFixed(2));
  };

  const rate = calcRate(grossMonthly, area);
  const leaseLife = calcDateDiff(startDate, endDate);
  // const remMonths = (() => {
  //   const result = calcDateDiff(analysisDate, endDate);
  //   if (result < 0) {
  //     return 0;
  //   }
  //   return result;
  // })();

  const disabled = useDisabled();

  return (
    <div className="flex flex-col items-stretch">
      <div className={twMerge('flex flex-row items-stretch')}>
        <input type="hidden" name="id" value={id || ''} />
        <div className="grid grid-cols-10 grow">
          <GridCell>
            <FormTextField key={getStateId(['tenant', index, 'name'])} name={getStateId(['tenant', index, 'name'])} defaultValue={name} isCamo required />
          </GridCell>
          <GridCell>
            <FormSelect name={getStateId(['tenant', index, 'propertyTypeId'])} defaultValue={propertyTypeId} isCamo required>
              <option value="">Select Property Type</option>
              {propertyTypes.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.identifier}
                </option>
              ))}
            </FormSelect>
          </GridCell>
          <GridCell>
            <FormTextField name={getStateId(['tenant', index, 'area'])} defaultValue={area} type="number" className="text-end" step={0.01} isCamo noErrors required />
          </GridCell>
          <GridCell>
            <FormTextField name={getStateId(['tenant', index, 'startDate'])} defaultValue={dayjs(startDate).format(DATE_INPUT_FORMAT)} type="date" isCamo noErrors required />
          </GridCell>
          <GridCell>
            <FormTextField name={getStateId(['tenant', index, 'endDate'])} defaultValue={dayjs(endDate).format(DATE_INPUT_FORMAT)} type="date" isCamo noErrors required />
          </GridCell>
          <GridCell>
            <TextField value={`${leaseLife || '0'} month(s)`} className="text-end" disabled={true} isCamo noErrors required />
          </GridCell>
          <GridCell className="text-end">
            <FormTextField name={getStateId(['tenant', index, 'grossMonthly'])} defaultValue={grossMonthly} type="number" step={0.01} className="text-end" isCamo required />
          </GridCell>
          <GridCell className="text-end">
            <TextField value={rate || ''} type="number" className="text-end" disabled={true} isCamo required />
          </GridCell>
          <GridCell className="text-end bg-teal-50">
            <FormTextField name={getStateId(['tenant', index, 'ratePerMarket'])} defaultValue={ratePerMarket} type="number" step={0.01} className="text-end" isCamo required />
          </GridCell>
          {/* <GridCell>
            <TextField
              value={`${remMonths || '0'} month(s)`}
              className="text-end"
              disabled={true}
              isCamo
              required
            />
          </GridCell> */}
          <GridCell className="text-end">
            <div className="flex flex-row items-center gap-1">
              <FormTextField name={getStateId(['tenant', index, 'escl'])} defaultValue={escl} type="number" step={0.01} className="text-end" isCamo required />
              <span className="text-xl font-light">%</span>
            </div>
          </GridCell>
        </div>
        <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
          <SecondaryButton type="button" isIcon title="Delete" className="bg-transparent" onClick={() => deleteRow(index)} disabled={disabled}>
            <X className={twMerge('text-red-600', disabled && 'text-stone-400')} size={16} />
          </SecondaryButton>
        </div>
      </div>
      {/* {err && (
        <div className="flex flex-col items-stretch border border-stone-200">
          <span className="text-red-600 text-xs p-2 pt-1 pb-3">{err}</span>
        </div>
      )} */}
    </div>
  );
}
