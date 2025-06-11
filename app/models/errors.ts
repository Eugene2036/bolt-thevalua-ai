import { z } from 'zod';

const Schema = z.object({
  message: z.string(),
});
export function getErrorMessage(error: unknown) {
  const result = Schema.safeParse(error);
  if (!result.success) {
    return FALLBACK_ERROR_MESSAGE;
  }
  return result.data.message;
}

export const FALLBACK_ERROR_MESSAGE = 'Something went wrong, please try again';
