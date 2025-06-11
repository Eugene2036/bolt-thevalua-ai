import type { CalculatorKind } from '~/models/construction.types';

import { json, type ActionArgs } from '@remix-run/node';

import { prisma } from '~/db.server';
import { getCalculatorRate } from '~/models/construction.fns';
import { NewMutateConstructionSchema } from '~/models/construction.schema';
import { createViaInsurancePromise, getYearRangeValues } from '~/models/construction.server';
import { getValidatedId, isNullOrUndefined } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields } from '~/models/forms';

export async function action({ request, params }: ActionArgs) {
  try {
    const id = !params.insuranceId ? undefined : getValidatedId(params.insuranceId);
    const fields = await getRawFormFields(request);
    const result = NewMutateConstructionSchema.safeParse(fields);
    if (!result.success) {
      throw new Error(result.error.message);
    }
    const { plotId, items, floorArea, verandaFloorArea, devYear } = result.data;

    const insuranceOrError = await (async () => {
      console.log('insurance ID >>>', id);
      if (id) {
        return prisma.insurance.findUnique({
          where: { id },
          include: { constructionProp: { include: { items: true } } },
        });
      }
      return createViaInsurancePromise({
        plotId,
        itemId: undefined,
        roofTypeId: undefined,
        unit: undefined,
      });
    })();
    if (insuranceOrError instanceof Error) {
      throw insuranceOrError;
    }
    const insurance = insuranceOrError;
    if (!insurance) {
      throw new Error('Insurance record not found');
    }
    if (!insurance.constructionProp) {
      throw new Error('Construction prop record not found');
    }

    const propId = insurance.constructionProp.id;
    const calculatorKind = insurance.constructionProp.kind as unknown as CalculatorKind;

    const currentRecords = await prisma.constructionPropertyItem.findMany({
      where: { propId },
      select: { id: true },
    });

    const yearRangeValues = await getYearRangeValues(insurance.constructionProp?.kind || undefined);

    const { costPerSqMQuality } = getCalculatorRate(
      calculatorKind,
      items.map((i) => ({
        ...i,
        multiplier: isNullOrUndefined(i.multiplier) || i.multiplier === '' ? undefined : i.multiplier,
      })),
      devYear,
      floorArea,
      verandaFloorArea,
      yearRangeValues,
    );

    await prisma.$transaction(async (tx) => {
      await tx.insurance.update({
        where: { id: insurance.id },
        data: { rate: costPerSqMQuality },
      });
      await tx.constructionProp.update({
        where: { id: propId },
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
            propId,
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
            multiplier: record.multiplier,
          },
        });
      }
    });

    return json({ success: true, message: undefined } as const);
  } catch (error) {
    console.error('mutate insurance error >>>', error);
    return json({ success: false, message: getErrorMessage(error) } as const);
  }
}
