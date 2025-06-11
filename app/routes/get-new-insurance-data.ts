import { json, type LoaderArgs } from '@remix-run/node';
import { z } from 'zod';

import { prisma } from '~/db.server';
import { getValidated, validateInObj } from '~/models/construction.fns';
import {
  createViaInsurancePromise,
  ensureBoundaryWallPropItems,
  ensureConstructionPropItems,
  ensureExternalWorkPropItems,
  genConstructionPropDBData,
  getYearRangeValues,
  updateConstructionPropKind,
} from '~/models/construction.server';
import { CalculatorKind } from '~/models/construction.types';
import { getNumOrUndefined, getQueryParams } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { requireUser } from '~/session.server';

export async function loader({ request }: LoaderArgs) {
  await requireUser(request);

  const {
    grcId: insuranceId,
    kind,
    plotId: rawPlotId,
    itemId,
    roofTypeId,
    unit: rawUnit,
  } = getQueryParams(request.url, ['grcId', 'kind', 'plotId', 'itemId', 'roofTypeId', 'unit']);

  try {
    const unitResult = z.coerce.number().safeParse(rawUnit);
    if (!unitResult.success) {
      throw new Error('Invalid input given for the unit');
    }
    const unit = unitResult.data;
    if (!rawPlotId) {
      throw new Error('Plot id is missing when getting new insurance data');
    }
    const plotId = rawPlotId;

    const insurance = await (async () => {
      if (insuranceId) {
        return prisma.insurance.findUnique({
          where: { id: insuranceId },
          include: { constructionProp: { include: { items: true } } },
        });
      }
      return createViaInsurancePromise({ plotId, itemId, roofTypeId, unit });
    })()
      .then(async (insuranceOrError) => {
        if (insuranceOrError instanceof Error) {
          throw insuranceOrError;
        }
        if (insuranceOrError === null) {
          throw new Error('Insurance record not found');
        }
        const insurance = insuranceOrError;

        // ensure construction prop items
        if (insurance.constructionProp) {
          const propId = insurance.constructionProp.id;
          const items = insurance.constructionProp.items;
          if (!items.length) {
            const constructionProp = await ensureConstructionPropItems(propId);
            return { ...insurance, constructionProp };
          }

          const isBoundary = kind === CalculatorKind.Boundary_Wall;
          if (isBoundary) {
            const constructionProp = await ensureBoundaryWallPropItems(propId, items);
            if (constructionProp) {
              return { ...insurance, constructionProp };
            }
          }

          const isExternal = kind === CalculatorKind.External_Works_Residential;
          if (isExternal) {
            const constructionProp = await ensureExternalWorkPropItems(propId, items);
            if (constructionProp) {
              return { ...insurance, constructionProp };
            }
          }

          return {
            ...insurance,
            constructionProp: insurance.constructionProp,
          };
        }

        // create missing construction prop
        const updated = await prisma.insurance.update({
          where: { id: insuranceId },
          data: {
            constructionProp: {
              create: genConstructionPropDBData().data,
            },
          },
          include: { constructionProp: { include: { items: true } } },
        });
        const newConstructionProp = updated.constructionProp!;
        return { ...updated, constructionProp: newConstructionProp };
      })
      // validate details
      .then((insurance) => {
        const devYear = getValidated.devYear(insurance.constructionProp.devYear);
        if (!devYear) {
          throw new Error('Invalid value found for devYear, please contact the support team');
        }
        return {
          ...insurance,
          constructionProp: {
            ...insurance.constructionProp,
            devYear,
            floorArea: Number(insurance.constructionProp.floorArea),
            verandaFloorArea: Number(insurance.constructionProp.verandaFloorArea),
            items: insurance.constructionProp.items
              .map((item) => validateInObj.element(item))
              .map((item) => validateInObj.qualityOfFinish(item))
              .filter(Boolean)
              .map((item) => ({
                ...item,
                multiplier: getNumOrUndefined(item.multiplier),
              })),
          },
        };
      });

    // update calculator kind
    const updatedKind = !insurance ? undefined : await updateConstructionPropKind(insurance.constructionProp.id, false, insurance.constructionProp.kind, kind);

    const yearRangeValues = await getYearRangeValues(updatedKind || undefined, true);

    return json({
      success: true,
      data: { kind: updatedKind, grc: insurance, yearRangeValues },
    } as const);
  } catch (error) {
    return json({ success: false, message: getErrorMessage(error) } as const);
  }
}
