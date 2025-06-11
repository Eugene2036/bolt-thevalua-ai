import { json, type ActionArgs } from '@remix-run/node';

import { prisma } from '~/db.server';
import { badRequest, getValidatedId, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { ParkingSchema } from '~/models/tenants.validations';
import { requireUserId } from '~/session.server';

export async function action({ request, params }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  try {
    const id = getValidatedId(params.id);
    const fields = await getRawFormFields(request);
    const result = ParkingSchema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }

    const record = prisma.parking.findUnique({
      where: { id },
    });
    await prisma.$transaction(async (tx) => {
      const updated = await tx.parking.update({
        where: { id },
        data: result.data,
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Parking,
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
