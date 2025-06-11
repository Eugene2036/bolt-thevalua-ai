import { json, type LoaderArgs } from '@remix-run/node';
import { z } from 'zod';

import { prisma } from '~/db.server';
import { badRequest, getQueryParams, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';

export const FilterComparablesSchema = z.object({
  propertyType: z.string().optional(),
  location: z.string().optional(),
  suburb: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  plotNumber: z.string().optional(),
  fromPrice: z.coerce.number().optional(),
  toPrice: z.coerce.number().optional(),
  fromPlotSize: z.coerce.number().optional(),
  toPlotSize: z.coerce.number().optional(),
  titleDeed: z.string().optional(),
  status: z.string().optional(),
});

export async function loader({ request }: LoaderArgs) {
  try {
    const paramNames: (keyof z.infer<typeof FilterComparablesSchema>)[] = [
      'propertyType',
      'location',
      'suburb',
      'fromDate',
      'toDate',
      'plotNumber',
      'fromPrice',
      'toPrice',
      'fromPlotSize',
      'toPlotSize',
      'titleDeed',
      'status',
    ];
    const queryParams = getQueryParams(request.url, paramNames);
    const result = FilterComparablesSchema.safeParse(queryParams);
    if (!result.success) {
      return processBadRequest(result.error, queryParams);
    }
    const { propertyType, location, suburb, fromDate, toDate, plotNumber, fromPrice, toPrice, fromPlotSize, toPlotSize, titleDeed, status } = result.data;

    const records = await prisma.comparablePlot.findMany({
      where: {
        plotNumber,
        plotExtent: { gt: fromPlotSize, lt: toPlotSize },
        propertyType,
        location: { contains: location },
        suburb: { contains: suburb },
        price: { gt: fromPrice, lt: toPrice },
        transactionDate: { gt: fromDate, lt: toDate },
        titleDeed: { contains: titleDeed },
        status: { contains: status },
      },
    });

    return json({ comparables: records });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}
