import { json, type ActionArgs } from '@remix-run/node';

import { prisma } from '~/db.server';
import { badRequest, getValidatedId, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { UpdateInspectionDateSchema } from '~/models/plots.validations';
import { requireUserId } from '~/session.server';

export async function action({ request, params }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  try {
    const id = getValidatedId(params.plotId);
    const fields = await getRawFormFields(request);
    const result = UpdateInspectionDateSchema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { newDate } = result.data;

    await prisma.$transaction(async (tx) => {
      const updated = await tx.plot.update({
        where: { id },
        data: { inspectionDate: newDate },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Plot,
          action: EventAction.Update,
          recordId: updated.id,
          recordData: JSON.stringify(updated),
        },
      });
    });
    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}
