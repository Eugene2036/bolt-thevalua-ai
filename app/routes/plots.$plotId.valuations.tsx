import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { FormEvent } from 'react';
import type { RowTenant, StateTupleSchema } from '~/models/core.validations';

import { json } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, X } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { AnalysisDate } from '~/components/AnalysisDate';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { FormTextField } from '~/components/FormTextField';
import { GridHeading } from '~/components/GridHeading';
import { PrimaryButton } from '~/components/PrimaryButton';
import SavePanel from '~/components/SavePanel';
import { SecondaryButton, SecondaryButtonLink } from '~/components/SecondaryButton';
import { TenantRow } from '~/components/TenantRow';
import { prisma } from '~/db.server';
import {
  AnalysisDateSchema,
  RowTenantSchema,
  StatusCode,
  badRequest,
  getValidatedId,
  hasSuccess,
  processBadRequest,
  validateDateDiff,
  validateStateId,
} from '~/models/core.validations';
import { delay } from '~/models/dates';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { fieldErrorsToArr, getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUser, requireUserId } from '~/session.server';
import { AiPlotChat } from '~/components/AiPlotChat';

var cantEdit: boolean = false;

export async function loader({ request, params }: LoaderArgs) {
  const currentUser = await requireUser(request);
  const plotId = getValidatedId(params.plotId);

  const [propertyTypes, plot] = await Promise.all([
    prisma.propertyType.findMany({
      select: { id: true, identifier: true },
    }),
    prisma.plot
      .findUnique({
        where: { id: plotId },
        select: {
          id: true,
          reviewedById: true,
          plotNumber: true,
          valuer: true,
          inspectionDate: true,
          analysisDate: true,
          plotDesc: true,
          plotExtent: true,
          undevelopedPortion: true,
          rateForUndevelopedPortion: true,
          address: true,
          zoning: true,
          classification: true,
          usage: true,
          tenants: {
            select: {
              id: true,
              name: true,
              termOfLease: true,
              leaseLife: true,
              startDate: true,
              endDate: true,
              grossMonthlyRental: true,
              escalation: true,
              propertyTypeId: true,
              propertyType: { select: { identifier: true } },
              areaPerClient: true,
              areaPerMarket: true,
              grossRatePerValuer: true,
              ratePerMarket: true,
            },
          },
        },
      })
      .then((plot) => {
        if (!plot) {
          return undefined;
        }
        return {
          ...plot,
          plotExtent: Number(plot.plotExtent),
          undevelopedPortion: Number(plot.undevelopedPortion),
          rateForUndevelopedPortion: Number(plot.rateForUndevelopedPortion),
          tenants: plot.tenants.map((tenant) => ({
            ...tenant,
            areaPerClient: Number(tenant.areaPerClient),
            leaseLife: Number(tenant.leaseLife),
            startDate: dayjs(tenant.startDate).format('YYYY-MM-DD'),
            endDate: dayjs(tenant.endDate).format('YYYY-MM-DD'),
            remMonths: dayjs(tenant.endDate).diff(dayjs(), 'month'),
            grossMonthlyRental: Number(tenant.grossMonthlyRental),
            escalation: Number(tenant.escalation),
            ratePerMarket: Number(tenant.ratePerMarket),
          })),
        };
      }),
  ]);
  if (!plot) {
    throw new Response('Plot record not found', {
      status: StatusCode.NotFound,
    });
  }

  cantEdit = plot.reviewedById ? !currentUser.isSuper : false;
  // const cantEdit = !!plot.reviewedById && !currentUser.isSuper;
  // Disable editing for bankers
  cantEdit = currentUser.isBanker === true ? true : false;

  return json({ propertyTypes, plot, cantEdit });
}

const Schema = z.object({
  usage: z.string(),
  desc: z.string(),
  zoning: z.string(),
  plotExtent: z.literal('').or(z.coerce.number().min(0)),
  analysisDate: AnalysisDateSchema,
  tenants: z.preprocess((arg) => {
    try {
      if (typeof arg === 'string') {
        const result = JSON.parse(arg);
        return result;
      }
    } catch (error) {
      return undefined;
    }
  }, z.array(RowTenantSchema)),
});

export async function action({ request, params }: ActionArgs) {
  const currentUserId = await requireUserId(request);

  try {
    const plotId = getValidatedId(params.plotId);
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { analysisDate, tenants, usage, zoning, desc, plotExtent } = result.data;

    console.log('passed parse');

    const errs = tenants
      .map((tenant, index) => {
        const err = validateDateDiff(tenant.startDate, tenant.endDate);
        if (err) {
          return [index, err.message] as const;
        }
        return undefined;
      })
      .filter(Boolean);

    if (errs.length) {
      return json({ errs });
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.plot.update({
        where: { id: plotId },
        data: {
          analysisDate,
          usage,
          zoning,
          plotDesc: desc,
          plotExtent: plotExtent || 0,
        },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Plot,
          action: EventAction.Update,
          recordId: plotId,
          recordData: JSON.stringify({ updated }),
        },
      });
      const currentTenants = await tx.tenant.findMany({
        where: { plotId },
        select: { id: true },
      });
      const newTenants = tenants.filter((tenant) => !tenant.id);
      const existingTenants = tenants.filter((tenant) => tenant.id);
      const tenantsToDelete = currentTenants.filter((tenant) => {
        return tenants.every((el) => el.id !== tenant.id);
      });
      await tenantsToDelete.reduce(async (acc, tenant) => {
        await acc;
        await tx.tenant.delete({ where: { id: tenant.id } });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Tenant,
            action: EventAction.Delete,
            recordId: tenant.id,
            recordData: JSON.stringify(tenant),
          },
        });
      }, Promise.resolve());
      await newTenants.reduce(async (acc, tenant) => {
        await acc;
        const record = await tx.tenant.create({
          data: {
            plotId,
            name: tenant.name,
            propertyTypeId: tenant.propertyTypeId,
            areaPerClient: tenant.area,
            startDate: tenant.startDate,
            endDate: tenant.endDate,
            grossMonthlyRental: tenant.grossMonthly,
            escalation: tenant.escl,
            termOfLease: '',
            areaPerMarket: 1,
            grossRatePerValuer: 1,
            ratePerMarket: tenant.ratePerMarket,
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
      }, Promise.resolve());
      await existingTenants.reduce(async (acc, tenant) => {
        await acc;
        const updated = await tx.tenant.update({
          where: { id: tenant.id },
          data: {
            name: tenant.name,
            propertyTypeId: tenant.propertyTypeId,
            areaPerClient: tenant.area,
            startDate: tenant.startDate,
            endDate: tenant.endDate,
            grossMonthlyRental: tenant.grossMonthly,
            escalation: tenant.escl,
            ratePerMarket: tenant.ratePerMarket,
          },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Tenant,
            action: EventAction.Update,
            recordId: tenant.id,
            recordData: JSON.stringify(updated),
          },
        });
      }, Promise.resolve());
    });
    console.log('got here');
    return json({ success: true });
  } catch (error) {
    console.log('got caught');
    return badRequest({ formError: getErrorMessage(error) });
  }
}

interface TenantRow {
  id: string | undefined;
  index: number;
  tenant: string;
  propertyTypeId: string;
  area: number;
  leasePeriod: number;
  startDate: Date;
  endDate: Date;
  remMonths: number;
  grossMonthly: number;
  rate: number;
  escl: number;
  ratePerMarket: number;
}

export default function PlotValuationsPage() {
  const { propertyTypes, plot, cantEdit } = useLoaderData<typeof loader>();

  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  console.log('fetcher.data', fetcher.data);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      toast.success('Changes saved');
    }
  }, [fetcher.data]);

  const [analysisDate, setAnalysisDate] = useState(dayjs(plot.analysisDate).toDate());
  const [usage, setUsage] = useState(plot.usage);
  const [desc, setDesc] = useState(plot.plotDesc);
  const [zoning, setZoning] = useState(plot.zoning);
  const [plotExtent, setPlotExtent] = useState<number | ''>(plot.plotExtent || '');

  const [tenants, setTenants] = useState<(RowTenant & { index: number; err?: string })[]>(
    plot.tenants.map((tenant, index) => ({
      index,
      id: tenant.id,
      name: tenant.name,
      propertyTypeId: tenant.propertyTypeId,
      area: tenant.areaPerClient,
      startDate: dayjs(tenant.startDate).toDate(),
      endDate: dayjs(tenant.endDate).toDate(),
      grossMonthly: tenant.grossMonthlyRental,
      escl: tenant.escalation,
      ratePerMarket: tenant.ratePerMarket,
    })) || [],
  );

  function getErrs(data: unknown) {
    const Schema = z.object({
      errs: z.array(z.tuple([z.number(), z.string()])),
    });
    const result = Schema.safeParse(data);
    if (!result.success) {
      return undefined;
    }
    return result.data;
  }

  useEffect(() => {
    console.log(fetcher.data);
    const result = getErrs(fetcher.data);
    if (result) {
      const errs = result.errs;
      setTenants((prevState) =>
        prevState.map((tenant) => {
          const match = errs.find(([index]) => index === tenant.index);
          if (match) {
            return { ...tenant, err: match[1] };
          }
          return { ...tenant, err: undefined };
        }),
      );
    } else {
      setTenants((prevState) => prevState.map((tenant) => ({ ...tenant, err: undefined })));
    }
  }, [fetcher.data]);

  async function addRow() {
    setTenants((prevState) => {
      const lastRow = prevState.length ? prevState[prevState.length - 1] : { index: 0 };
      return [
        ...prevState,
        {
          index: lastRow.index + 1,
          id: '',
          name: '',
          propertyTypeId: '',
          area: 0,
          startDate: new Date(),
          endDate: new Date(),
          grossMonthly: 0,
          escl: 0,
          ratePerMarket: 0,
        },
      ];
    });
    await delay(100);
    if (formRef.current) {
      fetcher.submit(formRef.current);
    }
  }

  const deleteRow = (index: number) => {
    setTenants((prevState) => prevState.filter((el) => el.index !== index));
  };

  function updateRowField<T extends z.ZodTypeAny>(stateTuple: z.infer<typeof StateTupleSchema>, Schema: T, data: unknown) {
    const index = stateTuple[1];
    const field = stateTuple[2];
    const result = Schema.safeParse(data);
    if (!result.success) {
      return console.log(field, 'error', result.error);
    }
    console.log('new value for', field, result.data);
    setTenants((prevState) =>
      prevState.map((tenant) => {
        if (tenant.index !== index) {
          return tenant;
        }
        return { ...tenant, [field]: result.data };
      }),
    );
  }

  function updateState(name: string, data: unknown) {
    const stateTuple = validateStateId(name);
    if (!stateTuple) {
      return;
    }
    if (!Array.isArray(stateTuple)) {
      if (stateTuple === getNameProp('analysisDate').name) {
        const result = AnalysisDateSchema.safeParse(data);
        if (result.success) {
          setAnalysisDate(result.data);
        }
      }
      if (stateTuple === getNameProp('desc').name) {
        const result = z.string().safeParse(data);
        if (result.success) {
          setDesc(result.data);
        }
      }
      if (stateTuple === getNameProp('usage').name) {
        const result = z.string().safeParse(data);
        if (result.success) {
          setUsage(result.data);
        }
      }
      if (stateTuple === getNameProp('zoning').name) {
        const result = z.string().safeParse(data);
        if (result.success) {
          setZoning(result.data);
        }
      }
      if (stateTuple === getNameProp('plotExtent').name) {
        const result = z.literal('').or(z.coerce.number()).safeParse(data);
        if (result.success) {
          setPlotExtent(result.data);
        }
      }
      return;
    }
    const id = stateTuple[0];
    const field = stateTuple[2];
    if (id === 'tenant') {
      if (field === 'name') {
        updateRowField(stateTuple, z.string(), data);
      }
      if (field === 'propertyTypeId') {
        updateRowField(stateTuple, z.string(), data);
      }
      if (field === 'area') {
        updateRowField(stateTuple, z.literal('').or(z.coerce.number()), data);
      }
      if (field === 'startDate') {
        updateRowField(stateTuple, z.coerce.date(), data);
      }
      if (field === 'endDate') {
        updateRowField(stateTuple, z.coerce.date(), data);
      }
      if (field === 'grossMonthly') {
        updateRowField(stateTuple, z.literal('').or(z.coerce.number()), data);
      }
      if (field === 'escl') {
        updateRowField(stateTuple, z.literal('').or(z.coerce.number()), data);
      }
      if (field === 'ratePerMarket') {
        updateRowField(stateTuple, z.literal('').or(z.coerce.number()), data);
      }
    }
  }

  function validateRows() {
    const relevantRows = tenants.filter((el) => el.name);
    const erred = relevantRows
      .map((el) => {
        const result = RowTenantSchema.safeParse(el);
        if (!result.success) {
          const { fieldErrors, formErrors } = result.error.flatten();
          const error = [...fieldErrorsToArr(fieldErrors), ...formErrors].filter(Boolean).join(', ');
          return [el.index, error] as const;
        }
        return undefined;
      })
      .filter(Boolean);
    if (erred.length) {
      setTenants((prevState) =>
        prevState.map((record) => {
          const match = erred.find(([index]) => index === record.index);
          if (match) {
            return { ...record, err: match[1] };
          }
          return { ...record, err: '' };
        }),
      );
      return true;
    }
    return false;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const erred = validateRows();
    if (erred) {
      return;
    }

    fetcher.submit(event.currentTarget);
  }

  return (
    <fetcher.Form ref={formRef} onSubmit={handleSubmit} method="post" className="flex flex-col items-stretch gap-6">
      <ActionContextProvider {...fetcher.data} updateState={updateState} isSubmitting={isProcessing} disabled={cantEdit}>
        <div className="grid grid-cols-5 gap-6">
          <AnalysisDate {...getNameProp('analysisDate')} analysisDate={analysisDate} />
          <div className="flex flex-row items-center gap-2">
            <span className="text-sm font-light">Plot Extent: </span>
            <div className="grow">
              <FormTextField {...getNameProp('plotExtent')} defaultValue={plotExtent} type="number" step={0.01} isCamo />
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-sm font-light">Desc: </span>
            <div className="grow">
              <FormTextField {...getNameProp('desc')} defaultValue={desc} isCamo />
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-sm font-light">Usage: </span>
            <div className="grow">
              <FormTextField {...getNameProp('usage')} defaultValue={usage} isCamo />
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-sm font-light">Zoning: </span>
            <div className="grow">
              <FormTextField {...getNameProp('zoning')} defaultValue={zoning} isCamo />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2">
          <div className="flex flex-row items-center gap-2">
            <h3 className="text-lg font-semibold">Income Roll</h3>
            <span className="text-xl font-bold">&middot;</span>
            <span className="text-sm font-light text-stone-600">{plot.tenants.length} tenant(s)</span>
            <div className="grow" />
            {!cantEdit && <SecondaryButtonLink to={AppLinks.ImportTenants(plot.id)}>Import From Excel</SecondaryButtonLink>}
          </div>
          <div className="flex flex-col items-stretch">
            {/* <span className="font-semibold">Income Roll</span> */}
            <div className="flex flex-row items-stretch">
              <div className="grow grid grid-cols-10">
                <GridHeading>Tenant</GridHeading>
                <GridHeading>Asset Type</GridHeading>
                <GridHeading className="text-end">Area</GridHeading>
                <GridHeading>Start Date</GridHeading>
                <GridHeading>End Date</GridHeading>
                <GridHeading className="text-end">Lease Period</GridHeading>
                <GridHeading className="text-end">Gross Monthly</GridHeading>
                <GridHeading className="text-end">Income Roll Rate/m2</GridHeading>
                <GridHeading className="text-end bg-teal-50">Market Rate/m2</GridHeading>
                {/* <GridHeading className="text-end">Rem Months</GridHeading> */}
                <GridHeading className="text-end">Escl</GridHeading>
              </div>
              <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
                <SecondaryButton isIcon disabled className="invisible">
                  <X size={16} />
                </SecondaryButton>
              </div>
            </div>
            {tenants.map((tenant) => (
              <TenantRow
                key={tenant.index}
                {...tenant}
                deleteRow={deleteRow}
                startDate={dayjs(tenant.startDate).toDate()}
                endDate={dayjs(tenant.endDate).toDate()}
                analysisDate={dayjs(plot.analysisDate).toDate()}
                propertyTypes={propertyTypes}
                err={tenant.err}
              />
            ))}
            <div className="flex flex-col items-end py-2">
              <SecondaryButton type="button" onClick={addRow} disabled={cantEdit} className="flex flex-row items-center gap-2">
                <Plus className={twMerge('text-teal-600', cantEdit && 'text-stone-400')} />
                Add Tenant
              </SecondaryButton>
            </div>
          </div>
          <SavePanel>
            <input type="hidden" name="tenants" value={JSON.stringify(tenants.filter((tenant) => tenant.name))} />
            <div className="flex flex-col items-start">
              <PrimaryButton type="submit" disabled={isProcessing || cantEdit}>
                Save Changes
              </PrimaryButton>
            </div>
            <div className="flex flex-col items-end">
              <AiPlotChat plotId={plot.id} />
            </div>
          </SavePanel>
        </div>
      </ActionContextProvider>
    </fetcher.Form>
  );
}
export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
