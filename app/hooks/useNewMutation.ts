import { useCallback, useState } from 'react';
import { getErrorMessage } from '~/models/errors';

interface Props<T> {
  mutateFn: (grcId: string, params: any) => Promise<T>;
}
type HookOutput<T> = {
  isMutating: boolean;
  mutate: (grcId: string, params: any) => Promise<Success<T> | Error>;
};
type Success<T> = {
  data: T | undefined;
  error: undefined;
};
type Error = {
  data: null;
  error: string;
};

export function useNewMutation<T>(props: Props<T>): HookOutput<T> {
  const { mutateFn } = props;

  const [isMutating, setIsMutating] = useState(false);

  const mutate = useCallback(
    async (grcId: string, params: any): Promise<Success<T> | Error> => {
      try {
        setIsMutating(true);
        const result = await mutateFn(grcId, params);
        return { data: result, error: undefined };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.log('mutation error', errorMessage);
        return { data: null, error: errorMessage };
      } finally {
        setIsMutating(false);
      }
    },
    [mutateFn],
  );

  return { isMutating, mutate };
}
