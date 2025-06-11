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
  const grcId = getValidatedId(params.grcId);

  const { kind, isBull } = getQueryParams(request.url, ['kind', 'isBull']);

  try {
    const grc = await prisma.grc
      .findUnique({
        where: { id: grcId },
        include: { constructionProp: { include: { items: true } } },
      })
      // handle missing details
      .then(async (grc) => {
        if (!grc) {
          return;
        }

        // ensure construction prop items
        if (grc.constructionProp) {
          const propId = grc.constructionProp.id;
          const items = grc.constructionProp.items;
          if (!items.length) {
            const constructionProp = await ensureConstructionPropItems(propId);
            return { ...grc, constructionProp };
          }

          const isBoundary = kind === CalculatorKind.Boundary_Wall;
          if (isBoundary) {
            const constructionProp = await ensureBoundaryWallPropItems(propId, items);
            if (constructionProp) {
              return { ...grc, constructionProp };
            }
          }

          const isExternal = kind === CalculatorKind.External_Works_Residential;
          if (isExternal) {
            const constructionProp = await ensureExternalWorkPropItems(propId, items);
            if (constructionProp) {
              return { ...grc, constructionProp };
            }
          }

          return { ...grc, constructionProp: grc.constructionProp };
        }

        // create missing construction prop
        const updated = await prisma.grc.update({
          where: { id: grcId },
          data: {
            constructionProp: {
              create: genConstructionPropDBData().data,
            },
          },
          include: { constructionProp: { include: { items: true } } },
        });
        if (updated.constructionProp) {
          return { ...updated, constructionProp: updated.constructionProp };
        }
      })
      // validate details
      .then((grc) => {
        if (!grc) {
          return;
        }
        const devYear = getValidated.devYear(grc.constructionProp.devYear);
        if (!devYear) {
          throw new Error('Invalid value found for devYear, please contact the support team');
        }
        return {
          ...grc,
          constructionProp: {
            ...grc.constructionProp,
            devYear,
            floorArea: Number(grc.constructionProp.floorArea),
            verandaFloorArea: Number(grc.constructionProp.verandaFloorArea),
            items: grc.constructionProp.items
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
    if (!grc) {
      throw new Error('GRC not found');
    }

    // update calculator kind
    const updatedKind = await updateConstructionPropKind(grc.constructionProp.id, !!isBull, grc.constructionProp.kind, kind);

    const yearRangeValues = await getYearRangeValues(updatedKind || undefined);

    return json({
      success: true,
      data: { kind: updatedKind, grc, yearRangeValues },
    } as const);
  } catch (error) {
    return json({ success: false, message: getErrorMessage(error) } as const);
  }
}
