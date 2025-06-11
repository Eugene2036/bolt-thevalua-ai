import type { SerializeFrom } from '@remix-run/node';
import type { GrcProps, InsuranceProps } from '~/models/insurance.validations';
import type { loader } from '~/routes/get-new-construction-data';
import type { loader as insuranceLoader } from '~/routes/get-new-insurance-data';
import { useCallback } from 'react';
import { createQueryParams } from '~/models/core.validations';
import { useNewQuery } from './useNewQuery';

export function useNewCalculatorData(plotId: string, grcId: string | undefined, recordProps: GrcProps | InsuranceProps, kind?: string, isBull?: boolean) {
  const queryFn = useCallback(async (plotId: string, grcId: string | undefined, recordProps: GrcProps | InsuranceProps, kind?: string, isBull?: boolean) => {
    if (recordProps.recordType === 'insurance') {
      const paramsStr = createQueryParams([
        ['plotId', plotId],
        ['grcId', grcId || ''],
        ['kind', kind || ''],

        ['itemId', recordProps.itemId || ''],
        ['roofTypeId', recordProps.roofTypeId || ''],
        ['unit', recordProps.unit?.toString() || '0'],
      ]);
      const url = [`/get-new-insurance-data`, paramsStr].join('?');
      const response = (await fetch(url).then((r) => r.json())) as SerializeFrom<typeof insuranceLoader>;
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    }

    const paramsStr = createQueryParams([
      ['plotId', plotId],
      ['grcId', grcId || ''],
      ['kind', kind || ''],
      ['isBull', isBull?.toString() || ''],

      ['identifier', recordProps.identifier || ''],
      ['size', recordProps.size?.toString() || '0'],
      ['unit', recordProps.unit || ''],
    ]);
    const url = [`/get-new-construction-data`, paramsStr].join('?');
    const response = (await fetch(url).then((r) => r.json())) as SerializeFrom<typeof loader>;
    if (!response.success) {
      throw new Error(response.message);
    }
    return response.data;
  }, []);
  return useNewQuery({
    queryFn,
    initialData: undefined,
    args: [plotId, grcId, recordProps, kind, isBull],
  });
}
