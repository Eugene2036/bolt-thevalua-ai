import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '~/models/errors';

interface Props<T> {
  queryKey: string;
  queryFn: (grcId: string, insurance: boolean, kind?: string, isBull?: boolean) => Promise<T>;
  initialData?: T;
  args: any[];
}
type Refetch = (grcId: string, insurance: boolean, kind?: string) => Promise<void>;
type Common = {
  isLoading: boolean;
  refetch: Refetch;
};
type Success<T> = Common & {
  data: T | undefined;
  error: undefined;
};
type Error = Common & {
  data: null;
  error: string;
};
export function useQuery<T>(props: Props<T>): Success<T> | Error {
  const {
    queryKey,
    queryFn,
    initialData,
    args: [grcId, insurance, kind, isBull],
  } = props;

  const [data, setData] = useState(initialData);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const refetch = useCallback(
    async (grcId: string, insurance: boolean, kind?: string) => {
      try {
        setIsLoading(true);
        const result = await queryFn(grcId, insurance, kind, isBull);
        setData(result);
      } catch (error) {
        setError(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [queryFn, isBull],
  );

  useEffect(() => {
    refetch(grcId, insurance, kind);
  }, [queryKey, queryFn, refetch, grcId, insurance, kind]);

  if (error) {
    return { isLoading, data: null, error, refetch };
  }

  return { isLoading, data, error: undefined, refetch };
}
