import type { ActionArgs } from '@remix-run/node';

import { json } from '@remix-run/node';

import { prisma } from '~/db.server';
import { CalculatorSchema } from '~/models/construction.schema';
import { badRequest, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields } from '~/models/forms';

export async function action({ request }: ActionArgs) {
  try {
    const fields = await getRawFormFields(request);
    const result = CalculatorSchema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { id, items, floorArea, verandaFloorArea, devYear } = result.data;
    const currentRecords = await prisma.constructionPropertyItem.findMany({
      where: { propId: id },
      select: { id: true },
    });
    await prisma.$transaction(async (tx) => {
      await tx.constructionProp.update({
        where: { id },
        data: { floorArea, verandaFloorArea, devYear },
      });
      const itemsToDelete = currentRecords.filter((record) => items.every((el) => el.id !== record.id));
      for (let item of itemsToDelete) {
        await tx.constructionPropertyItem.delete({
          where: { id: item.id },
        });
      }

      const newRecords = items.filter((item) => !item.id);
      for (let record of newRecords) {
        await tx.constructionPropertyItem.create({
          data: {
            propId: id,
            element: record.element,
            propertyOption: record.propertyOption,
            qualityOfFinish: record.qualityOfFinish,
          },
        });
      }

      const existingRecords = items.filter((item) => item.id);
      for (let record of existingRecords) {
        await tx.constructionPropertyItem.update({
          where: { id: record.id },
          data: {
            element: record.element,
            propertyOption: record.propertyOption,
            qualityOfFinish: record.qualityOfFinish,
          },
        });
      }
    });

    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}
