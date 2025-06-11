import type { FormEvent, RefObject } from 'react';

import { useFetcher } from '@remix-run/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, X } from 'tabler-icons-react';

import { AddGrcFeeSchema, hasSuccess } from '~/models/core.validations';
import { AppLinks } from '~/models/links';

import { ActionContextProvider, useForm } from './ActionContextProvider';
import { FormTextField } from './FormTextField';
import { GridCell } from './GridCell';
import { SecondaryButton } from './SecondaryButton';
import { TextField } from './TextField';

interface Props {
  plotId: string;
  handleDelete: () => void;
  isLast?: boolean;
  grcTotal: number;
}
export function AddGrcFeeRow(props: Props) {
  const { plotId, handleDelete, isLast } = props;

  const fetcher = useFetcher();
  const { getNameProp, isProcessing } = useForm(fetcher, AddGrcFeeSchema);

  const identifierRef = useRef<HTMLInputElement>(null);
  const percRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // const [total, setTotal] = useState(0);
  // const total = grcTotal * perc;

  const clearRef = (ref: RefObject<HTMLInputElement | HTMLSelectElement>) => {
    if (ref.current) {
      ref.current.value = '';
    }
  };

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      clearRef(identifierRef);
      clearRef(percRef);
      toast.success('Fee added successfully');
    }
  }, [fetcher.data]);

  // const onTotalChange = (_: ChangeEvent<HTMLInputElement>) => {
  //   const perc = Number(percRef.current?.value || '0');
  //   setTotal(grcTotal * perc);
  // };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    fetcher.submit(event.currentTarget, {
      method: 'post',
      action: AppLinks.AddGrcFee,
    });
    // addRow();
  };

  const handleSubmit = () => {
    if (formRef.current) {
      return fetcher.submit(formRef.current, {
        method: 'post',
        action: AppLinks.AddGrcFee,
      });
    }
  };

  return (
    <fetcher.Form method="post" ref={formRef} onSubmit={handleSave} action={AppLinks.AddGrcFee} className="flex flex-col items-stretch gap-2">
      <ActionContextProvider
        {...fetcher.data}
        submit={handleSubmit}
        // fields={fetcher.data?.fields || defaultValues}
        isSubmitting={isProcessing}
      >
        <div className="flex flex-row items-stretch">
          <div className="grid grid-cols-3 grow">
            <input type="hidden" {...getNameProp('plotId')} value={plotId} />
            <GridCell>
              <FormTextField {...getNameProp('identifier')} customRef={identifierRef} disabled={isProcessing} isCamo required />
            </GridCell>
            <GridCell>
              <div className="flex flex-row items-center gap-2">
                <div className="flex flex-col items-stretch grow">
                  <FormTextField
                    {...getNameProp('perc')}
                    customRef={percRef}
                    // onChange={onTotalChange}
                    type="number"
                    className="text-end"
                    step={0.01}
                    disabled={isProcessing}
                    isCamo
                    required
                  />
                </div>
                <span className="text-lg font-light">%</span>
              </div>
            </GridCell>
            <GridCell className="flex flex-col items-stretch">
              <TextField
                value="0"
                // value={formatAmount(total) || '0'}
                className="text-end"
                disabled={true}
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
