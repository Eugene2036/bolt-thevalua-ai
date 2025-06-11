import type { SerializeFrom } from '@remix-run/node';
import type { loader } from '~/routes/get-construction-data.$grcId';
import type { loader as insuranceLoader } from '~/routes/get-insurance-data.$insuranceId';
import { useCallback } from 'react';
import { createQueryParams } from '~/models/core.validations';
import { useQuery } from './useQuery';

export function useCalculatorData(grcId: string, insurance: boolean, kind?: string, isBull?: boolean) {
  const queryFn = useCallback(async (grcId: string, insurance: boolean, kind?: string, isBull?: boolean) => {
    if (insurance) {
      const paramsStr = createQueryParams([['kind', kind || '']]);
      const url = [`/get-insurance-data/${grcId}`, paramsStr].join('?');
      const response = (await fetch(url).then((r) => r.json())) as SerializeFrom<typeof insuranceLoader>;
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    }

    const paramsStr = createQueryParams([
      ['kind', kind || ''],
      ['isBull', isBull?.toString() || ''],
    ]);
    const url = [`/get-construction-data/${grcId}`, paramsStr].join('?');
    const response = (await fetch(url).then((r) => r.json())) as SerializeFrom<typeof loader>;
    if (!response.success) {
      throw new Error(response.message);
    }
    return response.data;
  }, []);
  return useQuery({
    queryKey: grcId,
    queryFn,
    initialData: undefined,
    args: [grcId, insurance, kind, isBull],
  });
}
