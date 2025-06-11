import { redirect, type ActionArgs } from '@remix-run/node';
import { z } from 'zod';

import { prisma } from '~/db.server';
import { badRequest, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';

export const StandardOutgoingsSchema = z.object({
  plotId: z.string().min(1),
});
export async function action({ request }: ActionArgs) {
  try {
    const fields = await getRawFormFields(request);
    const result = StandardOutgoingsSchema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { plotId } = result.data;

    const outgoingIdentifiers = [
      ['Rates', '1'],
      ['Levies', '12'],
      ['Electricity and Water in Common Areas', '12'],
      ['Maintenance and Repairs', '%'],
      ['Refurbishment', '1'],
      ['Management Fee', '%'],
      ['Auditors Fee', '1'],
      ['Insurance', '%'],
      ['Security Services', '12'],
      ['Cleaning Services', '12'],
      ['Maintenance - Lift', '12'],
      ['Maintenance - A/C', '12'],
    ];

    const outgoings = await prisma.outgoing.findMany({
      where: { plotId },
      select: { identifier: true },
    });

    const missingOutgoings = outgoingIdentifiers.filter((el) => outgoings.every((outgoing) => outgoing.identifier !== el[0]));

    await prisma.outgoing.createMany({
      data: missingOutgoings.map((outgoing) => ({
        plotId,
        identifier: outgoing[0],
        itemType: outgoing[1],
        unitPerClient: 0,
        ratePerClient: 0,
        unitPerMarket: 0,
        ratePerMarket: 0,
      })),
    });

    return redirect(AppLinks.PlotIncome(plotId));
    // return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}
