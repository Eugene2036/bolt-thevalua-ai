import { json, type ActionArgs } from '@remix-run/node';

import { prisma } from '~/db.server';
import { badRequest, getValidatedId, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { TenantSchema } from '~/models/tenants.validations';
import { requireUserId } from '~/session.server';

export async function action({ request, params }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  try {
    const id = getValidatedId(params.id);
    const fields = await getRawFormFields(request);
    const result = TenantSchema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.tenant.update({
        where: { id },
        data: result.data,
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Tenant,
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
