import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { redirect } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { z } from 'zod';

import { useForm } from '~/components/ActionContextProvider';
import { PrimaryButton } from '~/components/PrimaryButton';
import { prisma } from '~/db.server';
import { badRequest, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { GrcFeeType, GrcFeeTypePercs, ValuationType } from '~/models/plots.validations';
import { requireUserId } from '~/session.server';

export async function loader({ request }: LoaderArgs) {
  return redirect(AppLinks.CouncilValuationType);
  // return null
}

enum ValuationKind {
  COFC = 'COFC',
  Other = 'Other',
}
const Schema = z.object({
  kind: z.nativeEnum(ValuationKind),
});

export async function action({ request }: ActionArgs) {
  const currentUserId = await requireUserId(request);

  try {
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { kind } = result.data;

    if (kind === ValuationKind.COFC) {
      return redirect(AppLinks.CouncilValuationType);
    }

    const lastPlot = await prisma.plot.findFirst({
      select: { propertyId: true },
      orderBy: { createdAt: 'desc' },
    });
    const lastPlotId = lastPlot?.propertyId || 0;
    const nextPlotId = lastPlotId + 1;

    const outgoingIdentifiers = [
      ['Rates', '1'],
      ['Levies', '12'],
      ['Electricity and Water in Common Areas', '12'],
      ['Maintenance and Repairs', '%'],
      ['Refurbishment', '1'],
      ['Management Fee', '%'],
      ['Auditors Fee', '1'],
      ['Insurance', '%'],
      ['Security Services', '12'],
      ['Cleaning Services', '12'],
      ['Maintenance - Lift', '12'],
      ['Maintenance - A/C', '12'],
      // ['Assessment rates', '1'],
      // ['Basic levies', '12'],
      // ['Electricity and water for common areas', '12'],
      // ['General maintenance and repairs', '%'],
      // ['Refurbishment / repairs', '1'],
      // ['Management fee', '%'],
      // ['Auditors fee', '1'],
      // ['Insurance', '%'],
      // ['Security', '12'],
      // ['Cleaning', '12'],
      // ['Lift maintenance', '12'],
      // ['Air conditioning maintenance', '12'],
      // ['RSC levies', '12'],
    ];

    const { id } = await prisma.$transaction(async (tx) => {
      const record = await tx.plot.create({
        data: {
          // council: kind === ValuationKind.COFC,
          propertyId: nextPlotId,
          plotNumber: '1',
          valuer: '',
          plotDesc: '',
          plotExtent: 1,
          address: '',
          zoning: '',
          classification: '',
          usage: '',
          userId: currentUserId,
          valuationType: ValuationType.Commercial,
          outgoingRecords: {
            create: outgoingIdentifiers.map(([identifier, itemType]) => ({
              identifier,
              itemType,
              unitPerClient: 0,
              ratePerClient: 0,
              unitPerMarket: 0,
              ratePerMarket: 0,
            })),
          },
          grcFeeRecords: {
            create: [
              {
                identifier: GrcFeeType.Professional,
                perc: GrcFeeTypePercs.Professional,
              },
              {
                identifier: GrcFeeType.Contigencies,
                perc: GrcFeeTypePercs.Contigencies,
              },
              {
                identifier: GrcFeeType.Statutory,
                perc: GrcFeeTypePercs.Statutory,
              },
            ].map(({ identifier, perc }) => ({
              identifier,
              perc,
            })),
          },
        },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Plot,
          action: EventAction.Create,
          recordId: record.id,
          recordData: JSON.stringify(record),
        },
      });
      return record;
    });

    return redirect(AppLinks.ValuationType(id));
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}

export default function PlotIndexPage() {
  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <span className="text-lg font-light">
        <fetcher.Form method="post" className="flex flex-row items-center justify-center h-full gap-4">
          <PrimaryButton {...getNameProp('kind')} value={ValuationKind.COFC} type="submit" className="px-6 py-4">
            {isProcessing && 'Loading...'}
            {!isProcessing && 'Rating'}
          </PrimaryButton>
          <PrimaryButton
            {...getNameProp('kind')}
            value={ValuationKind.Other}
            type="submit"
            className="px-6 py-4"
          >
            {isProcessing && 'Loading...'}
            {!isProcessing && 'Other Valuation'}
          </PrimaryButton>
        </fetcher.Form>
      </span>
    </div>
  );
}
