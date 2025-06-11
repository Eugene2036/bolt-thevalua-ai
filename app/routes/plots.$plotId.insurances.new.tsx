import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { faker } from '@faker-js/faker';
import { json } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { Breadcrumb } from '~/components/Breadcrumb';
import { Chip } from '~/components/Chip';
import { FormSelect } from '~/components/FormSelect';
import { FormTextField } from '~/components/FormTextField';
import { InlineAlert } from '~/components/InlineAlert';
import { PrimaryButton } from '~/components/PrimaryButton';
import { prisma } from '~/db.server';
import { ComposeRecordIdSchema, badRequest, getValidatedId, hasSuccess, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields, hasFields, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';

export async function loader({ params }: LoaderArgs) {
  const plotId = getValidatedId(params.plotId);

  const [insuranceItems, roofTypes, numInsuranceRecords] = await Promise.all([
    prisma.insuranceItem.findMany({
      select: { id: true, identifier: true },
    }),
    prisma.roofType.findMany({
      select: { id: true, identifier: true },
    }),
    prisma.insurance.count({
      where: { plotId },
    }),
  ]);
  return json({ insuranceItems, roofTypes, numInsuranceRecords, plotId });
}

const Schema = z.object({
  itemId: ComposeRecordIdSchema('insurance item'),
  roofTypeId: ComposeRecordIdSchema('roof type').or(z.literal('')),
  rate: z.coerce.number().min(0),
});
export const action = async ({ request, params }: ActionArgs) => {
  const plotId = getValidatedId(params.plotId);

  try {
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { itemId, roofTypeId, rate } = result.data;

    await prisma.insurance.create({
      data: {
        plotId,
        itemId,
        roofTypeId: roofTypeId || undefined,
        rate,
      },
    });

    return json({
      success: true,
      fields: {
        itemId: '',
        roofTypeId: '',
        rate: '',
      },
    });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
};

export default function NewInsurancesPage() {
  const { insuranceItems, roofTypes, numInsuranceRecords, plotId } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      toast.success('Insurance details recorded successfully');
    }
  }, [fetcher.data]);

  const defaultValues: Record<keyof z.infer<typeof Schema>, string | undefined> = {
    itemId: insuranceItems[0]?.id || '',
    roofTypeId: roofTypes[0]?.id || '',
    rate: faker.finance.amount(),
  };

  return (
    <fetcher.Form method="post" className="flex grow flex-col items-stretch gap-0">
      <ActionContextProvider {...fetcher.data} fields={hasFields(fetcher.data) ? fetcher.data.fields : defaultValues} isSubmitting={isProcessing}>
        <div className="flex flex-row items-center py-4">
          <Breadcrumb
            items={[
              {
                link: AppLinks.PlotInsurance(plotId),
                label: 'Insurance Details',
              },
              'Add Details',
            ]}
          />
          <div className="grow" />
          <Chip className="py-1">
            <span className="font-light">{numInsuranceRecords} insurance record(s) so far</span>
          </Chip>
        </div>
        <div className="grow flex flex-col items-stretch gap-6 overflow-auto">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col items-stretch col-span-2">
              <FormSelect {...getNameProp('itemId')} label="Item" required>
                {insuranceItems.map((insuranceItem) => (
                  <option key={insuranceItem.id} value={insuranceItem.id}>
                    {insuranceItem.identifier}
                  </option>
                ))}
              </FormSelect>
            </div>
            <FormSelect {...getNameProp('roofTypeId')} label="Roof Type" required>
              {roofTypes.map((roofType) => (
                <option key={roofType.id} value={roofType.id}>
                  {roofType.identifier}
                </option>
              ))}
            </FormSelect>
            <FormTextField {...getNameProp('rate')} type="number" step="0.01" label="Rate" required />
          </div>
          {hasFormError(fetcher.data) && <InlineAlert>{fetcher.data.formError}</InlineAlert>}
          <div className="grow" />
          <div className="flex flex-col items-stretch">
            <PrimaryButton type="submit">{isProcessing ? 'Saving...' : 'Save'}</PrimaryButton>
          </div>
        </div>
      </ActionContextProvider>
    </fetcher.Form>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
