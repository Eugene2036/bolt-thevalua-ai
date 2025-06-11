import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { ChangeEvent, FormEvent } from 'react';

import { json, redirect } from '@remix-run/node';
import { Outlet, useFetcher, useLoaderData } from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { useForm } from '~/components/ActionContextProvider';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { DangerButton } from '~/components/DangerButton';
import { PlotRoutes } from '~/components/PlotRoutes';
import { PlotRoutesCouncilCommercial } from '~/components/PlotRoutesCouncilCommercial';
import { PlotRoutesCouncilRes } from '~/components/PlotRoutesCouncilRes';
import { PlotRoutesRes } from '~/components/PlotRoutesRes';
import { Select } from '~/components/Select';
import { prisma } from '~/db.server';
import { badRequest, getQueryParams, getValidatedId, hasSuccess, processBadRequest, StatusCode } from '~/models/core.validations';
import { delay } from '~/models/dates';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { autoRedirect, ValuationType } from '~/models/plots.validations';
import { requireUser } from '~/session.server';
import { useUser } from '~/utils';

export async function loader({ request, params }: LoaderArgs) {
  await requireUser(request);

  const queryParams = getQueryParams(request.url, ['redirectTo']);
  const redirectTo = queryParams.redirectTo || '';

  const id = getValidatedId(params.plotId);
  const plot = await prisma.plot.findUnique({
    where: { id },
    select: {
      id: true,
      plotNumber: true,
      valuationType: true,
      council: true,
      address: true,
      propertyLocation: true,
    },
  });
  if (!plot) {
    throw new Response('Plot record not found', {
      status: StatusCode.NotFound,
    });
  }
  return json({ plot, redirectTo });
}

const Schema = z.discriminatedUnion('intent', [
  z.object({ intent: z.literal('delete') }),
  z.object({
    intent: z.literal('change_type'),
    newType: z.nativeEnum(ValuationType),
  }),
]);
export async function action({ request, params }: ActionArgs) {
  const currentUser = await requireUser(request);
  try {
    const id = getValidatedId(params.plotId);

    if (!currentUser.isSuper) {
      return badRequest({
        formError: "You're not authorised to perform this action",
      });
    }

    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }

    if (result.data.intent === 'delete') {
      const record = await prisma.plot.findUnique({
        where: { id },
      });
      if (!record) {
        throw new Error('Record not found');
      }
      await prisma.$transaction(async (tx) => {
        await tx.plot.delete({
          where: { id },
        });
        await tx.event.create({
          data: {
            userId: currentUser.id,
            domain: EventDomain.Plot,
            action: EventAction.Delete,
            recordId: record.id,
            recordData: JSON.stringify(record),
          },
        });
      });
      return redirect(AppLinks.SearchCouncilPlot(ValuationType.Residential));
    } else {
      const { newType } = result.data;
      const updated = await prisma.$transaction(async (tx) => {
        const updated = await tx.plot.update({
          where: { id },
          data: { valuationType: newType },
        });
        await tx.event.create({
          data: {
            userId: currentUser.id,
            domain: EventDomain.Plot,
            action: EventAction.Update,
            recordId: id,
            recordData: JSON.stringify(updated),
          },
        });
        return updated;
      });
      return redirect(autoRedirect(updated));
    }
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}

export default function PlotDetailsPage() {
  const currentUser = useUser();
  const { plot, redirectTo } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const formRef = useRef<HTMLFormElement>(null);
  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const [valuationType, setValuationType] = useState(plot.valuationType);

  async function handleValuationTypeChange(event: ChangeEvent<HTMLSelectElement>) {
    const newValue = event.currentTarget.value;
    setValuationType(newValue);
    await delay(500);
    if (formRef.current) {
      fetcher.submit(formRef.current);
    }
  }

  useEffect(() => {
    if (hasFormError(fetcher.data)) {
      toast.error(fetcher.data.formError);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      toast.success('Plot updated');
    }
  }, [fetcher.data]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = window.confirm('Are You Sure?');
    if (result) {
      fetcher.submit(event.currentTarget);
    }
  }

  return (
    <div className="flex grow flex-col items-stretch gap-0">
      <div className="sticky z-50 top-0 flex flex-row items-center gap-6 bg-white rounded-t-lg py-2 px-2 shadow-lg border-b border-dashed border-b-stone-200">
        <div className="flex flex-row items-center gap-6">
          <h2 className="text-base font-semibold">
            {/* Plot {plot.plotNumber} {plot.address} {plot.propertyLocation} */}
            {/* Plot {plot.plotNumber}{", "}{plot.propertyLocation}{", "}{"Francistown"}  */}
            Plot {plot.address}
          </h2>
          {!!currentUser.isSuper && (
            <>
              <fetcher.Form method="post" onSubmit={handleSubmit} className="flex flex-col justify-center items-center">
                <input type="hidden" {...getNameProp('intent')} value={'delete'} />
                {/* <DangerButton hidden type="submit" className="bg-red-600 hover:bg-red-800">
                  Delete
                </DangerButton> */}
              </fetcher.Form>
              <fetcher.Form ref={formRef} method="post" className="flex flex-col justify-center items-center">
                <input type="hidden" {...getNameProp('intent')} value={'change_type'} />
                <Select name="newType" value={valuationType} onChange={handleValuationTypeChange} disabled={isProcessing}>
                  <option value={ValuationType.Commercial}>{ValuationType.Commercial}</option>
                  <option value={ValuationType.Residential}>{ValuationType.Residential}</option>
                </Select>
                <DangerButton type="submit" className="bg-red-600 hover:bg-red-800 invisible top-0 left-0 absolute">
                  Change Type
                </DangerButton>
              </fetcher.Form>
            </>
          )}
        </div>
        <div className="grow" />
        {plot.valuationType !== ValuationType.Residential && !plot.council && <PlotRoutes plotId={plot.id} redirectTo={redirectTo} />}
        {plot.valuationType === ValuationType.Residential && !plot.council && <PlotRoutesRes redirectTo={redirectTo} plotId={plot.id} />}
        {plot.valuationType === ValuationType.Residential && plot.council && <PlotRoutesCouncilRes redirectTo={redirectTo} plotId={plot.id} />}
        {plot.valuationType === ValuationType.Commercial && plot.council && <PlotRoutesCouncilCommercial redirectTo={redirectTo} plotId={plot.id} />}
      </div>
      <div className="grow flex flex-col items-stretch py-4 pb-12 px-2 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
