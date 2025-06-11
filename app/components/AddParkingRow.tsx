import type { FormEvent, RefObject } from 'react';

import { useFetcher } from '@remix-run/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, X } from 'tabler-icons-react';

import { hasSuccess } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import { AddParkingSchema } from '~/models/tenants.validations';

import { ActionContextProvider, useForm } from './ActionContextProvider';
import { FormSelect } from './FormSelect';
import { FormTextField } from './FormTextField';
import { GridCell } from './GridCell';
import { SecondaryButton } from './SecondaryButton';
import { TextField } from './TextField';

interface Props {
  plotId: string;
  parkingTypes: { id: string; identifier: string }[];
  handleDelete: () => void;
  isLast?: boolean;
}
export function AddParkingRow(props: Props) {
  const { plotId, parkingTypes, handleDelete, isLast } = props;

  const fetcher = useFetcher();
  const { getNameProp, isProcessing } = useForm(fetcher, AddParkingSchema);

  const parkingTypeIdRef = useRef<HTMLSelectElement>(null);
  const unitPerClientRef = useRef<HTMLInputElement>(null);
  const ratePerClientRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const clearRef = (ref: RefObject<HTMLInputElement | HTMLSelectElement>) => {
    if (ref.current) {
      ref.current.value = '';
    }
  };

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      clearRef(parkingTypeIdRef);
      clearRef(unitPerClientRef);
      clearRef(ratePerClientRef);
      toast.success('Parking record added successfully');
    }
  }, [fetcher.data]);

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    fetcher.submit(event.currentTarget, {
      method: 'post',
      action: AppLinks.AddParking,
    });
    // addRow();
  };

  const handleSubmit = () => {
    if (formRef.current) {
      return fetcher.submit(formRef.current, {
        method: 'post',
        action: AppLinks.AddParking,
      });
    }
  };

  return (
    <fetcher.Form method="post" ref={formRef} onSubmit={handleSave} action={AppLinks.AddParking} className="flex flex-col items-stretch gap-2">
      <ActionContextProvider
        {...fetcher.data}
        submit={handleSubmit}
        // fields={fetcher.data?.fields || defaultValues}
        isSubmitting={isProcessing}
      >
        <div className="flex flex-row items-stretch">
          <div className="grid grid-cols-4 grow">
            <input type="hidden" {...getNameProp('plotId')} value={plotId} />
            <GridCell>
              <FormSelect {...getNameProp('parkingTypeId')} customRef={parkingTypeIdRef} disabled={isProcessing} isCamo required>
                <option value="">Parking Type</option>
                {parkingTypes.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.identifier}
                  </option>
                ))}
              </FormSelect>
            </GridCell>
            <GridCell>
              <FormTextField
                {...getNameProp('unitPerClient')}
                customRef={unitPerClientRef}
                type="number"
                className="text-end"
                step={0.01}
                disabled={isProcessing}
                isCamo
                required
              />
            </GridCell>
            <GridCell>
              <FormTextField
                {...getNameProp('ratePerClient')}
                customRef={ratePerClientRef}
                type="number"
                className="text-end"
                step={0.01}
                disabled={isProcessing}
                isCamo
                required
              />
            </GridCell>
            <GridCell className="flex flex-col items-stretch">
              <TextField value="0" className="text-end" disabled={true} isCamo required />
            </GridCell>
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
              Add Parking
            </SecondaryButton>
          </div>
        )}
        {!isLast && <input type="submit" className="invisible absolute top-0" />}
      </ActionContextProvider>
    </fetcher.Form>
  );
}
