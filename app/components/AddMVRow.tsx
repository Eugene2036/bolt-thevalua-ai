import type { FormEvent, RefObject } from 'react';

import { useFetcher } from '@remix-run/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, X } from 'tabler-icons-react';

import { AddMVSchema, hasSuccess } from '~/models/core.validations';
import { AppLinks } from '~/models/links';

import { ActionContextProvider, useForm } from './ActionContextProvider';
import { FormTextField } from './FormTextField';
import { GridCell } from './GridCell';
import { SecondaryButton } from './SecondaryButton';

interface Props {
  plotId: string;
  handleDelete: () => void;
  isLast?: boolean;
}
export function AddMVRow(props: Props) {
  const { plotId, handleDelete, isLast } = props;

  const fetcher = useFetcher();
  const { getNameProp, isProcessing } = useForm(fetcher, AddMVSchema);

  const identifierRef = useRef<HTMLInputElement>(null);
  const sizeRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const clearRef = (ref: RefObject<HTMLInputElement | HTMLSelectElement>) => {
    if (ref.current) {
      ref.current.value = '';
    }
  };

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      clearRef(identifierRef);
      clearRef(dateRef);
      clearRef(sizeRef);
      clearRef(locationRef);
      clearRef(priceRef);
      toast.success('MV item added successfully');
    }
  }, [fetcher.data]);

  // const onTotalChange = (_: ChangeEvent<HTMLInputElement>) => {
  //   const size = Number(sizeRef.current?.value || '0');
  //   const rate = Number(locationRef.current?.value || '0');
  //   setTotal(rate * size);
  // };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    fetcher.submit(event.currentTarget, {
      method: 'post',
      action: AppLinks.AddMV,
    });
  };

  const handleSubmit = () => {
    if (formRef.current) {
      return fetcher.submit(formRef.current, {
        method: 'post',
        action: AppLinks.AddMV,
      });
    }
  };

  return (
    <fetcher.Form method="post" ref={formRef} onSubmit={handleSave} action={AppLinks.AddMV} className="flex flex-col items-stretch gap-2">
      <ActionContextProvider
        {...fetcher.data}
        submit={handleSubmit}
        // fields={fetcher.data?.fields || defaultValues}
        isSubmitting={isProcessing}
      >
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
              <FormTextField
                {...getNameProp('date')}
                customRef={dateRef}
                // onChange={onTotalChange}
                type="date"
                disabled={isProcessing}
                isCamo
                required
              />
            </GridCell>
            <GridCell>
              <FormTextField {...getNameProp('location')} customRef={locationRef} disabled={isProcessing} isCamo required />
            </GridCell>
            <GridCell>
              <FormTextField
                {...getNameProp('price')}
                customRef={priceRef}
                // onChange={onTotalChange}
                type="number"
                className="text-end"
                step={0.01}
                disabled={isProcessing}
                isCamo
                required
              />
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
