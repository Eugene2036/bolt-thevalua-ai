import { z } from "zod";

export const ReportCommentSchema = z.object({
  userId: z.string().min(1),
  fullName: z.string().min(1),
  plotId: z.string().min(1),
  comment: z.string().min(1).max(4000),
  date: z.coerce.date(),
});

export function getValidatedComments (data: unknown) {
  const result = ReportCommentSchema.array().safeParse(data);
  if (!result.success) {
    return [];
  }
  return result.data;
}