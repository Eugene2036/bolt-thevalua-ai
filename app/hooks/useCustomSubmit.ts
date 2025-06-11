import type { FetcherWithComponents } from '@remix-run/react';
import type { FormEvent, RefObject } from 'react';

export function useCustomSubmit(fetcher: FetcherWithComponents<any>, action: string, formRef: RefObject<HTMLFormElement>) {
  function submit(target: HTMLFormElement) {
    return fetcher.submit(target, {
      method: 'post',
      action,
    });
  }
  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    submit(event.currentTarget);
  };
  const handleSubmit = () => {
    if (formRef.current) {
      return submit(formRef.current);
    }
  };

  return { handleSubmit, handleSave };
}
