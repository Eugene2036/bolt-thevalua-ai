import { useEffect } from 'react';
import { hasSuccess } from '~/models/core.validations';

export function useOnSuccess(data: unknown, callback: () => void) {
  useEffect(() => {
    if (hasSuccess(data)) {
      callback();
    }
  }, [data, callback]);
}
