import type { GrcProps, InsuranceProps } from '~/models/insurance.validations';
import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '~/models/errors';

interface Props<T> {
  queryFn: (plotId: string, grcId: string | undefined, recordProps: GrcProps | InsuranceProps, kind?: string, isBull?: boolean) => Promise<T>;
  initialData?: T;
  args: any[];
}
type Refetch = (plotId: string, grcId: string | undefined, recordProps: GrcProps | InsuranceProps, kind?: string) => Promise<void>;
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
export function useNewQuery<T>(props: Props<T>): Success<T> | Error {
  const {
    queryFn,
    initialData,
    args: [plotId, grcId, recordProps, kind, isBull],
  } = props;

  const [data, setData] = useState(initialData);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(
    async (plotId: string, grcId: string | undefined, recordProps: GrcProps | InsuranceProps, kind?: string) => {
      try {
        setIsLoading(true);
        const result = await queryFn(plotId, grcId, recordProps, kind, isBull);
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
    refetch(plotId, grcId, recordProps, kind);
  }, [refetch, plotId, grcId, recordProps, kind]);

  if (error) {
    return { isLoading, data: null, error, refetch };
  }

  return { isLoading, data, error: undefined, refetch };
}
