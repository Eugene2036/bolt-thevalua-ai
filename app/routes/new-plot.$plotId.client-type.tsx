import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { FormFields } from '~/models/forms';

import { faker } from '@faker-js/faker';
import { json, redirect } from '@remix-run/node';
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
import { badRequest, getValidatedId, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';
import { TabPanel, TabView } from 'primereact/tabview';

export async function loader({ request, params }: LoaderArgs) {
  await requireUserId(request);
  const client = await prisma.client.findFirst({
    where: { plotId: getValidatedId(params.plotId) },
    select: { clientType: true },
  });
  return json({ details: client || undefined, plotId: params.plotId });
}

const Schema = z.object({
  clientType: z.string().min(1),
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
    const { clientType } = result.data;

    const client = await prisma.client.findFirst({
      where: { plotId },
    });
    if (!client) {
      await prisma.$transaction(async (tx) => {
        const record = await tx.client.create({
          data: {
            plotId,
            clientType,
            postalAddress: '',
            phyAddress: '',
            email: '',
            telephone: '',
            firstName: '',
            lastName: '',
          },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Client,
            action: EventAction.Create,
            recordId: record.id,
            recordData: JSON.stringify(record),
          },
        });
      });
    } else {
      const record = await prisma.client.findUnique({
        where: { id: client.id },
      });
      await prisma.$transaction(async (tx) => {
        const updated = await tx.client.update({
          where: { id: client.id },
          data: {
            plotId,
            clientType,
          },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Client,
            action: EventAction.Update,
            recordId: client.id,
            recordData: JSON.stringify({ from: record, to: updated }),
          },
        });
      });
    }

    return redirect(AppLinks.ClientDetails(plotId));
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
};

export default function PlotClientType() {
  const { details, plotId } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);
  const actionErrors = useActionErrors(fetcher.data);

  const [clientType, setClientType] = useState<string | undefined>(details?.clientType || undefined);

  const defaultValues: FormFields<keyof z.infer<typeof Schema>> = details ? { clientType: details.clientType } : { clientType: faker.lorem.word() };

  const options = ['Individual', 'Organisation'];

  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);

  return (
    <fetcher.Form method="post" className="flex flex-col items-stretch gap-6">
      <ActionContextProvider {...fetcher.data} fields={fetcher.data?.fields || defaultValues} isSubmitting={isProcessing}>
        <input type="hidden" {...getNameProp('clientType')} value={clientType} />
        <TabView className="custom-tabview" activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.ClientType(plotId!);
                }}
              >
                Client Type
              </span>
            }
            className="p-2" headerClassName={activeIndex === 0 ? 'active-tab' : 'default-tab'}
          >
            <Card>
              <CardHeader className="flex flex-col items-center gap-4">
                <h2 className="text-xl font-semibold">1. Client Type</h2>
              </CardHeader>
              <div className="flex flex-col items-stretch p-4">
                <div className="flex flex-col items-stretch p-10 gap-10">
                  <div className="flex flex-col justify-center items-center">
                    <span className="text-lg font-light text-center text-stone-400">Select either of the options below and then click 'NEXT'</span>
                  </div>
                  <div className="flex flex-row justify-center items-center gap-8">
                    {options.map((option) => {
                      if (clientType === option) {
                        return (
                          <PrimaryButton key={option} type="button" className="flex flex-row gap-4" onClick={() => setClientType(option)}>
                            <Check className="text-white" />
                            {option}
                          </PrimaryButton>
                        );
                      }
                      return (
                        <SecondaryButton key={option} type="button" onClick={() => setClientType(option)}>
                          {option}
                        </SecondaryButton>
                      );
                    })}
                  </div>
                  {!!actionErrors && <InlineAlert>{actionErrors}</InlineAlert>}
                </div>
              </div>
              <CardHeader className="flex flex-row items-center gap-4" topBorder>
                <BackButton />
                <div className="grow" />
                <NextButton type="submit" isProcessing={isProcessing} />
              </CardHeader>
            </Card>
          </TabPanel>
          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.ClientDetails(plotId!);
                }}
              >
                Client Details
              </span>
            }
            className="p-2"
            headerClassName={`${activeIndex === 1 ? 'active-tab' : 'default-tab'}`}
          >
          </TabPanel>
          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.ValuerDetails(plotId!);
                }}
              >
                Valuer Details
              </span>
            }
            className="p-2"
            headerClassName={`${activeIndex === 2 ? 'active-tab' : 'default-tab'}`}
          >
          </TabPanel>

          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.ValuerDetails(plotId!);
                }}
              >
                Asset Details
              </span>
            }
            disabled
            className="p-2"
            // headerClassName={`${activeIndex === 2 ? 'active-tab' : 'default-tab'}`}
            headerClassName={'disabled-tab'}
          >
          </TabPanel>

          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.ValuerDetails(plotId!);
                }}
              >
                Report Content
              </span>
            }
            disabled
            className="p-2"
            // headerClassName={`${activeIndex === 2 ? 'active-tab' : 'default-tab'}`}
            headerClassName={'disabled-tab'}
          >
          </TabPanel>

          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.SecondValuationReport(plotId!);
                }}
              >
                Report Preview
              </span>
            }
            disabled
            className="p-2 cursor-not-allowed"
            headerClassName={'disabled-tab'}
          >
          </TabPanel>

        </TabView>
      </ActionContextProvider>
    </fetcher.Form>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
