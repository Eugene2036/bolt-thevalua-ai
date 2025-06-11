import { json, type ActionArgs } from '@remix-run/node';

import { prisma } from '~/db.server';
import { badRequest, getValidatedId, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { OutgoingSchema } from '~/models/tenants.validations';
import { requireUserId } from '~/session.server';

export async function action({ request, params }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  try {
    const id = getValidatedId(params.id);
    const fields = await getRawFormFields(request);
    const result = OutgoingSchema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { identifier, unitPerClient, ratePerClient } = result.data;

    const record = await prisma.outgoing.findUnique({
      where: { id },
    });
    await prisma.$transaction(async (tx) => {
      const updated = await tx.outgoing.update({
        where: { id },
        data: { identifier, unitPerClient, ratePerClient },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Outgoing,
          action: EventAction.Update,
          recordId: id,
          recordData: JSON.stringify({ from: record, to: updated }),
        },
      });
    });
    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}
