import { json, type ActionArgs } from '@remix-run/node';
import { z } from 'zod';

import { prisma } from '~/db.server';
import { badRequest, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { PropertyDetailsSchema } from '~/models/plots.validations';
import { requireUserId } from '~/session.server';

const Schema = PropertyDetailsSchema.merge(
  z.object({
    id: z.string().min(1),
  }),
);
export async function action({ request }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  try {
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { id } = result.data;

    const record = await prisma.plot.findUnique({
      where: { id },
    });
    await prisma.$transaction(async (tx) => {
      await tx.plot.update({
        where: { id },
        data: { ...result.data },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Plot,
          action: EventAction.Update,
          recordId: id,
          recordData: JSON.stringify({ from: record, to: result.data }),
        },
      });
    });

    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}
