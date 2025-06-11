import type { FormEvent, RefObject } from 'react';

import { useFetcher } from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, X } from 'tabler-icons-react';

import { AddGrcSchema, formatAmount, hasSuccess } from '~/models/core.validations';
import { AppLinks } from '~/models/links';

import { ActionContextProvider, useForm } from './ActionContextProvider';
import { FormSelect } from './FormSelect';
import { FormTextField } from './FormTextField';
import { GridCell } from './GridCell';
import { SecondaryButton } from './SecondaryButton';
import { TextField } from './TextField';

interface Props {
  plotId: string;
  handleDelete: () => void;
  isLast?: boolean;
  bull: boolean;
}
export function AddGrcRow(props: Props) {
  const { bull, plotId, handleDelete, isLast } = props;

  const fetcher = useFetcher();
  const { getNameProp, isProcessing } = useForm(fetcher, AddGrcSchema);

  const identifierRef = useRef<HTMLInputElement>(null);
  const unitRef = useRef<HTMLSelectElement>(null);
  const sizeRef = useRef<HTMLInputElement>(null);
  const rateRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [total, setTotal] = useState(0);

  const clearRef = (ref: RefObject<HTMLInputElement | HTMLSelectElement>) => {
    if (ref.current) {
      ref.current.value = '';
    }
  };

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      clearRef(identifierRef);
      clearRef(unitRef);
      clearRef(sizeRef);
      clearRef(rateRef);
      setTotal(0);
      toast.success('GRC item added successfully');
    }
  }, [fetcher.data]);

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    fetcher.submit(event.currentTarget, {
      method: 'post',
      action: AppLinks.AddGrc,
    });
    // addRow();
  };

  const handleSubmit = () => {
    if (formRef.current) {
      return fetcher.submit(formRef.current, {
        method: 'post',
        action: AppLinks.AddGrc,
      });
    }
  };

  return (
    <fetcher.Form method="post" ref={formRef} onSubmit={handleSave} action={AppLinks.AddGrc} className="flex flex-col items-stretch gap-2">
      <ActionContextProvider
        {...fetcher.data}
        submit={handleSubmit}
        // fields={fetcher.data?.fields || defaultValues}
        isSubmitting={isProcessing}
      >
        <input type="hidden" {...getNameProp('bull')} value={String(bull)} />
        <div className="flex flex-row items-stretch">
          <div className="grid grid-cols-5 grow">
            <input type="hidden" {...getNameProp('plotId')} value={plotId} />
            <GridCell>
              <FormTextField {...getNameProp('identifier')} customRef={identifierRef} disabled={isProcessing} isCamo required />
            </GridCell>
            <GridCell>
              <FormTextField
                {...getNameProp('size')}
                customRef={sizeRef}
                // onChange={onTotalChange}
                type="number"
                className="text-end"
                step={0.01}
                disabled={isProcessing}
                isCamo
                required
              />
            </GridCell>
            <GridCell>
              <FormSelect {...getNameProp('unit')} customRef={unitRef} disabled={isProcessing} isCamo required>
                <option value="SQM">SQM</option>
                <option value="Unit">Unit</option>
                <option value="M">M</option>
              </FormSelect>
            </GridCell>
            <GridCell>
              <FormTextField
                {...getNameProp('rate')}
                customRef={rateRef}
                // onChange={onTotalChange}
                type="number"
                className="text-end"
                step={0.01}
                disabled={isProcessing}
                isCamo
                required
              />
            </GridCell>
            <GridCell className="flex flex-col items-stretch">
              <TextField value={formatAmount(total) || '0'} className="text-end" disabled={true} isCamo required />
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
              Add Row
            </SecondaryButton>
          </div>
        )}
        {!isLast && <input type="submit" className="invisible absolute top-0" />}
      </ActionContextProvider>
    </fetcher.Form>
  );
}
