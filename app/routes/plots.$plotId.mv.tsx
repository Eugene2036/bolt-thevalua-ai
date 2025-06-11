import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { FormEvent } from 'react';
import type { RowMV, StateTupleSchema, StoredValuesSchma } from '~/models/core.validations';

import { json } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { X } from 'tabler-icons-react';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { CustomStoredValue } from '~/components/CustomStoredValue';
import { EditStoredValueArea } from '~/components/EditStoredValueArea';
import { GridCell } from '~/components/GridCell';
import { MVTable } from '~/components/MVTable';
import { PrimaryButton } from '~/components/PrimaryButton';
import SavePanel from '~/components/SavePanel';
import { SecondaryButton } from '~/components/SecondaryButton';
import { prisma } from '~/db.server';
import { RowMVSchema, StatusCode, badRequest, bardRound, formatAmount, getValidatedId, hasSuccess, processBadRequest, roundDown, validateStateId } from '~/models/core.validations';
import { delay } from '~/models/dates';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { fieldErrorsToArr, getRawFormFields } from '~/models/forms';
import { StoredValueId } from '~/models/storedValuest';
import { requireUserId } from '~/session.server';

export async function loader({ request, params }: LoaderArgs) {
  await requireUserId(request);
  const plotId = getValidatedId(params.plotId);

  const plot = await prisma.plot
    .findUnique({
      where: { id: plotId },
      select: {
        id: true,
        plotExtent: true,
        inspectionDate: true,
        analysisDate: true,
        valuerComments: true,
        storedValues: {
          select: { id: true, identifier: true, value: true },
        },
        grcRecords: {
          select: {
            id: true,
            identifier: true,
            unit: true,
            size: true,
            rate: true,
            bull: true,
          },
        },
        mvRecords: {
          select: {
            id: true,
            identifier: true,
            size: true,
            date: true,
            location: true,
            price: true,
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
        inspectionDate: dayjs(plot.inspectionDate).format('YYYY-MM-DD'),
        analysisDate: dayjs(plot.analysisDate).format('YYYY-MM-DD'),
        grcRecords: plot.grcRecords.map((record) => ({
          ...record,
          bull: record.bull || false,
          size: Number(record.size),
          rate: Number(record.rate),
        })),
        mvRecords: plot.mvRecords.map((record) => ({
          ...record,
          size: Number(record.size),
          // date: dayjs(record.date).format('YYYY-MM-DD'),
          price: Number(record.price),
        })),
      };
    });
  if (!plot) {
    throw new Response('Plot record not found', {
      status: StatusCode.NotFound,
    });
  }

  function getStoredValue(identifier: StoredValueId) {
    if (!plot) {
      return undefined;
    }
    const match = plot.storedValues.find((el) => el.identifier === identifier);
    if (!match) {
      return undefined;
    }
    return { ...match, value: Number(match.value) };
  }

  const landRate = getStoredValue(StoredValueId.LandRate);
  const buildRate = getStoredValue(StoredValueId.BuildRate);
  const perculiar = getStoredValue(StoredValueId.Perculiar);

  return json({ plot, storedValues: { landRate, buildRate, perculiar } });
}

export type StoredValues = z.infer<typeof StoredValuesSchma>;
const Schema = z.object({
  valuerComments: z.string(),
  mvRecords: z.preprocess((arg) => {
    try {
      if (typeof arg === 'string') {
        const result = JSON.parse(arg);
        return result;
      }
    } catch (error) {
      return undefined;
    }
  }, z.array(RowMVSchema)),
  landRate: z.coerce.number().min(0),
  buildRate: z.coerce.number().min(0),
  perculiar: z.coerce.number().min(0),
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
    const { valuerComments, landRate, buildRate, perculiar, mvRecords } = result.data;

    const record = await prisma.plot.findUnique({
      where: { id: plotId },
    });
    await prisma.$transaction(async (tx) => {
      const updated = await tx.plot.update({
        where: { id: plotId },
        data: { valuerComments },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Plot,
          action: EventAction.Update,
          recordId: plotId,
          recordData: JSON.stringify({ from: record, to: updated }),
        },
      });

      const valueRecords = await tx.storedValue.findMany({
        where: { plotId },
        select: { id: true, identifier: true },
      });

      async function updateStoredValueRecord(identifier: string, newValue: number) {
        const record = valueRecords.find((record) => record.identifier === identifier);
        if (record) {
          const updated = await tx.storedValue.update({
            where: { id: record.id },
            data: { value: newValue },
          });
          await tx.event.create({
            data: {
              userId: currentUserId,
              domain: EventDomain.StoredValue,
              action: EventAction.Update,
              recordId: record.id,
              recordData: JSON.stringify(updated),
            },
          });
        } else {
          const record = await tx.storedValue.create({
            data: { plotId, identifier, value: newValue },
          });
          await tx.event.create({
            data: {
              userId: currentUserId,
              domain: EventDomain.StoredValue,
              action: EventAction.Create,
              recordId: record.id,
              recordData: JSON.stringify(record),
            },
          });
        }
      }

      await updateStoredValueRecord(StoredValueId.LandRate, landRate);
      await updateStoredValueRecord(StoredValueId.BuildRate, buildRate);
      await updateStoredValueRecord(StoredValueId.Perculiar, perculiar);

      const currentRecords = await tx.mv.findMany({
        where: { plotId },
        select: { id: true },
      });
      const newMvRecords = mvRecords.filter((mvRecord) => !mvRecord.id);
      const existingMvRecords = mvRecords.filter((mvRecord) => mvRecord.id);
      const mvRecordsToDelete = currentRecords.filter((mvRecord) => {
        return mvRecords.every((el) => el.id !== mvRecord.id);
      });
      await mvRecordsToDelete.reduce(async (acc, mvRecord) => {
        await acc;
        await tx.mv.delete({ where: { id: mvRecord.id } });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Mv,
            action: EventAction.Delete,
            recordId: mvRecord.id,
            recordData: JSON.stringify(mvRecord),
          },
        });
      }, Promise.resolve());
      await newMvRecords.reduce(async (acc, mvRecord) => {
        await acc;
        const record = await tx.mv.create({
          data: {
            plotId,
            identifier: mvRecord.identifier,
            size: mvRecord.size,
            date: mvRecord.date,
            location: mvRecord.location,
            price: mvRecord.price,
          },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Mv,
            action: EventAction.Create,
            recordId: record.id,
            recordData: JSON.stringify(record),
          },
        });
      }, Promise.resolve());
      await existingMvRecords.reduce(async (acc, mv) => {
        await acc;
        const updated = await tx.mv.update({
          where: { id: mv.id },
          data: {
            identifier: mv.identifier,
            size: mv.size,
            date: mv.date,
            location: mv.location,
            price: mv.price,
          },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Mv,
            action: EventAction.Update,
            recordId: updated.id,
            recordData: JSON.stringify(updated),
          },
        });
      }, Promise.resolve());
    });

    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}

export default function PlotMVPage() {
  const { plot, storedValues } = useLoaderData<typeof loader>();

  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      toast.success('Changes saved');
    }
  }, [fetcher.data]);

  const [landRate, setLandRate] = useState(storedValues.landRate?.value || 0);
  const [buildRate, setBuildRate] = useState(storedValues.buildRate?.value || 0);
  const [perculiar, setPerculiar] = useState(storedValues.perculiar?.value || 0);
  const [records, setRecords] = useState<(RowMV & { index: number; err?: string })[]>(
    plot.mvRecords.map((record, index) => ({
      ...record,
      date: dayjs(record.date).toDate(),
      index,
    })),
  );
  const [valuerComments, setValuerComments] = useState(plot.valuerComments || '');

  async function addRow() {
    setRecords((prevState) => {
      const lastRow = prevState.length ? prevState[prevState.length - 1] : { index: 0 };
      return [
        ...prevState,
        {
          index: lastRow.index + 1,
          id: '',
          identifier: '',
          size: 0,
          date: new Date(),
          location: '',
          price: 0,
        },
      ];
    });
    await delay(100);
    if (formRef.current) {
      fetcher.submit(formRef.current);
    }
  }
  const deleteRow = (index: number) => {
    setRecords((prevState) => prevState.filter((el) => el.index !== index));
  };

  function updateField<T extends z.ZodTypeAny>(stateTuple: z.infer<typeof StateTupleSchema>, Schema: T, data: unknown) {
    const index = stateTuple[1];
    const field = stateTuple[2];
    const result = Schema.safeParse(data);
    if (!result.success) {
      return console.log(field, 'error', result.error);
    }
    console.log('new value for', field, result.data);
    setRecords((prevState) =>
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
      if (stateTuple === getNameProp('landRate').name) {
        const result = z.coerce.number().safeParse(data);
        if (result.success) {
          setLandRate(result.data);
        }
      }
      if (stateTuple === getNameProp('buildRate').name) {
        const result = z.coerce.number().safeParse(data);
        if (result.success) {
          setBuildRate(result.data);
        }
      }
      if (stateTuple === getNameProp('perculiar').name) {
        const result = z.coerce.number().safeParse(data);
        if (result.success) {
          setPerculiar(result.data);
        }
      }
      if (stateTuple === getNameProp('valuerComments').name) {
        const result = z.string().safeParse(data);
        if (result.success) {
          setValuerComments(result.data);
        }
      }
      return;
    }
    const id = stateTuple[0];
    const field = stateTuple[2];
    if (id === 'mv') {
      if (field === 'identifier') {
        updateField(stateTuple, z.string(), data);
      }
      if (field === 'size') {
        updateField(stateTuple, z.coerce.number(), data);
      }
      if (field === 'date') {
        updateField(stateTuple, z.coerce.date(), data);
      }
      if (field === 'location') {
        updateField(stateTuple, z.string(), data);
      }
      if (field === 'price') {
        updateField(stateTuple, z.coerce.number(), data);
      }
    }
  }

  // const avgSize = records.length
  //   ? records.reduce((acc, record) => acc + record.size, 0) / records.length
  //   : 0;

  const avgPrice = records.length ? records.reduce((acc, record) => acc + record.price, 0) / records.length : 0;

  // const compLandValue = avgSize * landRate;

  // const compBuildvalue = avgPrice - compLandValue;

  // const subjectLandValue = landRate * plot.plotExtent;

  // const subjectBuildValue =
  //   plot.grcRecords
  //     .filter((el) => el.bull)
  //     .reduce((acc, record) => acc + record.size, 0) * buildRate;

  // const projectedValue = subjectLandValue + subjectBuildValue;

  const marketValue = avgPrice + Number(avgPrice * perculiar * 0.01);
  // const marketValue =
  // projectedValue + Number(projectedValue * perculiar * 0.01);
  // const sayMarket = Math.round(marketValue / 100_000) * 100_000;
  const sayMarket = roundDown(marketValue, -5);

  const forcedSaleValue = marketValue * 0.9;
  // const sayForced = Math.round(marketValue / 100_000) * 100_000;
  const sayForced = bardRound(forcedSaleValue, -5);
  // const sayForced = bingRound(forcedSaleValue, -5);

  const items = [
    // ['Average Plot Size', formatAmount(avgSize)],
    ['Average Price', formatAmount(avgPrice)],
    // ['Ave. Comp. Land Value', formatAmount(compLandValue)],
    // ['Ave. Comp. Build Value', formatAmount(compBuildvalue)],
    // ['Subject Land Value', formatAmount(subjectLandValue)],
    // ['Subject Build Value', formatAmount(subjectBuildValue)],
    // ['Projected Value', formatAmount(projectedValue)],
    // ['Adjustment For Perculiar Situation', '-'],
  ] as const;

  function validateRecords() {
    const relevantRows = records.filter((el) => el.identifier);
    const erred = relevantRows
      .map((el) => {
        const result = RowMVSchema.safeParse(el);
        if (!result.success) {
          const { fieldErrors, formErrors } = result.error.flatten();
          const error = [...fieldErrorsToArr(fieldErrors), ...formErrors].filter(Boolean).join(', ');
          return [el.index, error] as const;
        }
        return undefined;
      })
      .filter(Boolean);
    if (erred.length) {
      setRecords((prevState) =>
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
    const erred = validateRecords();
    if (erred) {
      return;
    }

    fetcher.submit(event.currentTarget);
  }

  return (
    <fetcher.Form ref={formRef} onSubmit={handleSubmit} method="post" className="flex flex-col items-stretch gap-8">
      <ActionContextProvider {...fetcher.data} updateState={updateState} isSubmitting={isProcessing}>
        <input type="hidden" {...getNameProp('landRate')} value={landRate} />
        <input type="hidden" {...getNameProp('buildRate')} value={buildRate} />
        <input type="hidden" {...getNameProp('mvRecords')} value={JSON.stringify(records.filter((r) => r.identifier))} />
        <input type="hidden" {...getNameProp('perculiar')} value={perculiar} />
        <input type="hidden" {...getNameProp('valuerComments')} value={valuerComments} />
        <div className="grid grid-cols-3 gap-6">
          <input type="hidden" name="landRate" value={landRate} />
          {/* <div className="flex flex-row items-center gap-2">
            <span className="text-lg font-light">Land Rate: </span>
            <CustomStoredValue
              name="landRate"
              defaultValue={landRate}
              isCamo
              type="number"
              step={0.01}
              className="text-end"
            />
          </div> */}
          <input type="hidden" name="buildRate" value={buildRate} />
          {/* <div className="flex flex-row items-center gap-2">
            <span className="text-lg font-light">Build Rate: </span>
            <CustomStoredValue
              name="buildRate"
              defaultValue={buildRate}
              isCamo
              type="number"
              step={0.01}
              className="text-end"
            />
          </div> */}
        </div>
        <div className="flex flex-col items-stretch gap-2">
          <MVTable
            records={records.map((record) => ({
              ...record,
            }))}
            addRow={addRow}
            deleteRow={deleteRow}
          />
        </div>
        <div className="flex flex-row items-stretch">
          <div className="flex flex-col items-stretch grow">
            <div className="grid grid-cols-5">
              <GridCell className="text-end col-span-2 py-4 font-semibold">Analysis</GridCell>
              <GridCell className="text-end py-4 font-semibold">Values</GridCell>
              <GridCell className="font-light text-end py-4 col-span-2"></GridCell>
            </div>
            {items.map(([analysis, value], index) => (
              <div key={index} className="grid grid-cols-5">
                <GridCell className="font-light text-end col-span-2 py-4">{analysis}</GridCell>
                <GridCell className="font-light text-end py-4">{value}</GridCell>
                <GridCell className="font-light text-end py-4 col-span-2"></GridCell>
              </div>
            ))}
            <div className="grid grid-cols-5">
              <GridCell className="font-light text-end col-span-2 py-4">Adjustment for perculiar situation</GridCell>
              <GridCell className="font-light text-end py-4">
                <div className="flex flex-row items-center gap-2">
                  <div className="flex flex-col items-stretch grow">
                    <CustomStoredValue name="perculiar" defaultValue={perculiar} isCamo type="number" step={0.01} className="text-end" />
                  </div>
                  <span className="text-xl font-light">%</span>
                </div>
              </GridCell>
            </div>
            <div className="grid grid-cols-5">
              <GridCell className="font-light text-end col-span-2 py-4">Market Value</GridCell>
              <GridCell className="font-light text-end py-4">{formatAmount(marketValue)}</GridCell>
              <GridCell className="font-light text-end py-4">Say</GridCell>
              <GridCell className="font-light text-end py-4">{formatAmount(sayMarket)}</GridCell>
            </div>
            <div className="grid grid-cols-5">
              <GridCell className="font-light text-end col-span-2 py-4">Forced Sale Value</GridCell>
              <GridCell className="font-light text-end py-4">{formatAmount(forcedSaleValue)}</GridCell>
              <GridCell className="font-light text-end py-4">Say</GridCell>
              <GridCell className="font-light text-end py-4">{formatAmount(sayForced)}</GridCell>
            </div>
          </div>
          <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
            <SecondaryButton isIcon disabled className="invisible">
              <X size={16} />
            </SecondaryButton>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2">
          <span className="text-xl font-light">Valuer's Comments</span>
          <EditStoredValueArea name="valuerComments" defaultValue={valuerComments} />
        </div>
        <SavePanel>
          <div className="flex flex-col items-start">
            <PrimaryButton type="submit" disabled={isProcessing}>
              Save Changes
            </PrimaryButton>
          </div>
        </SavePanel>
      </ActionContextProvider>
    </fetcher.Form>
  );
}
export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
