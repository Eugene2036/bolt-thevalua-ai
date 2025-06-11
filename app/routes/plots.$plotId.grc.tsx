import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { FormEvent } from 'react';
import type { RowGrc, RowGrcDepr, RowGrcFee, StateTupleSchema } from '~/models/core.validations';

import { json } from '@remix-run/node';
import { useFetcher, useLoaderData, useRevalidator } from '@remix-run/react';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { AnalysisDate } from '~/components/AnalysisDate';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { GrcDeprsTable } from '~/components/GRCDeprTable';
import { GrcFeesTable } from '~/components/GRCFeesTable';
import { GrcTable } from '~/components/GRCTable';
import { InspectionDate } from '~/components/InspectionDate';
import { NewCalculatorDialog } from '~/components/NewCalculatorDialog';
import { PlotSize } from '~/components/PlotSize';
import { PrimaryButton } from '~/components/PrimaryButton';
import SavePanel from '~/components/SavePanel';
import { prisma } from '~/db.server';
import {
  RowGrcDeprSchema,
  RowGrcFeeSchema,
  RowGrcSchema,
  StatusCode,
  badRequest,
  getValidatedId,
  hasSuccess,
  newGrcRow,
  processBadRequest,
  validateStateId,
} from '~/models/core.validations';
import { delay } from '~/models/dates';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { fieldErrorsToArr, getRawFormFields, hasFieldErrors, hasFormError } from '~/models/forms';
import { requireUserId } from '~/session.server';
import { useUser } from '~/utils';

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
        grcFeeRecords: {
          select: {
            id: true,
            identifier: true,
            perc: true,
          },
        },
        grcDeprRecords: {
          select: {
            id: true,
            identifier: true,
            perc: true,
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
        grcRecords: (() => {
          const bulls = (() => {
            const records = plot.grcRecords.filter((record) => record.bull);
            return records.length ? records : [newGrcRow(0, true)];
          })();
          const normals = (() => {
            const records = plot.grcRecords.filter((record) => !record.bull);
            return records.length ? records : [newGrcRow(1, false)];
          })();
          return [...bulls, ...normals].map((record) => ({
            ...record,
            bull: record.bull || false,
            size: Number(record.size),
            rate: Number(record.rate),
          }));
        })(),
        grcFeeRecords: plot.grcFeeRecords.map((record) => ({
          ...record,
          perc: Number(record.perc),
        })),
        grcDeprRecords: (() => {
          const records = plot.grcDeprRecords.map((record) => ({
            ...record,
            perc: Number(record.perc),
          }));
          if (records.length) {
            return records;
          }
          return [{ id: '', identifier: '', perc: 0 }];
        })(),
      };
    });
  if (!plot) {
    throw new Response('Plot record not found', {
      status: StatusCode.NotFound,
    });
  }

  // const landRate =
  //   storedValues.find(
  //     (storedValue) => storedValue.identifier === StoredValueId.LandRate,
  //   )?.value || 0;

  return json({ plot });
}

const Schema = z.object({
  analysisDate: z.coerce.date(),
  inspectionDate: z.coerce.date(),
  plotSize: z.coerce.number().min(0),
  // landRate: z.coerce.number().min(0),
  grcRecords: z.preprocess((arg) => {
    try {
      if (typeof arg === 'string') {
        const result = JSON.parse(arg);
        return result;
      }
    } catch (error) {
      return undefined;
    }
  }, z.array(RowGrcSchema)),
  feeRecords: z.preprocess((arg) => {
    try {
      if (typeof arg === 'string') {
        const result = JSON.parse(arg);
        return result;
      }
    } catch (error) {
      return undefined;
    }
  }, z.array(RowGrcFeeSchema)),
  deprRecords: z.preprocess((arg) => {
    try {
      if (typeof arg === 'string') {
        const result = JSON.parse(arg);
        return result;
      }
    } catch (error) {
      return undefined;
    }
  }, z.array(RowGrcDeprSchema)),
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
    const {
      analysisDate,
      inspectionDate,
      plotSize,
      // landRate,
      grcRecords,
      feeRecords,
      deprRecords,
    } = result.data;

    const record = await prisma.plot.findMany();
    await prisma.$transaction(async (tx) => {
      const updated = await tx.plot.update({
        where: { id: plotId },
        data: { analysisDate, inspectionDate, plotExtent: plotSize },
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
      const currentGrcRecords = await tx.grc.findMany({
        where: { plotId },
        select: { id: true },
      });
      const newGrcRecords = grcRecords.filter((grcRecord) => !grcRecord.id);
      const existingGrcRecords = grcRecords.filter((grcRecord) => grcRecord.id);
      const grcRecordsToDelete = currentGrcRecords.filter((grcRecord) => {
        return grcRecords.every((el) => el.id !== grcRecord.id);
      });
      await grcRecordsToDelete.reduce(async (acc, grcRecord) => {
        await acc;
        await tx.grc.delete({ where: { id: grcRecord.id } });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Grc,
            action: EventAction.Delete,
            recordId: grcRecord.id,
            recordData: JSON.stringify(grcRecord),
          },
        });
      }, Promise.resolve());
      await newGrcRecords.reduce(async (acc, grcRecord) => {
        await acc;
        const record = await tx.grc.create({
          data: {
            plotId,
            identifier: grcRecord.identifier,
            unit: grcRecord.unit,
            size: grcRecord.size || 0,
            rate: grcRecord.rate || 0,
            bull: grcRecord.bull,
          },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Grc,
            action: EventAction.Create,
            recordId: record.id,
            recordData: JSON.stringify(record),
          },
        });
      }, Promise.resolve());
      await existingGrcRecords.reduce(async (acc, grc) => {
        await acc;
        const updated = await tx.grc.update({
          where: { id: grc.id },
          data: {
            identifier: grc.identifier,
            unit: grc.unit,
            size: grc.size || 0,
            rate: grc.rate || 0,
            bull: grc.bull,
          },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Grc,
            action: EventAction.Update,
            recordId: grc.id,
            recordData: JSON.stringify(updated),
          },
        });
      }, Promise.resolve());

      const currentFeeRecords = await tx.grcFee.findMany({
        where: { plotId },
        select: { id: true },
      });
      const newFeeRecords = feeRecords.filter((record) => !record.id);
      const existingFeeRecords = feeRecords.filter((record) => record.id);
      const feeRecordsToDelete = currentFeeRecords.filter((record) => {
        return feeRecords.every((el) => el.id !== record.id);
      });
      await feeRecordsToDelete.reduce(async (acc, grcRecord) => {
        await acc;
        await tx.grc.delete({ where: { id: grcRecord.id } });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Grc,
            action: EventAction.Delete,
            recordId: grcRecord.id,
            recordData: JSON.stringify(grcRecord),
          },
        });
      }, Promise.resolve());
      await newFeeRecords.reduce(async (acc, grcRecord) => {
        await acc;
        const record = await tx.grcFee.create({
          data: {
            plotId,
            identifier: grcRecord.identifier,
            perc: grcRecord.perc,
          },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.GrcFee,
            action: EventAction.Create,
            recordId: grcRecord.id,
            recordData: JSON.stringify(record),
          },
        });
      }, Promise.resolve());
      await existingFeeRecords.reduce(async (acc, grc) => {
        await acc;
        const updated = await tx.grcFee.update({
          where: { id: grc.id },
          data: {
            identifier: grc.identifier,
            perc: grc.perc,
          },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.GrcFee,
            action: EventAction.Update,
            recordId: grc.id,
            recordData: JSON.stringify(updated),
          },
        });
      }, Promise.resolve());

      const currentDeprRecords = await tx.grcDepr.findMany({
        where: { plotId },
        select: { id: true },
      });
      const newDeprRecords = deprRecords.filter((record) => !record.id);
      const existingDeprRecords = deprRecords.filter((record) => record.id);
      const deprRecordsToDelete = currentDeprRecords.filter((record) => {
        return deprRecords.every((el) => el.id !== record.id);
      });
      await deprRecordsToDelete.reduce(async (acc, grcRecord) => {
        await acc;
        await tx.grcDepr.delete({ where: { id: grcRecord.id } });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.GrcDepr,
            action: EventAction.Delete,
            recordId: grcRecord.id,
            recordData: JSON.stringify(grcRecord),
          },
        });
      }, Promise.resolve());
      await newDeprRecords.reduce(async (acc, grcRecord) => {
        await acc;
        const record = await tx.grcDepr.create({
          data: {
            plotId,
            identifier: grcRecord.identifier,
            perc: grcRecord.perc,
          },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.GrcDepr,
            action: EventAction.Create,
            recordId: grcRecord.id,
            recordData: JSON.stringify(record),
          },
        });
      }, Promise.resolve());
      await existingDeprRecords.reduce(async (acc, grc) => {
        await acc;
        const updated = await tx.grcDepr.update({
          where: { id: grc.id },
          data: {
            identifier: grc.identifier,
            perc: grc.perc,
          },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.GrcDepr,
            action: EventAction.Update,
            recordId: grc.id,
            recordData: JSON.stringify(updated),
          },
        });
      }, Promise.resolve());
    });

    return json({ success: true });
  } catch (error) {
    const formError = getErrorMessage(error);
    console.log('formError', formError);
    return badRequest({ formError });
  }
}

export default function PlotGRCPage() {
  const currentUser = useUser();
  const { plot } = useLoaderData<typeof loader>();

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

  useEffect(() => {
    if (hasFieldErrors(fetcher.data)) {
      const grcFieldErrors = fetcher.data.fieldErrors[getNameProp('grcRecords').name];
      if (grcFieldErrors) {
        toast.error(
          <div className="flex flex-col items-stretch">
            {grcFieldErrors.map((e) => (
              <span key={e} className="text-red-600">
                {e}
              </span>
            ))}
          </div>,
        );
      }
    }
  }, [fetcher.data, getNameProp]);

  const [analysisDate, setAnalysisDate] = useState(dayjs(plot.analysisDate).toDate());
  useEffect(() => {
    setAnalysisDate(dayjs(plot.analysisDate).toDate());
  }, [plot.analysisDate]);

  const [inspectionDate, setInspectionDate] = useState(dayjs(plot.inspectionDate).toDate());
  useEffect(() => {
    setInspectionDate(dayjs(plot.inspectionDate).toDate());
  }, [plot.inspectionDate]);
  const [plotSize, setPlotSize] = useState(plot.plotExtent);
  useEffect(() => {
    setPlotSize(plot.plotExtent);
  }, [plot.plotExtent]);

  const mappedRecords = useMemo(() => {
    return plot.grcRecords.length
      ? plot.grcRecords.map((record, index) => ({
          ...record,
          index,
        }))
      : [
          {
            index: 0,
            id: '',
            identifier: '',
            unit: '',
            size: 0,
            rate: 0,
            bull: false,
          },
          {
            index: 0,
            id: '',
            identifier: '',
            unit: '',
            size: 0,
            rate: 0,
            bull: true,
          },
        ];
  }, [plot.grcRecords]);

  const [grcRecords, setGrcRecords] = useState<(RowGrc & { index: number; err?: string })[]>(mappedRecords);

  const check = JSON.stringify(mappedRecords);
  useEffect(() => {
    console.log('mapped records changes');
    setGrcRecords(mappedRecords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [check]);

  const [fees, setFees] = useState<(RowGrcFee & { index: number; err?: string })[]>(plot.grcFeeRecords.map((record, index) => ({ ...record, index })));

  const [deprs, setDeprs] = useState<(RowGrcDepr & { index: number; err?: string })[]>(plot.grcDeprRecords.map((record, index) => ({ ...record, index })));

  const grcTotal = grcRecords.reduce((acc, record) => acc + (record.rate || 0) * (record.size || 0), 0);

  const netTotal =
    grcTotal +
    plot.grcFeeRecords.reduce((acc, record) => {
      const rowTotal = Number((record.perc * 0.01 * grcTotal).toFixed(2));
      return acc + rowTotal;
    }, 0);

  async function addGrcRow(bull: boolean) {
    setGrcRecords((prevState) => {
      const lastRow = prevState.length ? prevState[prevState.length - 1] : { index: 0 };
      return [...prevState, newGrcRow(lastRow.index + 1, bull)];
    });
    await delay(100);
    const erred = validate();
    if (erred) {
      console.log('erred');
      return;
    }
    if (formRef.current) {
      fetcher.submit(formRef.current);
    }
  }
  const addBull = () => addGrcRow(true);
  const addNormal = () => addGrcRow(false);

  async function addGrcDepr() {
    setDeprs((prevState) => {
      const lastRow = prevState.length ? prevState[prevState.length - 1] : { index: 0 };
      return [
        ...prevState,
        {
          index: lastRow.index + 1,
          id: '',
          identifier: '',
          perc: 0,
        },
      ];
    });
    await delay(100);
    if (formRef.current) {
      fetcher.submit(formRef.current);
    }
  }

  const deleteGrcRow = (index: number) => {
    setGrcRecords((prevState) => prevState.filter((el) => el.index !== index));
  };
  const deleteDepr = (index: number) => {
    setDeprs((prevState) => prevState.filter((el) => el.index !== index));
  };

  function updateGrcField<T extends z.ZodTypeAny>(stateTuple: z.infer<typeof StateTupleSchema>, Schema: T, data: unknown) {
    const index = stateTuple[1];
    const field = stateTuple[2];
    const result = Schema.safeParse(data);
    if (!result.success) {
      return console.log(field, 'error', result.error);
    }
    console.log('new value for', field, result.data);
    setGrcRecords((prevState) =>
      prevState.map((tenant) => {
        if (tenant.index !== index) {
          return tenant;
        }
        return { ...tenant, [field]: result.data };
      }),
    );
  }
  function updateFeeField<T extends z.ZodTypeAny>(stateTuple: z.infer<typeof StateTupleSchema>, Schema: T, data: unknown) {
    const index = stateTuple[1];
    const field = stateTuple[2];
    const result = Schema.safeParse(data);
    if (!result.success) {
      return console.log(field, 'error', result.error);
    }
    console.log('new value for', field, result.data);
    setFees((prevState) =>
      prevState.map((tenant) => {
        if (tenant.index !== index) {
          return tenant;
        }
        return { ...tenant, [field]: result.data };
      }),
    );
  }
  function updateDeprField<T extends z.ZodTypeAny>(stateTuple: z.infer<typeof StateTupleSchema>, Schema: T, data: unknown) {
    const index = stateTuple[1];
    const field = stateTuple[2];
    const result = Schema.safeParse(data);
    if (!result.success) {
      return console.log(field, 'error', result.error);
    }
    console.log('new value for', field, result.data);
    setDeprs((prevState) =>
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
        const result = z.coerce.date().safeParse(data);
        if (result.success) {
          setAnalysisDate(result.data);
        }
      }
      if (stateTuple === getNameProp('inspectionDate').name) {
        const result = z.coerce.date().safeParse(data);
        if (result.success) {
          setInspectionDate(result.data);
        }
      }
      if (stateTuple === getNameProp('plotSize').name) {
        const result = z.coerce.number().safeParse(data);
        if (result.success) {
          setPlotSize(result.data);
        }
      }
      // if (stateTuple === getNameProp('landRate').name) {
      //   const result = z.coerce.number().safeParse(data);
      //   if (result.success) {
      //     setLandRate(result.data);
      //   }
      // }
      return;
    }
    const id = stateTuple[0];
    const field = stateTuple[2];
    if (id === 'grc') {
      if (field === 'identifier') {
        updateGrcField(stateTuple, z.string(), data);
      }
      if (field === 'unit') {
        updateGrcField(stateTuple, z.string(), data);
      }
      if (field === 'size') {
        updateGrcField(stateTuple, z.coerce.number(), data);
      }
      if (field === 'rate') {
        updateGrcField(stateTuple, z.coerce.number(), data);
      }
    }
    if (id === 'grcFee') {
      if (field === 'identifier') {
        updateFeeField(stateTuple, z.string(), data);
      }
      if (field === 'perc') {
        updateFeeField(stateTuple, z.coerce.number(), data);
      }
    }
    if (id === 'depr') {
      if (field === 'identifier') {
        updateDeprField(stateTuple, z.string(), data);
      }
      if (field === 'perc') {
        updateDeprField(stateTuple, z.coerce.number(), data);
      }
    }
  }

  function validateGrcs() {
    const relevantRows = grcRecords.filter((el) => el.identifier);
    const erred = relevantRows
      .map((el) => {
        const result = RowGrcSchema.safeParse(el);
        if (!result.success) {
          const { fieldErrors, formErrors } = result.error.flatten();
          const error = [...fieldErrorsToArr(fieldErrors), ...formErrors].filter(Boolean).join(', ');
          return [el.index, error] as const;
        }
        return undefined;
      })
      .filter(Boolean);
    if (erred.length) {
      setGrcRecords((prevState) =>
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
  function validateFees() {
    const relevantRows = fees.filter((el) => el.identifier);
    const erred = relevantRows
      .map((el) => {
        const result = RowGrcFeeSchema.safeParse(el);
        if (!result.success) {
          const { fieldErrors, formErrors } = result.error.flatten();
          const error = [...fieldErrorsToArr(fieldErrors), ...formErrors].filter(Boolean).join(', ');
          return [el.index, error] as const;
        }
        return undefined;
      })
      .filter(Boolean);
    if (erred.length) {
      setFees((prevState) =>
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
  function validateDepr() {
    const relevantRows = deprs.filter((el) => el.identifier);
    const erred = relevantRows
      .map((el) => {
        const result = RowGrcDeprSchema.safeParse(el);
        if (!result.success) {
          const { fieldErrors, formErrors } = result.error.flatten();
          const error = [...fieldErrorsToArr(fieldErrors), ...formErrors].filter(Boolean).join(', ');
          return [el.index, error] as const;
        }
        return undefined;
      })
      .filter(Boolean);
    if (erred.length) {
      setDeprs((prevState) =>
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

  function validate() {
    const erred = validateGrcs();
    if (erred) {
      return true;
    }
    const feesErred = validateFees();
    if (feesErred) {
      return true;
    }
    const deprErred = validateDepr();
    if (deprErred) {
      return true;
    }
    return false;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const erred = validate();
    if (erred) {
      return;
    }
    fetcher.submit(event.currentTarget);
  }

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    grcId: string;
    index: number | undefined;

    identifier: string | undefined;
    size: number | undefined;
    unit: string | undefined;
  }>({
    open: false,
    grcId: '',
    index: undefined,

    identifier: undefined,
    size: undefined,
    unit: undefined,
  });

  let revalidator = useRevalidator();

  function openDialog(grcId: string, index: number) {
    const match = grcRecords.find((row) => grcRecords.indexOf(row) === index);

    setDialogState({
      open: true,
      grcId,
      index,

      identifier: match?.identifier,
      size: match?.size || undefined,
      unit: match?.unit,
    });
  }

  function closeDialog(index: number) {
    setGrcRecords((prevState) => prevState.filter((row) => prevState.indexOf(row) !== index));
    setDialogState({
      open: false,
      grcId: '',
      index: undefined,

      identifier: undefined,
      size: undefined,
      unit: undefined,
    });
    revalidator.revalidate();
  }
  // const [currentGrcId, setCurrentGrcId] = useState('');

  // let revalidator = useRevalidator();

  // function closeDialog() {
  //   setCurrentGrcId('');
  //   revalidator.revalidate();
  // }

  function isBull(grcId: string) {
    const bulls = grcRecords.filter((record) => record.bull);
    console.log('grcId', grcId);
    console.log('bulls', bulls.map((b) => b.id).join(', '));
    return bulls.some((b) => b.id === grcId);
  }

  return (
    <>
      <NewCalculatorDialog
        plotId={plot.id}
        key={new Date().getTime()}
        grcId={dialogState.grcId}
        recordProps={{
          recordType: 'grc',
          identifier: dialogState.identifier,
          size: dialogState.size,
          unit: dialogState.unit,
        }}
        isBull={isBull(dialogState.grcId)}
        index={dialogState.index}
        isAdmin={currentUser.isSuper}
        isOpen={dialogState.open}
        // isOpen={!!currentGrcId}
        closeDialog={closeDialog}
      />
      {/* <CalculatorDialog
        key={new Date().getTime()}
        grcId={currentGrcId}
        insurance={false}
        isBull={isBull(currentGrcId)}
        isAdmin={currentUser.isSuper}
        isOpen={!!currentGrcId}
        closeDialog={closeDialog}
      /> */}
      <fetcher.Form ref={formRef} onSubmit={handleSubmit} method="post" className={twMerge('flex flex-col items-stretch gap-8')}>
        <ActionContextProvider {...fetcher.data} noErrors={true} updateState={updateState} isSubmitting={isProcessing}>
          <input type="hidden" {...getNameProp('analysisDate')} value={analysisDate.toString()} />
          <input type="hidden" {...getNameProp('inspectionDate')} value={inspectionDate.toString()} />
          <input type="hidden" {...getNameProp('plotSize')} value={plotSize.toString()} />
          {/* <input
          type="hidden"
          {...getNameProp('landRate')}
          value={landRate.toString()}
        /> */}
          <input type="hidden" {...getNameProp('grcRecords')} value={JSON.stringify(grcRecords.filter((r) => r.identifier))} />
          <input type="hidden" {...getNameProp('feeRecords')} value={JSON.stringify(fees)} />
          <input type="hidden" {...getNameProp('deprRecords')} value={JSON.stringify(deprs)} />
          <div className="grid grid-cols-3 gap-6">
            <AnalysisDate {...getNameProp('analysisDate')} analysisDate={analysisDate} />
            <InspectionDate {...getNameProp('inspectionDate')} inspectionDate={inspectionDate} />
            <PlotSize {...getNameProp('plotSize')} plotSize={plotSize} />
            {/* <div className="flex flex-row items-center gap-2">
            <span className="text-lg font-light">Land Rate: </span>
            <CustomStoredValue
              {...getNameProp('landRate')}
              defaultValue={landRate}
              isCamo
              type="number"
              step={0.01}
              className="text-end"
            />
          </div> */}
          </div>
          <div className="flex flex-col items-stretch gap-2">
            <div className="flex flex-row items-end gap-2">
              <h3 className="text-lg font-semibold">Gross Replacement Cost</h3>
            </div>
            <GrcTable
              bulls={grcRecords.filter((record) => record.bull)}
              normals={grcRecords.filter((record) => !record.bull)}
              addBull={addBull}
              addNormal={addNormal}
              deleteRow={deleteGrcRow}
              openCalcDialog={openDialog}
            />
          </div>
          <div className="flex flex-col items-stretch gap-2">
            <div className="flex flex-row items-end gap-2">
              <h3 className="text-lg font-semibold">Fees</h3>
            </div>
            <GrcFeesTable records={fees} grcTotal={grcTotal} />
          </div>
          <div className="flex flex-col items-stretch gap-2">
            <div className="flex flex-row items-end gap-2">
              <h3 className="text-lg font-semibold">Depreciation</h3>
            </div>
            <GrcDeprsTable records={deprs} grcTotal={grcTotal} netTotal={netTotal} addRow={addGrcDepr} deleteRow={deleteDepr} />
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
    </>
  );
}
export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
