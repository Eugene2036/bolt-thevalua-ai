import { useFetcher } from '@remix-run/react';
import { useEffect, type ComponentProps, useRef } from 'react';
import { toast } from 'sonner';
import { hasSuccess } from '~/models/core.validations';
import { hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { UpdateStoredValueSchema } from '~/models/plots.validations';
import { ActionContextProvider, useForm } from './ActionContextProvider';
import { FormTextField } from './FormTextField';

interface Props extends Omit<ComponentProps<typeof FormTextField>, 'name'> {
  plotId: string;
  id: string;
  identifier: string;
}
export function EditStoredValue(props: Props) {
  const { id, identifier, plotId, ...restOfProps } = props;

  const formRef = useRef<HTMLFormElement>(null);

  const fetcher = useFetcher();
  const { getNameProp, isProcessing } = useForm(fetcher, UpdateStoredValueSchema);

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      toast.success(`${identifier} updated successfully`);
    }
  }, [identifier, fetcher.data]);

  useEffect(() => {
    if (hasFormError(fetcher.data)) {
      toast.error(fetcher.data.formError);
    }
  }, [fetcher.data]);

  const handleSubmit = () => {
    if (formRef.current) {
      return fetcher.submit(formRef.current, {
        method: 'post',
        action: AppLinks.UpdateStoredValue(plotId),
      });
    }
  };

  return (
    <fetcher.Form method="post" ref={formRef} action={AppLinks.UpdateStoredValue(plotId)} className="grow">
      <ActionContextProvider {...fetcher.data} submit={handleSubmit} isSubmitting={isProcessing}>
        <input type="hidden" {...getNameProp('id')} value={id} />
        <input type="hidden" {...getNameProp('identifier')} value={identifier} />
        <FormTextField {...getNameProp('value')} {...restOfProps} />
        <input type="submit" className="invisible absolute top-0" />
      </ActionContextProvider>
    </fetcher.Form>
  );
}
