import { json, type ActionArgs } from '@remix-run/node';

import { prisma } from '~/db.server';
import { UpdateRangeValuesSchema } from '~/models/construction.schema';
import { badRequest, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields } from '~/models/forms';
import { requireUserId } from '~/session.server';

export async function action({ request }: ActionArgs) {
  await requireUserId(request);
  try {
    const fields = await getRawFormFields(request);
    const result = UpdateRangeValuesSchema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { rangeValues } = result.data;

    await prisma.$transaction(async (tx) => {
      const currentRecords = await tx.yearRangeValue.findMany();
      const itemsToDelete = currentRecords.filter((r) => {
        return rangeValues.every((v) => v.identifier !== r.identifier);
      });
      for (let item of itemsToDelete) {
        await tx.yearRangeValue.delete({
          where: { id: item.id },
        });
      }

      const newItems = rangeValues.filter((v) => {
        return currentRecords.every((r) => r.identifier !== v.identifier);
      });
      for (let item of newItems) {
        await tx.yearRangeValue.create({
          data: {
            identifier: item.identifier,
            first: item.first,
            second: item.second,
            third: item.third,
          },
        });
      }

      const existingItems = rangeValues
        .map((v) => {
          const match = currentRecords.find((r) => r.identifier === v.identifier);
          return { id: match?.id, ...v };
        })
        .filter(Boolean);
      for (let item of existingItems) {
        await tx.yearRangeValue.update({
          where: { id: item.id },
          data: { ...item },
        });
      }
    });

    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}
