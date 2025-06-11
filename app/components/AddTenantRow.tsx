import type { ChangeEvent, FormEvent, RefObject } from 'react';

import { useFetcher } from '@remix-run/react';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, X } from 'tabler-icons-react';
import { z } from 'zod';

import { hasSuccess } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import { AddTenantSchema } from '~/models/tenants.validations';

import { ActionContextProvider, useForm } from './ActionContextProvider';
import { FormSelect } from './FormSelect';
import { FormTextField } from './FormTextField';
import { GridCell } from './GridCell';
import { SecondaryButton } from './SecondaryButton';
import { TextField } from './TextField';

interface Props {
  plotId: string;
  propertyTypes: { id: string; identifier: string }[];
  handleDelete: () => void;
  isLast?: boolean;
  analysisDate: Date;
}
export function AddTenantRow(props: Props) {
  const { plotId, propertyTypes, handleDelete, isLast, analysisDate } = props;

  const fetcher = useFetcher();
  const { getNameProp, isProcessing } = useForm(fetcher, AddTenantSchema);

  const nameRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const grossMonthlyRentalRef = useRef<HTMLInputElement>(null);
  const escalationRef = useRef<HTMLInputElement>(null);
  const propertyTypeIdRef = useRef<HTMLSelectElement>(null);
  const areaPerClientRef = useRef<HTMLInputElement>(null);
  const leaseLifeRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const rate = 0;

  // const [rate, setRate] = useState(0);
  const [leaseLife, setLeaseLife] = useState(0);
  const [remMonths, setRemMonths] = useState(0);

  const clearRef = (ref: RefObject<HTMLInputElement | HTMLSelectElement>) => {
    if (ref.current) {
      ref.current.value = '';
    }
  };

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      clearRef(nameRef);
      clearRef(startDateRef);
      clearRef(endDateRef);
      clearRef(grossMonthlyRentalRef);
      clearRef(escalationRef);
      clearRef(propertyTypeIdRef);
      clearRef(areaPerClientRef);
      clearRef(leaseLifeRef);
      toast.success('Tenant added successfully');
    }
  }, [fetcher.data]);

  // const onRateChange = (_: ChangeEvent<HTMLInputElement>) => {
  //   const area = Number(areaPerClientRef.current?.value || '0');
  //   const grossMonthly = Number(grossMonthlyRentalRef.current?.value || '0');
  //   const result = area ? grossMonthly / area : 0;
  //   setRate(result);
  // };

  const getValidatedDate = (data: unknown) => {
    const Schema = z.coerce.date();
    const result = Schema.safeParse(data);
    if (!result.success) {
      return undefined;
    }
    return result.data;
  };

  const onDatesChange = (_: ChangeEvent<HTMLInputElement> | undefined) => {
    console.log('ran');
    const startDate = getValidatedDate(startDateRef.current?.value);
    const endDate = getValidatedDate(endDateRef.current?.value);
    if (!startDate || !endDate) {
      return;
    }
    if (dayjs(startDate).isAfter(dayjs(endDate))) {
      toast.error('Start date cannot be after end date');
      return 1;
    }

    // const leaseLife = dayjs(endDate).diff(dayjs(startDate), 'months', true);
    const leaseLife = dayjs(endDate).diff(dayjs(startDate), 'months');
    setLeaseLife(Number(leaseLife.toFixed(2)));

    // const remMonths = dayjs(endDate).diff(dayjs(analysisDate), 'months', true);
    const remMonths = dayjs(endDate).diff(dayjs(analysisDate), 'months');
    setRemMonths(Number(remMonths.toFixed(2)));
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    const errOccurred = onDatesChange(undefined);
    if (!errOccurred) {
      fetcher.submit(event.currentTarget, {
        method: 'post',
        action: AppLinks.AddTenant,
      });
    }
  };

  const handleSubmit = () => {
    if (formRef.current) {
      const errOccurred = onDatesChange(undefined);
      if (!errOccurred) {
        return fetcher.submit(formRef.current, {
          method: 'post',
          action: AppLinks.AddTenant,
        });
      }
    }
  };

  return (
    <fetcher.Form method="post" ref={formRef} onSubmit={handleSave} action={AppLinks.AddTenant} className="flex flex-col items-stretch gap-2">
      <ActionContextProvider
        {...fetcher.data}
        submit={handleSubmit}
        // fields={fetcher.data?.fields || defaultValues}
        isSubmitting={isProcessing}
      >
        <div className="flex flex-row items-stretch">
          <div className="grid grid-cols-10 grow">
            <input type="hidden" {...getNameProp('plotId')} value={plotId} />
            <GridCell>
              <FormTextField {...getNameProp('name')} customRef={nameRef} disabled={isProcessing} isCamo required />
            </GridCell>
            <GridCell>
              <FormSelect {...getNameProp('propertyTypeId')} customRef={propertyTypeIdRef} disabled={isProcessing} isCamo required>
                <option value="">Asset Type</option>
                {propertyTypes.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.identifier}
                  </option>
                ))}
              </FormSelect>
            </GridCell>
            <GridCell>
              <FormTextField
                {...getNameProp('areaPerClient')}
                // onChange={onRateChange}
                customRef={areaPerClientRef}
                type="number"
                className="text-end"
                step={1}
                disabled={isProcessing}
                isCamo
                required
              />
            </GridCell>
            <GridCell>
              <input type="hidden" {...getNameProp('leaseLife')} value="2" />
              <TextField value={`${leaseLife || '0'} month(s)`} className="text-end" disabled={true} isCamo required />
            </GridCell>
            <GridCell>
              <FormTextField
                {...getNameProp('startDate')}
                customRef={startDateRef}
                // onChange={onDatesChange}
                type="date"
                disabled={isProcessing}
                isCamo
                required
              />
            </GridCell>
            <GridCell>
              <FormTextField
                {...getNameProp('endDate')}
                customRef={endDateRef}
                // onChange={onDatesChange}
                type="date"
                disabled={isProcessing}
                isCamo
                required
              />
            </GridCell>
            <GridCell>
              <TextField value={`${remMonths || '0'} month(s)`} className="text-end" disabled={true} isCamo required />
            </GridCell>
            <GridCell className="text-end">
              <FormTextField
                {...getNameProp('grossMonthlyRental')}
                // onChange={onRateChange}
                customRef={grossMonthlyRentalRef}
                type="number"
                step=".01"
                className="text-end"
                disabled={isProcessing}
                isCamo
                required
              />
            </GridCell>
            <GridCell className="text-end">
              <TextField value={rate || ''} type="number" className="text-end" disabled={true} isCamo required />
            </GridCell>
            <GridCell className="text-end">
              <div className="flex flex-row items-center gap-1">
                <FormTextField {...getNameProp('escalation')} customRef={escalationRef} step=".01" type="number" className="text-end" disabled={isProcessing} isCamo required />
                <span className="text-xl font-light">%</span>
              </div>
            </GridCell>
            <input type="hidden" {...getNameProp('termOfLease')} value={'-'} />
            <input type="hidden" {...getNameProp('areaPerMarket')} value={'1'} />
          </div>
          <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
            <SecondaryButton type="button" onClick={handleDelete} isIcon className="bg-transparent">
              <X className="text-red-600" size={16} />
            </SecondaryButton>
          </div>
        </div>
        {isLast && (
          <div className="flex flex-col items-end py-2">
            <SecondaryButton type="submit" className="flex flex-row items-center gap-2">
              <Plus className="text-teal-600" />
              Add Tenant
            </SecondaryButton>
          </div>
        )}
        {!isLast && <input type="submit" className="invisible absolute top-0" />}
      </ActionContextProvider>
    </fetcher.Form>
  );
}
