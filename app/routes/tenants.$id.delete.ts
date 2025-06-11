import { json, type ActionArgs } from '@remix-run/node';

import { prisma } from '~/db.server';
import { badRequest, getValidatedId } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { requireUserId } from '~/session.server';

export async function action({ request, params }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  try {
    const id = getValidatedId(params.id);
    const record = await prisma.tenant.findUnique({
      where: { id },
    });
    if (!record) {
      throw new Error('Tenant record not found');
    }
    await prisma.$transaction(async (tx) => {
      await tx.tenant.delete({
        where: { id },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Tenant,
          action: EventAction.Delete,
          recordId: record.id,
          recordData: JSON.stringify(record),
        },
      });
    });
    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}
