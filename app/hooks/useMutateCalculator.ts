import type { SerializeFrom } from '@remix-run/node';
import type { z } from 'zod';
import type { MutateConstructionSchema } from '~/models/construction.schema';
import type { action } from '~/routes/mutate-construction-data.$grcId';
import type { action as insuranceAction } from '~/routes/mutate-insurance-data.$insuranceId';

import { useMutation } from './useMutation';

export function useMutateCalculator(grcId: string, insurance: boolean) {
  async function mutateFn(params: z.infer<typeof MutateConstructionSchema>) {
    const formData = new FormData();
    formData.append('floorArea', params.floorArea.toString());
    formData.append('verandaFloorArea', params.verandaFloorArea.toString());
    formData.append('devYear', params.devYear);
    formData.append('items', JSON.stringify(params.items));

    if (insurance) {
      const response = (await fetch(`/mutate-insurance-data/${grcId}`, {
        method: 'post',
        body: formData,
      }).then((r) => r.json())) as SerializeFrom<typeof insuranceAction>;
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.success;
    }

    const response = (await fetch(`/mutate-construction-data/${grcId}`, {
      method: 'post',
      body: formData,
    }).then((r) => r.json())) as SerializeFrom<typeof action>;
    if (!response.success) {
      throw new Error(response.message);
    }
    return response.success;
  }
  return useMutation({ mutateFn });
}
