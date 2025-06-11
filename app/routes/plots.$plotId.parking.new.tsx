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
import { SecondaryButtonLink } from '~/components/SecondaryButton';
import { prisma } from '~/db.server';
import { ComposeRecordIdSchema, badRequest, getValidatedId, hasSuccess, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields, hasFields, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';

export async function loader({ request, params }: LoaderArgs) {
  const plotId = getValidatedId(params.plotId);

  const [parkingTypes, numParkingRecords] = await Promise.all([
    prisma.parkingType.findMany({
      select: { id: true, identifier: true },
    }),
    prisma.parking.count({
      where: { plotId },
    }),
  ]);
  return json({ parkingTypes, numParkingRecords, plotId });
}

const Schema = z.object({
  parkingTypeId: ComposeRecordIdSchema('parking type'),
  unitPerClient: z.coerce.number().min(0),
  ratePerClient: z.coerce.number().min(0),
  unitPerMarket: z.coerce.number().min(0),
  ratePerMarket: z.coerce.number().min(0),
});
export const action = async ({ request, params }: ActionArgs) => {
  const currentUserId = await requireUserId(request);

  try {
    const plotId = getValidatedId(params.plotId);
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { parkingTypeId, unitPerClient, ratePerClient, unitPerMarket, ratePerMarket } = result.data;

    await prisma.$transaction(async (tx) => {
      const record = await tx.parking.create({
        data: {
          plotId,
          parkingTypeId,
          unitPerClient,
          ratePerClient,
          unitPerMarket,
          ratePerMarket,
        },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Parking,
          action: EventAction.Create,
          recordId: record.id,
          recordData: JSON.stringify(record),
        },
      });
    });

    return json({
      success: true,
      fields: {
        parkingTypeId: '',
        unitPerClient: '',
        ratePerClient: '',
        unitPerMarket: '',
        ratePerMarket: '',
      },
    });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
};

export default function NewParkingPage() {
  const { parkingTypes, numParkingRecords, plotId } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      toast.success('Parking recorded successfully');
    }
  }, [fetcher.data]);

  const defaultValues: Record<keyof z.infer<typeof Schema>, string | undefined> = {
    parkingTypeId: parkingTypes[0]?.id || '',
    unitPerClient: faker.number.int(100).toString(),
    ratePerClient: faker.number.int(100).toString(),
    unitPerMarket: faker.number.int(100).toString(),
    ratePerMarket: faker.number.int(100).toString(),
  };

  return (
    <fetcher.Form method="post" className="flex grow flex-col items-stretch gap-0">
      <ActionContextProvider {...fetcher.data} fields={hasFields(fetcher.data) ? fetcher.data.fields : defaultValues} isSubmitting={isProcessing}>
        <div className="flex flex-row items-center py-4">
          <Breadcrumb
            items={[
              {
                link: AppLinks.PlotIncome(plotId),
                label: 'Parking Details',
              },
              'Add Details',
            ]}
          />
          <div className="grow" />
          <Chip className="py-1">
            <span className="font-light">{numParkingRecords} parking record(s) so far</span>
          </Chip>
          <SecondaryButtonLink to={AppLinks.NewOutgoing(plotId)} className="py-1">
            Add Outgoing Details
          </SecondaryButtonLink>
        </div>
        <div className="grow flex flex-col items-stretch gap-6 overflow-auto">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col items-stretch col-span-2">
              <FormSelect {...getNameProp('parkingTypeId')} label="Parking Type" required>
                {parkingTypes.map((parkingType) => (
                  <option key={parkingType.id} value={parkingType.id}>
                    {parkingType.identifier}
                  </option>
                ))}
              </FormSelect>
            </div>
            <FormTextField {...getNameProp('unitPerClient')} type="number" step="0.01" label="Unit Per Client" required />
            <FormTextField {...getNameProp('ratePerClient')} type="number" step="0.01" label="Rate Per Client" required />
            <FormTextField {...getNameProp('unitPerMarket')} type="number" step="0.01" label="Unit Per Market" required />
            <FormTextField {...getNameProp('ratePerMarket')} type="number" step="0.01" label="Rate Per Market" required />
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
