import type { ActionArgs } from '@remix-run/node';

import { redirect } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
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
import useActionErrors from '~/hooks/useActionErrors';
import { badRequest, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';
import { TabPanel, TabView } from 'primereact/tabview';

const Schema = z.object({
  // plotNum: z.string().min(1, "Plot number is required"),
  clientType: z.string().min(1, "Client type is required"),
});

export const action = async ({ request }: ActionArgs) => {
  const currentUserId = await requireUserId(request);

  try {
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }

    const { clientType } = result.data;

    return redirect(AppLinks.CreateInstructionsClientDetails(clientType));
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
};

export default function PlotClientType() {
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);
  const actionErrors = useActionErrors(fetcher.data);

  const [clientType, setClientType] = useState('');

  const options = ['Individual', 'Organisation'];

  const [plotNum, setPlotNum] = useState('10001');

  const [activeIndex, setActiveIndex] = useState(2);

  return (
    <div className="grid grid-cols-3 gap-4 p-6 pt-2 bg-gray-50">
      <div className="flex flex-col items-stretch gap-6 col-span-3 pt-2">
        <TabView className="custom-tabview" activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.BankerAnalytics;
                }}
              >
                Cockpit
              </span>
            }
            className="p-2"
            headerClassName={`${activeIndex === 0 ? 'active-tab' : 'default-tab'}`}
          >
          </TabPanel>
          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.Instructions;
                }}
              >
                Instructions
              </span>
            }
            className="p-2"
            headerClassName={`${activeIndex === 1 ? 'active-tab' : 'default-tab'}`}
          >
          </TabPanel>

          <TabPanel header="Creating Instruction" className="p-2" headerClassName={activeIndex === 2 ? 'active-tab' : 'default-tab'}>
            <fetcher.Form method="post" className="flex flex-col items-stretch gap-6">
              <ActionContextProvider {...fetcher.data} fields={fetcher.data?.fields} isSubmitting={isProcessing}>
                <input type="hidden" {...getNameProp('clientType')} value={clientType} />
                <Card>
                  <CardHeader className="flex flex-col items-center gap-4">
                    <h2 className="text-xl font-semibold">Select Client Type</h2>
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
              </ActionContextProvider>
            </fetcher.Form>
          </TabPanel>
          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.ValuationReports;
                }}
              >
                Valuation Reports
              </span>
            }
            className="p-2"
            headerClassName={`${activeIndex === 3 ? 'active-tab' : 'default-tab'}`}
          >
          </TabPanel>

        </TabView>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}