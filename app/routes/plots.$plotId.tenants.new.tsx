import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { faker } from '@faker-js/faker';
import { json } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
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
  await requireUserId(request);
  const plotId = getValidatedId(params.plotId);

  const [propertyTypes, numTenants] = await Promise.all([
    prisma.propertyType.findMany({
      select: { id: true, identifier: true },
    }),
    prisma.tenant.count({
      where: { plotId },
    }),
  ]);
  return json({ propertyTypes, numTenants, plotId });
}

const Schema = z.object({
  name: z.string().min(1),
  termOfLease: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  grossMonthlyRental: z.coerce.number().min(0),
  escalation: z.coerce.number().min(0),
  propertyTypeId: ComposeRecordIdSchema('property type'),
  areaPerClient: z.coerce.number().min(0),
  areaPerMarket: z.coerce.number().min(0),
  grossRatePerValuer: z.coerce.number().min(0),
});
export const action = async ({ request, params }: ActionArgs) => {
  const currentUserId = await requireUserId(request);
  const plotId = getValidatedId(params.plotId);

  try {
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { name, termOfLease, startDate, endDate, grossMonthlyRental, escalation, propertyTypeId, areaPerClient, areaPerMarket, grossRatePerValuer } = result.data;

    await prisma.$transaction(async (tx) => {
      const record = await tx.tenant.create({
        data: {
          plotId,
          name,
          termOfLease,
          startDate,
          endDate,
          grossMonthlyRental,
          escalation,
          propertyTypeId,
          areaPerClient,
          areaPerMarket,
          grossRatePerValuer,
        },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Tenant,
          action: EventAction.Create,
          recordId: record.id,
          recordData: JSON.stringify(record),
        },
      });
    });

    return json({
      success: true,
      fields: {
        name: '',
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
};

export default function NewTenantPage() {
  const { propertyTypes, numTenants, plotId } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      toast.success('Tenant recorded successfully');
    }
  }, [fetcher.data]);

  const defaultValues: Record<keyof z.infer<typeof Schema>, string | undefined> = {
    name: faker.company.name(),
    termOfLease: '',
    startDate: dayjs(faker.date.recent()).format('YYYY-MM-DD'),
    endDate: dayjs(faker.date.future()).format('YYYY-MM-DD'),
    grossMonthlyRental: faker.finance.amount(1000, 10000, 0),
    escalation: faker.number.int(30).toString(),
    propertyTypeId: propertyTypes[0]?.id || '',
    areaPerClient: faker.number.int(100).toString(),
    areaPerMarket: faker.number.int(100).toString(),
    grossRatePerValuer: faker.finance.amount(100, 10000, 0),
  };

  return (
    <fetcher.Form method="post" className="flex grow flex-col items-stretch gap-0">
      <ActionContextProvider {...fetcher.data} fields={hasFields(fetcher.data) ? fetcher.data.fields : defaultValues} isSubmitting={isProcessing}>
        <div className="flex flex-row items-center py-4 gap-2">
          <Breadcrumb
            items={[
              {
                link: AppLinks.PlotValuations(plotId),
                label: 'Tenants',
              },
              'Record New Tenant',
            ]}
          />
          <div className="grow" />
          <Chip className="py-1">
            <span className="font-light">{numTenants} tenant(s) recorded so far</span>
          </Chip>
          <SecondaryButtonLink to={AppLinks.NewParking(plotId)} className="py-1">
            Add Parking Details
          </SecondaryButtonLink>
        </div>
        <div className="grow flex flex-col items-stretch gap-6 overflow-auto">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col items-stretch col-span-2">
              <FormTextField {...getNameProp('name')} label="Name" required />
            </div>
            <FormTextField {...getNameProp('termOfLease')} label="Term of Lease" />
            <FormTextField {...getNameProp('startDate')} type="date" label="Start Date" required />
            <FormTextField {...getNameProp('endDate')} type="date" label="End Date" required />
            <FormTextField {...getNameProp('grossMonthlyRental')} type="number" step="0.01" label="Gross Monthly Rental" required />
            <FormTextField {...getNameProp('escalation')} type="number" step="0.01" label="Escalation" required />
            <FormSelect {...getNameProp('propertyTypeId')} label="Asset Type" required>
              {propertyTypes.map((propertyType) => (
                <option key={propertyType.id} value={propertyType.id}>
                  {propertyType.identifier}
                </option>
              ))}
            </FormSelect>
            <FormTextField {...getNameProp('areaPerClient')} type="number" step="0.01" label="Area Per Client" required />
            <FormTextField {...getNameProp('areaPerMarket')} type="number" step="0.01" label="Area Per Market" required />
            <FormTextField {...getNameProp('grossRatePerValuer')} type="number" step="0.01" label="Gross Rate per m2 per valuer" required />
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
