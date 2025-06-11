import { json, type LoaderArgs } from '@remix-run/node';
import { z } from 'zod';

import { prisma } from '~/db.server';
import { getValidated, validateInObj } from '~/models/construction.fns';
import {
  createViaGrcPromise,
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
    plotId: rawPlotId,
    grcId,
    kind,
    isBull,
    identifier,
    size: rawSize,
    unit,
  } = getQueryParams(request.url, ['plotId', 'grcId', 'kind', 'isBull', 'identifier', 'size', 'unit']);

  try {
    if (!rawPlotId) {
      throw new Error('Plot id is missing when getting new grc data');
    }
    const plotId = rawPlotId;

    const sizeResult = z.coerce.number().safeParse(rawSize);
    if (!sizeResult.success) {
      throw new Error('Invalid input given for the size');
    }
    const size = sizeResult.data;

    const grc = await (async () => {
      if (grcId) {
        return prisma.grc.findUnique({
          where: { id: grcId },
          include: { constructionProp: { include: { items: true } } },
        });
      }
      return createViaGrcPromise({
        plotId,
        isBull: Boolean(isBull),
        identifier,
        size,
        unit,
      });
    })()
      // handle missing details
      .then(async (grcOrError) => {
        if (grcOrError instanceof Error) {
          throw grcOrError;
        }
        if (!grcOrError) {
          throw new Error('Grc record not found');
        }
        const grc = grcOrError;

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
        const newConstructionProp = updated.constructionProp!;
        return { ...updated, constructionProp: newConstructionProp };
      })
      // validate details
      .then((grc) => {
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
    // if (!grc) {
    //   throw new Error('GRC not found');
    // }

    // update calculator kind
    const updatedKind = !grc ? undefined : await updateConstructionPropKind(grc.constructionProp.id, !!isBull, grc.constructionProp.kind, kind);

    const yearRangeValues = await getYearRangeValues(updatedKind || undefined);

    return json({
      success: true,
      data: { kind: updatedKind, grc, yearRangeValues },
    } as const);
  } catch (error) {
    return json({ success: false, message: getErrorMessage(error) } as const);
  }
}
