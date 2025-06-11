import { redirect, type ActionArgs } from '@remix-run/node';
import { z } from 'zod';

import { prisma } from '~/db.server';
import { badRequest, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';

export const StandardReportHeaderSchema = z.object({
  templateId: z.string().min(1),
});
export async function action({ request }: ActionArgs) {
  try {
    const fields = await getRawFormFields(request);
    const result = StandardReportHeaderSchema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { templateId } = result.data;

    const outgoingIdentifiers = [
      ['Summary of Valuation', ''],
      ['Scope of Work', ''],
      ['Bases of Value', ''],
      ['Property Details', ''],
      ['Scope of Equity', ''],
      ['Opinion of Value', ''],
      ['Property Images', ''],
    ];

    const outgoings = await prisma.reportHeader.findMany({
      where: { reportTemplateId: templateId },
      select: { headerTitle: true },
    });

    const missingOutgoings = outgoingIdentifiers.filter((el) => outgoings.every((outgoing) => outgoing.headerTitle !== el[0]));

    await prisma.reportHeader.createMany({
      data: missingOutgoings.map((outgoing) => ({
        reportTemplateId: templateId,
        headerTitle: outgoing[0],
      })),
    });

    return redirect(AppLinks.EditReportTemplate(templateId));
    // return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}
