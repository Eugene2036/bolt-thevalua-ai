import { json, type ActionArgs } from '@remix-run/node';

import { prisma } from '~/db.server';
import { badRequest, getValidatedId, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { UpdateStoredValueSchema } from '~/models/plots.validations';
import { requireUserId } from '~/session.server';

export async function action({ request, params }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  try {
    const plotId = getValidatedId(params.plotId);
    const fields = await getRawFormFields(request);
    const result = UpdateStoredValueSchema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { id, identifier, value } = result.data;

    const storedValue = await prisma.storedValue.findUnique({
      where: { id },
      select: { id: true },
    });

    if (storedValue) {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.storedValue.update({
          where: { id },
          data: { identifier, value },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.StoredValue,
            action: EventAction.Update,
            recordId: updated.id,
            recordData: JSON.stringify(updated),
          },
        });
      });
    } else {
      await prisma.$transaction(async (tx) => {
        const record = await tx.storedValue.create({
          data: { identifier, value, plotId },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.StoredValue,
            action: EventAction.Create,
            recordId: record.id,
            recordData: JSON.stringify(record),
          },
        });
      });
    }

    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}
