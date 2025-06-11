import type { ChangeEvent } from 'react';

import { useFetcher } from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, X } from 'tabler-icons-react';
import { z } from 'zod';

import { useCustomSubmit } from '~/hooks/useCustomSubmit';
import { useRefs } from '~/hooks/useRefs';
import { formatAmount, hasSuccess } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import { AddInsuranceSchema } from '~/models/tenants.validations';

import { ActionContextProvider, useForm } from './ActionContextProvider';
import { FormSelect } from './FormSelect';
import { FormTextField } from './FormTextField';
import { GridCell } from './GridCell';
import { SecondaryButton } from './SecondaryButton';
import { TextField } from './TextField';

interface Props {
  plotId: string;
  area: number;
  items: { id: string; identifier: string }[];
  roofTypes: { id: string; identifier: string }[];
  handleDelete: () => void;
  isLast?: boolean;
}
export function AddInsuranceRow(props: Props) {
  const { plotId, area, items, roofTypes, handleDelete, isLast } = props;

  const fetcher = useFetcher();
  const { getNameProp, isProcessing } = useForm(fetcher, AddInsuranceSchema);

  const itemIdRef = useRef<HTMLSelectElement>(null);
  const roofTypeIdRef = useRef<HTMLSelectElement>(null);
  const rateRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const { clearAllRefs } = useRefs([itemIdRef, roofTypeIdRef, rateRef]);
  const { handleSave, handleSubmit } = useCustomSubmit(fetcher, AppLinks.AddInsurance, formRef);

  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      clearAllRefs();
      setTotal(0);
      toast.success('Item added successfully');
    }
  }, [fetcher.data, clearAllRefs]);

  const onTotalChange = (_: ChangeEvent<HTMLInputElement>) => {
    const result = z.number().safeParse(rateRef.current?.value);
    const rate = result.success ? result.data : 0;
    setTotal(rate * area);
  };

  return (
    <fetcher.Form method="post" ref={formRef} onSubmit={handleSave} action={AppLinks.AddInsurance} className="flex flex-col items-stretch gap-2">
      <ActionContextProvider {...fetcher.data} submit={handleSubmit} isSubmitting={isProcessing}>
        <div className="flex flex-row items-stretch">
          <div className="grid grid-cols-5 grow">
            <input type="hidden" {...getNameProp('plotId')} value={plotId} />
            <GridCell>
              <FormSelect {...getNameProp('itemId')} customRef={itemIdRef} isCamo required>
                <option value="">Insurance Item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.identifier}
                  </option>
                ))}
              </FormSelect>
            </GridCell>
            <GridCell>
              <FormSelect {...getNameProp('roofTypeId')} customRef={roofTypeIdRef} isCamo required>
                <option value="">Roof Type</option>
                {roofTypes.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.identifier}
                  </option>
                ))}
              </FormSelect>
            </GridCell>
            <GridCell className="flex flex-col justify-center items-stretch text-end">
              <span className="font-semibold p-2">{area}</span>
            </GridCell>
            <GridCell>
              <FormTextField {...getNameProp('rate')} customRef={rateRef} onChange={onTotalChange} type="number" className="text-end" isCamo required />
            </GridCell>
            <GridCell className="flex flex-col items-stretch">
              <TextField value={formatAmount(total)} className="text-end" disabled={true} isCamo required />
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
              Add Insurance Item
            </SecondaryButton>
          </div>
        )}
        {!isLast && <input type="submit" className="invisible absolute top-0" />}
      </ActionContextProvider>
    </fetcher.Form>
  );
}
