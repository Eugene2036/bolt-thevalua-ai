import { json, type LoaderArgs } from '@remix-run/node';

import { prisma } from '~/db.server';
import { getValidated, validateInObj } from '~/models/construction.fns';
import {
  ensureBoundaryWallPropItems,
  ensureConstructionPropItems,
  ensureExternalWorkPropItems,
  genConstructionPropDBData,
  getYearRangeValues,
  updateConstructionPropKind,
} from '~/models/construction.server';
import { CalculatorKind } from '~/models/construction.types';
import { getNumOrUndefined, getQueryParams, getValidatedId } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { requireUser } from '~/session.server';

export async function loader({ request, params }: LoaderArgs) {
  await requireUser(request);
  const insuranceId = getValidatedId(params.insuranceId);

  const { kind } = getQueryParams(request.url, ['kind']);

  try {
    const insurance = await prisma.insurance
      .findUnique({
        where: { id: insuranceId },
        include: { constructionProp: { include: { items: true } } },
      })
      // handle missing details
      .then(async (insurance) => {
        if (!insurance) {
          return;
        }

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

          return { ...insurance, constructionProp: insurance.constructionProp };
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
        if (!insurance) {
          return;
        }
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
    if (!insurance) {
      throw new Error('Insurance record not found');
    }

    // update calculator kind
    const updatedKind = await updateConstructionPropKind(insurance.constructionProp.id, false, insurance.constructionProp.kind, kind);

    const yearRangeValues = await getYearRangeValues(updatedKind || undefined);

    return json({
      success: true,
      data: { kind: updatedKind, grc: insurance, yearRangeValues },
    } as const);
  } catch (error) {
    return json({ success: false, message: getErrorMessage(error) } as const);
  }
}
