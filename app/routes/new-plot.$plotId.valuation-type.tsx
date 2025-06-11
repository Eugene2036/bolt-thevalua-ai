import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { Response, json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import { Check } from 'tabler-icons-react';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import BackButton from '~/components/BackButton';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { Card } from '~/components/Card';
import { CardHeader } from '~/components/CardHeader';
import { InlineAlert } from '~/components/InlineAlert';
import NextButton from '~/components/NextButton';
import { PrimaryButton } from '~/components/PrimaryButton';
import { SecondaryButton } from '~/components/SecondaryButton';
import { prisma } from '~/db.server';
import useActionErrors from '~/hooks/useActionErrors';
import { StatusCode, badRequest, getValidatedId, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { ValuationType } from '~/models/plots.validations';
import { requireUserId } from '~/session.server';

export async function loader({ request, params }: LoaderArgs) {
  const plot = await prisma.plot.findUnique({
    where: { id: getValidatedId(params.plotId) },
  });
  if (!plot) {
    throw new Response('Plot record not found', {
      status: StatusCode.NotFound,
    });
  }
  const { valuationType } = plot;

  return json({ valuationType });
}

const Schema = z.object({
  valuationType: z.string(),
});
export const action = async ({ request, params }: ActionArgs) => {
  const currentUserId = await requireUserId(request);
  const id = getValidatedId(params.plotId);

  try {
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { valuationType } = result.data;

    const record = await prisma.plot.findUnique({
      where: { id },
    });
    await prisma.$transaction(async (tx) => {
      const updated = await tx.plot.update({
        where: { id },
        data: { valuationType },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Plot,
          action: EventAction.Update,
          recordId: id,
          recordData: JSON.stringify({ from: record, to: updated }),
        },
      });
    });
    // return redirect(AppLinks.ClientType(id));
    return redirect(AppLinks.Instruction(id));
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
};

export default function NewPlotValuationType() {
  const { valuationType } = useLoaderData<typeof loader>();

  const [valType, setValType] = useState<string | undefined>(valuationType || undefined);
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);
  const actionErrors = useActionErrors(fetcher.data);

  const options = [ValuationType.Commercial, ValuationType.Residential];

  return (
    <fetcher.Form method="post" className="flex flex-col items-center h-full">
      <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
        <input type="hidden" {...getNameProp('valuationType')} value={valType} />
        <Card>
          <CardHeader className="flex flex-col items-center gap-10">
            <h2 className="text-xl font-semibold">1. Select Type of Valuation</h2>
          </CardHeader>
          <div className="flex flex-col items-stretch p-10 gap-10">
            <div className="flex flex-col justify-center items-center">
              <span className="text-lg font-light text-center text-stone-400">Select either of the options below and then click 'NEXT'</span>
            </div>
            <div className="flex flex-row justify-center items-center gap-8">
              {options.map((option) => {
                if (valType === option) {
                  return (
                    <PrimaryButton key={option} type="button" className="flex flex-row gap-4" onClick={() => setValType(option)}>
                      <Check className="text-white" />
                      {option}
                    </PrimaryButton>
                  );
                }
                return (
                  <SecondaryButton key={option} type="button" onClick={() => setValType(option)}>
                    {option}
                  </SecondaryButton>
                );
              })}
            </div>
            {!!actionErrors && <InlineAlert>{actionErrors}</InlineAlert>}
          </div>
          <CardHeader className="flex flex-row items-center gap-10" topBorder>
            <BackButton disabled />
            <div className="grow" />
            <NextButton type="submit" isProcessing={isProcessing} />
          </CardHeader>
        </Card>
      </ActionContextProvider>
    </fetcher.Form>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
