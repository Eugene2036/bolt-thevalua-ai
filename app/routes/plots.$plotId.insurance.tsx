import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { FormEvent } from 'react';
import type { RowInsurance, StateTupleSchema } from '~/models/core.validations';

import { json } from '@remix-run/node';
import { useFetcher, useLoaderData, useRevalidator } from '@remix-run/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, X } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { CustomStoredValue } from '~/components/CustomStoredValue';
import { GridCell } from '~/components/GridCell';
import { GridHeading } from '~/components/GridHeading';
import { InsuranceRow } from '~/components/InsuranceRow';
import { NewCalculatorDialog } from '~/components/NewCalculatorDialog';
import { PrimaryButton } from '~/components/PrimaryButton';
import SavePanel from '~/components/SavePanel';
import { SecondaryButton } from '~/components/SecondaryButton';
import { prisma } from '~/db.server';
import { RowInsuranceSchema, StatusCode, badRequest, formatAmount, getValidatedId, hasSuccess, processBadRequest, validateStateId } from '~/models/core.validations';
import { delay } from '~/models/dates';
import { getErrorMessage } from '~/models/errors';
import { fieldErrorsToArr, getRawFormFields, hasFormError } from '~/models/forms';
import { roundToTwoDecimals } from '~/models/plots.validations';
import { StoredValueId } from '~/models/storedValuest';
import { requireUser, requireUserId } from '~/session.server';
import { useUser } from '~/utils';
import { AiPlotChat } from '~/components/AiPlotChat';

export async function loader({ request, params }: LoaderArgs) {
  const currentUser = await requireUser(request);
  const plotId = getValidatedId(params.plotId);

  const [plot, insuranceItems, roofTypes] = await Promise.all([
    prisma.plot
      .findUnique({
        where: { id: plotId },
        select: {
          id: true,
          reviewedById: true,
          storedValues: {
            select: { id: true, identifier: true, value: true },
          },
          tenants: {
            select: {
              areaPerClient: true,
              propertyType: { select: { identifier: true } },
            },
          },
          insuranceRecords: {
            select: {
              id: true,
              item: { select: { id: true, identifier: true } },
              roofType: { select: { id: true, identifier: true } },
              rate: true,
              area: true,
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
          tenants: plot.tenants.map((tenant) => ({
            ...tenant,
            areaPerClient: Number(tenant.areaPerClient),
          })),
          insuranceRecords: plot.insuranceRecords.map((record) => ({
            ...record,
            rate: Number(record.rate),
            area: Number(record.area),
          })),
        };
      }),
    prisma.insuranceItem.findMany({
      select: { id: true, identifier: true },
    }),
    prisma.roofType.findMany({
      select: { id: true, identifier: true },
    }),
  ]);
  if (!plot) {
    throw new Response('Plot record not found', {
      status: StatusCode.NotFound,
    });
  }

  const itemsToAddress: { identifier: string; total: number }[] = [];
  for (let tenant of plot.tenants) {
    const match = itemsToAddress.find((item) => item.identifier === tenant.propertyType.identifier);
    if (match) {
      const index = itemsToAddress.indexOf(match);
      itemsToAddress[index] = {
        identifier: match.identifier,
        total: match.total + tenant.areaPerClient,
      };
    } else {
      itemsToAddress.push({
        identifier: tenant.propertyType.identifier,
        total: tenant.areaPerClient,
      });
    }
  }

  // const relevantItems = itemsToAddress.map((item) => {
  //   const match = insuranceItems.find((el) => el.identifier === item.identifier);
  //   return { id: match?.id, ...item };
  // });
  // const filteredItems = relevantItems
  //   .filter((item): item is { id: string; identifier: string; total: number } => !!item.id)
  //   .filter((item) => {
  //     return plot.insuranceRecords.every((record) => record.item.id !== item.id);
  //   });

  // await prisma.insurance.createMany({
  //   data: filteredItems.map((item) => ({
  //     plotId: plot.id,
  //     itemId: item.id,
  //     rate: 1,
  //     area: item.total,
  //   })),
  // });
  const insuranceRecords = await prisma.insurance
    .findMany({
      where: { plotId: plot.id },
      select: {
        id: true,
        item: { select: { id: true, identifier: true } },
        roofType: { select: { id: true, identifier: true } },
        rate: true,
        area: true,
      },
    })
    .then((insuranceRecords) =>
      insuranceRecords.map((record) => ({
        ...record,
        rate: Number(record.rate),
        area: Number(record.area),
      })),
    );

  const refinedPlot = { ...plot, insuranceRecords };

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

  const insuranceVat = getStoredValue(StoredValueId.InsuranceVat);
  const profFee = getStoredValue(StoredValueId.ProfFees);
  const preTenderEscalationAt = getStoredValue(StoredValueId.PreTenderEscalationAt);
  const preTenderEscalationPerc = getStoredValue(StoredValueId.PreTenderEscalationPerc);
  const postTenderEscalationAt = getStoredValue(StoredValueId.PostTenderEscalationAt);
  const postTenderEscalationPerc = getStoredValue(StoredValueId.PostTenderEscalationPerc);

  const cantEdit = plot.reviewedById ? !currentUser.isSuper : false;
  // const cantEdit = !!plot.reviewedById && !currentUser.isSuper;

  return json({
    cantEdit,
    storedValues: {
      insuranceVat,
      preTenderEscalationAt,
      preTenderEscalationPerc,
      postTenderEscalationAt,
      postTenderEscalationPerc,
      profFee,
    },
    plot: refinedPlot,
    items: insuranceItems,
    roofTypes,
  });
}

const Schema = z.object({
  rows: z.preprocess((arg) => {
    try {
      if (typeof arg === 'string') {
        return JSON.parse(arg);
      }
    } catch (error) {
      return undefined;
    }
  }, RowInsuranceSchema.array()),
  storedValues: z.preprocess(
    (arg) => {
      try {
        if (typeof arg === 'string') {
          return JSON.parse(arg);
        }
      } catch (error) {
        return undefined;
      }
    },
    z.object({
      insuranceVat: z.coerce.number().min(0),
      preTenderEscalationAt: z.coerce.number().min(0),
      preTenderEscalationPerc: z.coerce.number().min(0),
      postTenderEscalationAt: z.coerce.number().min(0),
      postTenderEscalationPerc: z.coerce.number().min(0),
      profFee: z.coerce.number().min(0),
    }),
  ),
});

export async function action({ request, params }: ActionArgs) {
  await requireUserId(request);

  try {
    const plotId = getValidatedId(params.plotId);
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { rows, storedValues } = result.data;

    const records = await prisma.insurance.findMany({
      where: { plotId },
    });
    const newRows = rows.filter((row) => !row.id);
    const toDelete = records.filter((record) => {
      return rows.every((el) => el.id !== record.id);
    });
    const existingRows = rows.filter((row) => {
      return row.id && toDelete.every((el) => el.id !== row.id);
    });
    console.log('records', JSON.stringify(records, null, 2));
    console.log('rows', JSON.stringify(rows, null, 2));
    console.log('newRows', newRows);
    console.log('toDelete', toDelete);
    console.log('existingRows', existingRows);
    await toDelete.reduce(async (acc, insurance) => {
      await acc;
      await prisma.insurance.delete({ where: { id: insurance.id } });
      // await tx.event.create({
      //   data: {
      //     userId: currentUserId,
      //     domain: EventDomain.Insurance,
      //     action: EventAction.Delete,
      //     recordId: insurance.id,
      //     recordData: JSON.stringify(insurance),
      //   },
      // });
    }, Promise.resolve());
    await prisma.$transaction(async (tx) => {
      await newRows.reduce(async (acc, insurance) => {
        await acc;
        await tx.insurance.create({
          data: {
            plotId,
            itemId: insurance.itemId,
            roofTypeId: insurance.roofTypeId || null,
            rate: insurance.rate,
            area: insurance.area,
          },
        });
        // await tx.event.create({
        //   data: {
        //     userId: currentUserId,
        //     domain: EventDomain.Insurance,
        //     action: EventAction.Create,
        //     recordId: record.id,
        //     recordData: JSON.stringify(record),
        //   },
        // });
      }, Promise.resolve());
      await existingRows.reduce(async (acc, insurance) => {
        await acc;
        await tx.insurance.update({
          where: { id: insurance.id },
          data: {
            itemId: insurance.itemId,
            roofTypeId: insurance.roofTypeId || null,
            rate: insurance.rate || 0,
            area: insurance.area || 0,
          },
        });
        // await tx.event.create({
        //   data: {
        //     userId: currentUserId,
        //     domain: EventDomain.Insurance,
        //     action: EventAction.Update,
        //     recordId: updated.id,
        //     recordData: JSON.stringify(updated),
        //   },
        // });
      }, Promise.resolve());
    });
    const valueRecords = await prisma.storedValue.findMany({
      where: { plotId },
      select: { id: true, identifier: true },
    });

    async function updateStoredValueRecord(identifier: string, newValue: number) {
      const record = valueRecords.find((record) => record.identifier === identifier);
      if (record) {
        await prisma.storedValue.update({
          where: { id: record.id },
          data: { value: newValue },
        });
        // await tx.event.create({
        //   data: {
        //     userId: currentUserId,
        //     domain: EventDomain.StoredValue,
        //     action: EventAction.Update,
        //     recordId: record.id,
        //     recordData: JSON.stringify(updated),
        //   },
        // });
      } else {
        await prisma.storedValue.create({
          data: { plotId, identifier, value: newValue },
        });
        // await tx.event.create({
        //   data: {
        //     userId: currentUserId,
        //     domain: EventDomain.StoredValue,
        //     action: EventAction.Create,
        //     recordId: record.id,
        //     recordData: JSON.stringify(record),
        //   },
        // });
      }
    }

    await updateStoredValueRecord(StoredValueId.InsuranceVat, storedValues.insuranceVat);
    await updateStoredValueRecord(StoredValueId.ProfFees, storedValues.profFee);
    await updateStoredValueRecord(StoredValueId.PreTenderEscalationAt, storedValues.preTenderEscalationAt);
    await updateStoredValueRecord(StoredValueId.PreTenderEscalationPerc, storedValues.preTenderEscalationPerc);
    await updateStoredValueRecord(StoredValueId.PostTenderEscalationAt, storedValues.postTenderEscalationAt);
    await updateStoredValueRecord(StoredValueId.PostTenderEscalationPerc, storedValues.postTenderEscalationPerc);
    return json({ success: true });
  } catch (error) {
    const formError = getErrorMessage(error);
    console.log('formError', formError);
    return badRequest({ formError });
  }
}

export default function PlotInsurancePage() {
  const {
    storedValues: { insuranceVat, preTenderEscalationAt, preTenderEscalationPerc, postTenderEscalationAt, postTenderEscalationPerc, profFee },
    plot,
    items,
    roofTypes,
    cantEdit,
  } = useLoaderData<typeof loader>();

  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      toast.success('Changes saved');
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (hasFormError(fetcher.data)) {
      toast.error(fetcher.data.formError);
    }
  }, [fetcher.data]);

  const mappedRecords = plot.insuranceRecords.length
    ? plot.insuranceRecords.map((record, index) => ({
      ...record,
      index,
      itemId: record.item.id,
      roofTypeId: record.roofType?.id || '',
      rate: record.rate || ('' as const),
      area: record.area || ('' as const),
    }))
    : [];

  // const mappedRecords = useMemo(() => {
  //   return plot.insuranceRecords.length
  //     ? plot.insuranceRecords.map((record, index) => ({
  //         ...record,
  //         index,
  //         itemId: record.item.id,
  //         roofTypeId: record.roofType?.id || '',
  //         rate: record.rate || ('' as const),
  //         area: record.area || ('' as const),
  //       }))
  //     : [];
  // }, [plot.insuranceRecords]);

  const [rows, setRows] = useState<(RowInsurance & { index: number; err?: string })[]>(mappedRecords);

  const check = JSON.stringify(mappedRecords);
  useEffect(() => {
    console.log('check changed');
    setRows((prevState) => {
      const recordsFromServer = mappedRecords;
      const updatedLocalRecords = prevState
        .map((localRecord) => {
          const match = recordsFromServer.find((r) => r.id === localRecord.id);
          if (match) {
            return match;
          }
          if (!localRecord.id && !localRecord.itemId) {
            return localRecord;
          }
          return undefined;
        })
        .filter(Boolean);
      const emptyRecords = updatedLocalRecords.filter((r) => !r.id && !r.itemId);
      const nonEmptyUpdatedRecords = updatedLocalRecords.filter((r) => {
        return r.id;
      });
      const newRecords = recordsFromServer.filter((r) => {
        return updatedLocalRecords.every((localRecord) => localRecord.id !== r.id);
      });
      return [...nonEmptyUpdatedRecords, ...newRecords, ...emptyRecords];
      // return [...updatedLocalRecords, ...newRecords];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [check]);

  const [storedValues, setStoredValues] = useState({
    insuranceVat: insuranceVat?.value || 0,
    preTenderEscalationAt: preTenderEscalationAt?.value || 0,
    preTenderEscalationPerc: preTenderEscalationPerc?.value || 0,
    postTenderEscalationAt: postTenderEscalationAt?.value || 0,
    postTenderEscalationPerc: postTenderEscalationPerc?.value || 0,
    profFee: profFee?.value || 0,
  });

  async function addRow() {
    setRows((prevState) => {
      const lastRow = prevState.length ? prevState[prevState.length - 1] : { index: 0 };
      return [
        ...prevState,
        {
          index: lastRow.index + 1,
          id: '',
          itemId: '',
          roofTypeId: '',
          rate: 0,
        },
      ];
    });
    await delay(100);
    if (formRef.current) {
      fetcher.submit(formRef.current);
    }
  }

  const deleteRow = (index: number) => {
    setRows((prevState) => prevState.filter((el) => el.index !== index));
  };

  // const totalAreaPerClient = plot.tenants.reduce(
  //   (acc, tenant) => acc + tenant.areaPerClient,
  //   0,
  // );

  function updateStoredValue(id: keyof typeof storedValues, data: unknown) {
    const result = z.literal('').or(z.coerce.number()).safeParse(data);
    if (!result.success) {
      return console.log(id, 'error', result.error);
    }
    console.log('new value for', id, result.data);
    setStoredValues((prevState) => ({
      ...prevState,
      [id]: result.data,
    }));
  }

  function updateInsuranceField<T extends z.ZodTypeAny>(stateTuple: z.infer<typeof StateTupleSchema>, Schema: T, data: unknown) {
    const index = stateTuple[1];
    const field = stateTuple[2];
    const result = Schema.safeParse(data);
    if (!result.success) {
      return console.log(field, 'error', result.error);
    }
    console.log('new value for', field, result.data);
    setRows((prevState) =>
      prevState.map((record) => {
        if (record.index !== index) {
          return record;
        }
        return { ...record, [field]: result.data };
      }),
    );
  }

  function updateState(name: string, data: unknown) {
    const stateTuple = validateStateId(name);
    if (!stateTuple) {
      return;
    }
    if (!Array.isArray(stateTuple)) {
      if (stateTuple === 'insuranceVat') {
        updateStoredValue('insuranceVat', data);
      }
      if (stateTuple === 'profFee') {
        updateStoredValue('profFee', data);
      }
      if (stateTuple === 'preTenderEscalationAt') {
        updateStoredValue('preTenderEscalationAt', data);
      }
      if (stateTuple === 'preTenderEscalationPerc') {
        updateStoredValue('preTenderEscalationPerc', data);
      }
      if (stateTuple === 'postTenderEscalationAt') {
        updateStoredValue('postTenderEscalationAt', data);
      }
      if (stateTuple === 'postTenderEscalationPerc') {
        updateStoredValue('postTenderEscalationPerc', data);
      }
      return;
    }
    const id = stateTuple[0];
    const field = stateTuple[2];
    if (id === 'insurance') {
      if (field === 'itemId') {
        updateInsuranceField(stateTuple, z.string(), data);
      }
      if (field === 'roofTypeId') {
        updateInsuranceField(stateTuple, z.string(), data);
      }
      if (field === 'area') {
        updateInsuranceField(stateTuple, z.literal('').or(z.coerce.number()), data);
      }
      if (field === 'rate') {
        updateInsuranceField(stateTuple, z.literal('').or(z.coerce.number()), data);
      }
    }
  }

  const subTotal = rows.reduce((acc, record) => {
    const result = acc + (record.rate || 0) * (record.area || 0);
    return Number(result.toFixed(2));
  }, 0);

  const vat = useMemo(() => {
    const result = subTotal * (storedValues.insuranceVat / 100);
    return Number(result.toFixed(2));
  }, [subTotal, storedValues.insuranceVat]);

  const comProperty = 0;

  const profFees = useMemo(() => {
    const result = storedValues.profFee * 0.01 * (subTotal + vat + comProperty);
    return Number(result.toFixed(2));
  }, [subTotal, vat, comProperty, storedValues.profFee]);

  const replacementCost = useMemo(() => {
    const result = subTotal + vat + comProperty + profFees;
    return Number(result.toFixed(2));
  }, [subTotal, vat, comProperty, profFees]);

  const preTenderEscl = useMemo(() => {
    const result = (((storedValues.preTenderEscalationPerc / 100) * storedValues.preTenderEscalationAt) / 12) * replacementCost;
    return Number(result.toFixed(2));
  }, [storedValues, replacementCost]);

  const postTenderEscl = useMemo(() => {
    const result = (((storedValues.postTenderEscalationPerc / 100) * storedValues.postTenderEscalationAt) / 12) * subTotal;
    return Number(result.toFixed(2));
  }, [storedValues, subTotal]);

  const total = useMemo(() => {
    const result = replacementCost + preTenderEscl + postTenderEscl;
    return roundToTwoDecimals(result);
  }, [replacementCost, preTenderEscl, postTenderEscl]);

  function validateRows() {
    const relevantRows = rows.filter((el) => el.itemId);
    const erred = relevantRows
      .map((el) => {
        const result = RowInsuranceSchema.safeParse(el);
        if (!result.success) {
          const { fieldErrors, formErrors } = result.error.flatten();
          const error = [...fieldErrorsToArr(fieldErrors), ...formErrors].filter(Boolean).join(', ');
          return [el.index, error] as const;
        }
        return undefined;
      })
      .filter(Boolean);
    if (erred.length) {
      setRows((prevState) =>
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
      console.log('failed');
      return;
    }

    fetcher.submit(event.currentTarget);
  }

  const currentUser = useUser();

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    grcId: string;
    index: number | undefined;

    itemId: string | undefined;
    roofTypeId: string | undefined;
    unit: number | undefined;
  }>({
    open: false,
    grcId: '',
    index: undefined,

    itemId: undefined,
    roofTypeId: undefined,
    unit: undefined,
  });

  let revalidator = useRevalidator();

  function openDialog(grcId: string, index: number) {
    const match = rows.find((row) => rows.indexOf(row) === index);

    setDialogState({
      open: true,
      grcId,
      index,

      itemId: match?.itemId,
      roofTypeId: match?.roofTypeId,
      unit: match?.area || undefined,
    });
  }

  function closeDialog(index: number) {
    setRows((prevState) =>
      prevState.filter((row) => {
        return !(!row.id && prevState.indexOf(row) === index);
      }),
    );
    setDialogState({
      open: false,
      grcId: '',
      index: undefined,

      itemId: undefined,
      roofTypeId: undefined,
      unit: undefined,
    });
    revalidator.revalidate();
  }

  return (
    <>
      <NewCalculatorDialog
        plotId={plot.id}
        key={new Date().getTime()}
        grcId={dialogState.grcId}
        recordProps={{
          recordType: 'insurance',
          itemId: dialogState.itemId,
          roofTypeId: dialogState.roofTypeId,
          unit: dialogState.unit,
        }}
        isBull={false}
        index={dialogState.index}
        isAdmin={currentUser.isSuper}
        isOpen={dialogState.open}
        // isOpen={!!currentGrcId}
        closeDialog={closeDialog}
      />
      <fetcher.Form method="post" onSubmit={handleSubmit} className="flex flex-col items-stretch gap-8">
        <ActionContextProvider {...fetcher.data} updateState={updateState} isSubmitting={isProcessing} disabled={cantEdit}>
          <span className="text-xl font-semibold">Insurance Costs</span>
          <div className="flex flex-col items-stretch gap-2">
            <div className="flex flex-row items-end gap-2">
              <h3 className="text-lg font-semibold">Items</h3>
            </div>
            <div className="flex flex-col items-stretch">
              <div className="flex flex-row items-stretch">
                <div className="grow grid grid-cols-5">
                  <GridHeading>Asset Type</GridHeading>
                  <GridHeading>Roof Type</GridHeading>
                  <GridHeading className="text-end">Unit</GridHeading>
                  <GridHeading className="text-end">Rate</GridHeading>
                  <GridHeading className="text-end">Total</GridHeading>
                </div>
                <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
                  <SecondaryButton isIcon disabled className="invisible">
                    <X size={16} />
                  </SecondaryButton>
                </div>
              </div>
              {rows.map((row) => (
                <InsuranceRow
                  key={row.index}
                  {...row}
                  insuranceId={row.id}
                  rate={row.rate || ''}
                  area={row.area || ''}
                  items={items}
                  roofTypes={roofTypes}
                  deleteRow={deleteRow}
                  err={row.err}
                  openCalcDialog={openDialog}
                // openCalcDialog={setCurrentGrcId}
                />
              ))}
              <div className="flex flex-col items-end py-2">
                <SecondaryButton type="button" onClick={addRow} disabled={cantEdit} className="flex flex-row items-center gap-2">
                  <Plus className={twMerge('text-teal-600', cantEdit && 'text-stone-400')} />
                  Add Insurance Item
                </SecondaryButton>
              </div>
              <div className="flex flex-row items-stretch">
                <div className="flex flex-col items-stretch grow">
                  <div className="grid grid-cols-5">
                    <GridCell className="text-end col-span-4 py-4">Sub-Total:</GridCell>
                    <GridCell className="text-end">
                      <span className="font-semibold text-end">{formatAmount(subTotal)}</span>
                    </GridCell>
                  </div>
                  <div className="grid grid-cols-5">
                    <GridCell className="text-end col-span-3 py-4">VAT:</GridCell>
                    <GridCell className="text-end">
                      <div className="flex flex-row items-center gap-2">
                        <CustomStoredValue name="insuranceVat" defaultValue={storedValues.insuranceVat} isCamo type="number" className="text-end" />
                        <span className="text-base font-light">%</span>
                      </div>
                    </GridCell>
                    <GridCell className="text-end">
                      <span className="font-semibold">{formatAmount(vat)}</span>
                    </GridCell>
                  </div>
                  <div className="grid grid-cols-5">
                    <GridCell className="text-end col-span-3 py-4">Professional Fees:</GridCell>
                    <GridCell className="text-end">
                      <div className="flex flex-row items-center gap-2">
                        <CustomStoredValue name="profFee" defaultValue={storedValues.profFee} isCamo type="number" className="text-end" />
                        <span className="text-base font-light">%</span>
                      </div>
                    </GridCell>
                    <GridCell className="text-end">
                      <span className="font-semibold text-end">{formatAmount(profFees)}</span>
                    </GridCell>
                  </div>
                  <div className="grid grid-cols-5">
                    <GridCell className="text-end col-span-4 py-4">Replacement Cost</GridCell>
                    <GridCell className="text-end">
                      <span className="font-semibold text-end">{formatAmount(replacementCost)}</span>
                    </GridCell>
                  </div>
                  <div className="grid grid-cols-5">
                    <GridCell className="text-end col-span-2 py-4">Pre Tender Escalation @:</GridCell>
                    <GridCell className="text-end">
                      <CustomStoredValue name="preTenderEscalationAt" defaultValue={storedValues.preTenderEscalationAt} isCamo type="number" className="text-end" />
                    </GridCell>
                    <GridCell className="text-end">
                      <div className="flex flex-row items-center gap-1">
                        <CustomStoredValue name="preTenderEscalationPerc" defaultValue={storedValues.preTenderEscalationPerc} isCamo type="number" className="text-end" />
                        <span className="font-light text-xl">%</span>
                      </div>
                    </GridCell>
                    <GridCell className="text-end">
                      <span className="font-semibold text-end">{formatAmount(preTenderEscl)}</span>
                    </GridCell>
                  </div>
                  <div className="grid grid-cols-5">
                    <GridCell className="text-end col-span-2 py-4">Post Tender Escalation @:</GridCell>
                    <GridCell className="text-end">
                      <CustomStoredValue name="postTenderEscalationAt" defaultValue={storedValues.postTenderEscalationAt} isCamo type="number" className="text-end" />
                    </GridCell>
                    <GridCell className="text-end">
                      <div className="flex flex-row items-center gap-1">
                        <CustomStoredValue name="postTenderEscalationPerc" defaultValue={storedValues.postTenderEscalationPerc} isCamo type="number" className="text-end" />
                        <span className="font-light text-xl">%</span>
                      </div>
                    </GridCell>
                    <GridCell className="text-end">
                      <span className="font-semibold text-end">{formatAmount(postTenderEscl)}</span>
                    </GridCell>
                  </div>
                  <div className="grid grid-cols-5">
                    <GridCell className="text-end font-semibold col-span-4 py-4">Total</GridCell>
                    <GridCell className="text-end">
                      <span className="font-semibold text-end">{formatAmount(total)}</span>
                    </GridCell>
                  </div>
                </div>
                <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
                  <SecondaryButton isIcon disabled className="invisible">
                    <X size={16} />
                  </SecondaryButton>
                </div>
              </div>
              <SavePanel>
                <input type="hidden" {...getNameProp('rows')} value={JSON.stringify(rows.filter((row) => row.itemId))} />
                <input type="hidden" {...getNameProp('storedValues')} value={JSON.stringify(storedValues)} />
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
          </div>
        </ActionContextProvider>
      </fetcher.Form>
    </>
  );
}
export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
