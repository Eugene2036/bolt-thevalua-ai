import { json, type ActionArgs } from '@remix-run/node';

import { prisma } from '~/db.server';
import { badRequest, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { AddTenantSchema } from '~/models/tenants.validations';
import { requireUserId } from '~/session.server';

export async function action({ request, params }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  try {
    const fields = await getRawFormFields(request);
    const result = AddTenantSchema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }

    await prisma.$transaction(async (tx) => {
      const record = await tx.tenant.create({
        data: {
          ...result.data,
          grossRatePerValuer: 1,
        },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Tenant,
          action: EventAction.Update,
          recordId: record.id,
          recordData: JSON.stringify(record),
        },
      });
    });
    return json({
      success: true,
      fields: {
        name: '-',
        termOfLease: '',
        startDate: '',
        endDate: '',
        grossMonthlyRental: '',
        escalation: '',
        propertyTypeId: '',
        areaPerClient: '',
        areaPerMarket: '',
        grossRatePerValuer: '',
      },
    });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}
