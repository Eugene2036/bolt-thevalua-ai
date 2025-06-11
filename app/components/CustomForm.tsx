import type { FetcherWithComponents } from '@remix-run/react';
import type { ComponentProps } from 'react';
import type { useCustomSubmit } from '~/hooks/useCustomSubmit';
import { twMerge } from 'tailwind-merge';
import { ActionContextProvider } from './ActionContextProvider';

interface Props extends Omit<ComponentProps<FetcherWithComponents<any>['Form']>, 'method' | 'ref'> {
  fetcher: FetcherWithComponents<any>;
  isProcessing: boolean;
  formRef: React.RefObject<HTMLFormElement>;
  customSubmit: ReturnType<typeof useCustomSubmit>;
  action: string;
}
export function CustomForm(props: Props) {
  const { fetcher, isProcessing, formRef, customSubmit, action, children, className, ...restOfProps } = props;

  return (
    <fetcher.Form
      method="post"
      ref={formRef}
      onSubmit={customSubmit.handleSave}
      action={action}
      className={twMerge('flex flex-col items-stretch gap-2', className)}
      {...restOfProps}
    >
      <ActionContextProvider {...fetcher.data} submit={customSubmit.handleSubmit} isSubmitting={isProcessing}>
        {children}
      </ActionContextProvider>
    </fetcher.Form>
  );
}
