import type { SerializeFrom } from '@remix-run/node';
import type { z } from 'zod';
import type { NewMutateConstructionSchema } from '~/models/construction.schema';
import type { action } from '~/routes/new-mutate-construction-data.$grcId';
import type { action as insuranceAction } from '~/routes/new-mutate-insurance-data.$insuranceId';

import { useNewMutation } from './useNewMutation';

export function useNewMutateCalculator(insurance: boolean) {
  async function mutateFn(grcId: string, params: z.infer<typeof NewMutateConstructionSchema>) {
    const formData = new FormData();
    formData.append('plotId', params.plotId.toString());
    formData.append('isBull', params.isBull ? 'true' : '');
    formData.append('floorArea', params.floorArea.toString());
    formData.append('verandaFloorArea', params.verandaFloorArea.toString());
    formData.append('devYear', params.devYear);
    formData.append('items', JSON.stringify(params.items));

    if (insurance) {
      console.log('ins run');
      const response = (await fetch(`/new-mutate-insurance-data/${grcId}`, {
        method: 'post',
        body: formData,
      }).then((r) => {
        console.log('r >>>', r, JSON.stringify(r));
        return r.json();
      })) as SerializeFrom<typeof insuranceAction>;
      console.log('response >>>', response, JSON.stringify(response));
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.success;
    }

    console.log('normie run');
    const response = (await fetch(`/new-mutate-construction-data/${grcId}`, {
      method: 'post',
      body: formData,
    }).then((r) => r.json())) as SerializeFrom<typeof action>;
    if (!response.success) {
      throw new Error(response.message);
    }
    return response.success;
  }
  return useNewMutation({ mutateFn });
}
