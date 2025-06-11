import { json, type ActionArgs } from '@remix-run/node';

import { prisma } from '~/db.server';
import { badRequest, processBadRequest, AddGrcFeeSchema } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { requireUserId } from '~/session.server';

export async function action({ request, params }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  try {
    const fields = await getRawFormFields(request);
    const result = AddGrcFeeSchema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }

    await prisma.$transaction(async (tx) => {
      const record = await tx.grcFee.create({
        data: { ...result.data },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.GrcFee,
          recordId: record.id,
          action: EventAction.Create,
          recordData: JSON.stringify(record),
        },
      });
    });

    return json({
      success: true,
      fields: {
        identifier: '',
        perc: '',
        plotId: '',
      },
    });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}
