import type { ActionArgs } from '@remix-run/node';
import type { FormFields } from '~/models/forms';

import { redirect } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import BackButton from '~/components/BackButton';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { Card } from '~/components/Card';
import { CardHeader } from '~/components/CardHeader';
import { FormTextField } from '~/components/FormTextField';
import { InlineAlert } from '~/components/InlineAlert';
import NextButton from '~/components/NextButton';
import { prisma } from '~/db.server';
import { badRequest, getValidatedId, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';
import { FormTextArea } from '~/components/FormTextArea';

const Schema = z.object({
  purpose: z.string().min(1),
  basesOfValue: z.string().min(1),
  interest: z.string().min(1),

});
export const action = async ({ params, request }: ActionArgs) => {
  const currentUserId = await requireUserId(request);

  const plotId = getValidatedId(params.plotId);

  try {
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }

    await prisma.$transaction(async (tx) => {
      const record = await tx.instruction.create({
        data: {
          ...result.data,
          plotId,
          plotNumber: '',
          town: '',
          village: '',
          city: '',
          country: '',
        },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Instruction,
          action: EventAction.Create,
          recordId: record.id,
          recordData: JSON.stringify(record),
        },
      });
    });

    return redirect(AppLinks.ClientType(plotId));
    // return redirect(AppLinks.PlotSummary(plotId));
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
};

export default function PlotInstructionPage() {
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const defaultValues: FormFields<keyof z.infer<typeof Schema>> = {
    purpose: '',
    basesOfValue: '',
    interest: '',

  };

  return (
    <fetcher.Form method="post" className="flex flex-col items-stretch gap-6">
      <ActionContextProvider {...fetcher.data} fields={fetcher.data?.fields || defaultValues} isSubmitting={isProcessing}>
        <Card>
          <CardHeader className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-semibold">2. Instruction</h2>
          </CardHeader>
          <div className="flex flex-col items-stretch p-4">
            <div className="grid grid-cols-3 gap-6">
              <FormTextArea {...getNameProp('purpose')} label="Purpose Of Valuation" required />
              <FormTextArea {...getNameProp('basesOfValue')} label="Bases Of Value" required />
              <FormTextArea {...getNameProp('interest')} label="Interest Being Valued" required />
            </div>
            {hasFormError(fetcher.data) && <InlineAlert>{fetcher.data.formError}</InlineAlert>}
          </div>
          <CardHeader className="flex flex-row items-center gap-4" topBorder>
            <BackButton />
            <div className="grow" />
            <NextButton type="submit" isProcessing={isProcessing}>
              NEXT
            </NextButton>
          </CardHeader>
        </Card>
      </ActionContextProvider>
    </fetcher.Form>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
