import type { ZodError, ZodType } from 'zod';

import { json } from '@remix-run/server-runtime';
import dayjs from 'dayjs';
import { z } from 'zod';

import { fieldErrorsToArr, type ActionData, type FormFieldKey } from './forms';
import { ValuationType } from './plots.validations';
import { prisma } from '~/db.server';

export enum RecordType {
  User = 'User',
  Subject = 'Subject',
  Topic = 'Topic',
}
export const RECORD_TYPES = [RecordType.User, RecordType.Subject, RecordType.Topic] as const;

export enum ResponseMessage {
  Unauthorised = "You're not authorised to access this resource",
  InvalidId = 'Invalid ID provided',
  RecordNotFound = 'Record not found',
  DeletedRecord = 'Record was deleted',
  InvalidMethod = 'Invalid request method provided',
}

export enum StatusCode {
  BadRequest = 400,
  Unauthorised = 401,
  Forbidden = 403,
  NotFound = 404,
}

export const INVALID_VALUES_FROM_SERVER = 'Received invalid values from server, please contact the system maintainers';

export function containsNumbers(str: string) {
  return Boolean(str.match(/\d/));
}

export const StringNumber = z.coerce.number({
  invalid_type_error: 'Provide a valid number',
  required_error: 'Provide a number',
});

export const PresentStringSchema = z
  .string({
    invalid_type_error: 'Provide a valid string',
    required_error: 'Provide a string',
  })
  .min(1, { message: 'Use at least 1 character for the string' });

export function ComposeRecordIdSchema(identifier: string, optional?: 'optional') {
  const Schema = z.string({
    invalid_type_error: `Enter a valid ${identifier}`,
    required_error: `Enter a ${identifier}`,
  });
  if (optional) {
    return Schema;
  }
  return Schema.min(1, { message: `Enter a valid ${identifier}` });
}
export const RecordIdSchema = ComposeRecordIdSchema('record ID');

export function hasSuccess(data: unknown): data is { success: boolean } {
  return z.object({ success: z.literal(true) }).safeParse(data).success;
}

export function cn(...inputs: (string | undefined | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}

export function getValidatedId(rawId: any) {
  const result = RecordIdSchema.safeParse(rawId);
  if (!result.success) {
    throw new Response(ResponseMessage.InvalidId, {
      status: StatusCode.BadRequest,
    });
  }
  return result.data;
}

export function badRequest<F extends FormFieldKey = string>(data: ActionData<F>, _?: Record<F, any>) {
  return json(data, { status: StatusCode.BadRequest });
}

export function processBadRequest(zodError: z.ZodError<any>, fields: any) {
  const { formErrors, fieldErrors } = zodError.flatten();
  return badRequest({
    fields,
    fieldErrors,
    formError: formErrors.join(', '),
  });
}

export function getQueryParams<T extends string>(url: string, params: T[]) {
  const urlObj = new URL(url);
  return params.reduce(
    (acc, param) => ({
      ...acc,
      [param]: urlObj.searchParams.get(param) || undefined,
    }),
    {} as Record<T, string | undefined>,
  );
}

export function getPropsFromObj<T extends string>(obj: Record<string, any>, props: T[], fallbackValue?: any) {
  return props.reduce(
    (acc, prop) => {
      return { ...acc, [prop]: obj[prop] || fallbackValue };
    },
    {} as Record<T, any>,
  );
}

export const TitleSchema = z
  .string({
    required_error: 'Please enter the title',
    invalid_type_error: 'Please provide valid input for the title',
  })
  .min(1, 'Please enter the title first')
  .max(100, 'Please use less than 200 characters for the title');

export function places(value: number) {
  return Number(value.toFixed(2));
}

export function stringifyZodError(zodError: ZodError) {
  const { fieldErrors, formErrors } = zodError.flatten();
  const allErrors = [...(fieldErrorsToArr(fieldErrors) || []), ...formErrors];
  return allErrors.join(', ');
}

export function safeJsonParse(data: unknown) {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (error) {
      return undefined;
    }
  }
}

export function recursiveStringify(obj: unknown) {
  return JSON.stringify(obj, (_, value) => {
    if (typeof value === "object" && value !== null) {
      return Array.isArray(value)
        ? value.map(v => recursiveStringify(v)) // Handle arrays recursively
        : Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, recursiveStringify(v)])
        ); // Handle objects recursively
    }
    return String(value); // Convert primitives to strings
  });
}

export const RequiredImageIdSchema = z.string().min(1, 'Please provide an image').max(800);

export const RequiredAttachmentsSchema = z.object({
  fileName: z.string(),
  fileUrl: z.string(),
  fileType: z.string(),
  notificationId: z.string(),
});

export const RequiredAttachmentIdSchema = z.string().min(1, 'Please provide an image').max(800);

export function formatAmount(amount: number, fractionDigits?: number) {
  const refinedAmount = Number(amount.toFixed(1));
  return refinedAmount.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits !== undefined ? fractionDigits : 2,
    maximumFractionDigits: fractionDigits !== undefined ? fractionDigits : 2,
  });
}

export function calcMaintenanceOutgoing(annualGross: number, vacancyPerc: number) {
  const effectiveVacancyValue = vacancyPerc * 0.01;
  return effectiveVacancyValue ? -annualGross * effectiveVacancyValue + annualGross : effectiveVacancyValue;
}

export const GrcSchema = z.object({
  identifier: z.string().min(1, "Enter the item's name"),
  unit: z.string(),
  size: z.coerce.number().min(0),
  rate: z.coerce.number().min(0),
  bull: z.coerce.boolean(),
});
export const AddGrcSchema = GrcSchema.merge(
  z.object({
    plotId: ComposeRecordIdSchema('plot'),
  }),
);
export const RowGrcSchema = z.object({
  id: z.string().or(z.literal('')),
  identifier: z.string().min(1, "Enter the item's name"),
  unit: z.string(),
  size: z.literal('').or(z.coerce.number().min(0)),
  rate: z.literal('').or(z.coerce.number().min(0)),
  bull: z.coerce.boolean(),
});
export type RowGrc = z.infer<typeof RowGrcSchema>;

export const MVSchema = z.object({
  identifier: z.string().min(1, "Enter the item's name"),
  size: z.coerce.number().min(0),
  date: z.coerce.date(),
  location: z.string(),
  price: z.coerce.number().min(0),
});
export const AddMVSchema = MVSchema.merge(
  z.object({
    plotId: ComposeRecordIdSchema('plot'),
  }),
);
export const RowMVSchema = z.object({
  id: z.string().or(z.literal('')),
  identifier: z.string().min(1, "Enter the item's name"),
  size: z.coerce.number().min(0),
  date: z.coerce.date(),
  location: z.string(),
  price: z.coerce.number().min(0),
});
export type RowMV = z.infer<typeof RowMVSchema>;

export const GrcFeeSchema = z.object({
  identifier: z.string().min(1, "Enter the item's name"),
  perc: z.coerce.number().min(0),
});
export const AddGrcFeeSchema = GrcFeeSchema.merge(
  z.object({
    plotId: ComposeRecordIdSchema('plot'),
  }),
);
export const RowGrcFeeSchema = z.object({
  id: z.string().or(z.literal('')),
  identifier: z.string().min(1, "Enter the item's name"),
  perc: z.literal('').or(z.coerce.number().min(0)),
});
export type RowGrcFee = z.infer<typeof RowGrcFeeSchema>;

export const GrcDeprSchema = z.object({
  identifier: z.string().min(1, "Enter the item's name"),
  perc: z.literal('').or(z.coerce.number().min(0)),
});
export const AddGrcDeprSchema = GrcDeprSchema.merge(
  z.object({
    plotId: ComposeRecordIdSchema('plot'),
  }),
);
export const RowGrcDeprSchema = z.object({
  id: z.string().or(z.literal('')),
  identifier: z.string().min(1, "Enter the item's name"),
  perc: z.literal('').or(z.coerce.number().min(0)),
});
export type RowGrcDepr = z.infer<typeof RowGrcDeprSchema>;

export function roundDown(number: number, decimals: number) {
  return bardRound(number, decimals);
}

export function bardRound(number: number, precision: number) {
  if (precision === undefined) {
    precision = 0;
  }

  const multiplier = Math.pow(10, precision);
  return Math.round(number * multiplier) / multiplier;
}

export function bingRound(number: number, digits: number) {
  var negative = false;
  if (digits === undefined || digits === 0) {
    return Math.round(number);
  }
  if (number < 0) {
    negative = true;
    number = -number;
  }
  var factor = Math.pow(10, digits);
  number = Math.round(number * factor) / factor;
  if (negative) {
    number = -number;
  }
  return number;
}

export function getStateId(param: [id: string, index: number, field: string]) {
  return JSON.stringify(param);
}

export const StateTupleSchema = z.tuple([z.string(), z.number(), z.string()]);
export function validateStateId(data: unknown) {
  const Schema = z.preprocess((arg) => {
    try {
      if (typeof arg === 'string') {
        return JSON.parse(arg);
      }
      return arg;
    } catch (error) {
      return arg;
    }
  }, StateTupleSchema);
  // const result = z.string().or(TupleSchema).safeParse(data);
  const result = Schema.or(z.string()).safeParse(data);
  if (result.success) {
    return result.data;
  }
}

export const AnalysisDateSchema = z.coerce.date();
export const RowTenantSchema = z.object({
  id: z.string().or(z.literal('')),
  name: z.string().min(1),
  propertyTypeId: ComposeRecordIdSchema('property type'),
  area: z.coerce.number().min(0),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  grossMonthly: z.coerce.number().min(0),
  ratePerMarket: z.coerce.number().min(0),
  escl: z.coerce.number().min(0),
});
export type RowTenant = z.infer<typeof RowTenantSchema>;

export function validateDateDiff(startDate: Date, endDate: Date) {
  if (dayjs(startDate).isAfter(dayjs(endDate))) {
    return new Error('Start date cannot be after end date');
  }
  return undefined;
}

export const RowParkingSchema = z.object({
  id: z.string().or(z.literal('')),
  parkingTypeId: ComposeRecordIdSchema('parking type'),
  unitPerClient: z.coerce.number().min(0),
  ratePerClient: z.coerce.number().min(0),
});
export type RowParking = z.infer<typeof RowParkingSchema>;

export const RowOutgoingSchema = z.object({
  id: z.string().or(z.literal('')),
  identifier: z.string(),
  unitPerClient: z.coerce.number().min(0),
  ratePerClient: z.coerce.number().min(0),
});
export type RowOutgoing = z.infer<typeof RowOutgoingSchema>;

export const StoredValuesSchma = z.object({
  vacancyPercentage: z.coerce.number().min(0),
  recoveryFigure: z.coerce.number().min(0),
  capitalisationRate: z.coerce.number().min(0),
  netAnnualEscalation: z.coerce.number().min(0),
  discountRate: z.coerce.number().min(0),
  lastCapitalisedPerc: z.coerce.number().min(0),
  fsvAdjustment: z.coerce.number().min(0),
});
export type StoredValues = z.infer<typeof StoredValuesSchma>;

export const RowInsuranceSchema = z.object({
  id: z.string().or(z.literal('')),
  itemId: ComposeRecordIdSchema('insurance item'),
  roofTypeId: ComposeRecordIdSchema('roof type').or(z.literal('')),
  rate: z.literal('').or(z.coerce.number().min(0)),
  area: z.literal('').or(z.coerce.number().min(0).optional()),
});
export type RowInsurance = z.infer<typeof RowInsuranceSchema>;

export function newGrcRow(index: number, bull: boolean) {
  return {
    index,
    id: '',
    identifier: '',
    unit: '',
    size: 0,
    rate: 0,
    bull,
  };
}

export function getGrcTotal(
  records: {
    rate: any;
    size: any;
    // rate: number;
    // size: number;
  }[],
) {
  let total = 0;
  for (let record of records) {
    total += Number(record.rate) * Number(record.size);
  }
  return total;
  // return records.reduce((acc, record) => acc + record.rate * record.size, 0);
}

export function getGrcLessDepr(
  grcTotal: number,
  grcAndFees: number,
  deprRecords: {
    perc: any;
    // perc: number;
  }[],
) {
  return (
    grcAndFees -
    deprRecords.reduce((acc, record) => {
      const rowTotal = Number(record.perc) * 0.01 * grcTotal;
      return acc + rowTotal;
    }, 0)
  );
}

export function getGrcAndFees(
  grcTotal: number,
  feeRecords: {
    perc: any;
  }[],
) {
  return (
    grcTotal +
    feeRecords.reduce((acc, record) => {
      const rowTotal = Number((Number(record.perc) * 0.01 * grcTotal).toFixed(2));
      return acc + rowTotal;
    }, 0)
  );
}

export function getMarketValue(projectedValue: number, perculiar: number | undefined) {
  return projectedValue + projectedValue * (perculiar || 0);
}

export function getSubjectLandValue(plotExtent: number, landRate: any | undefined) {
  return Number(landRate || 0) * plotExtent;
}

export function getCapitalValue(subjectLandValue: number, deprTotal: any | undefined) {
  return Number(subjectLandValue || 0) + Number(deprTotal || 0);
}

export function getValueOfImprovements(deprTotal: number) {
  return Number(deprTotal || 0);
}

export async function getUserGroupValues(UserId: string) {
  // User Group Validation Query
  const uGroup = await prisma.user.findUnique({
    where: { id: UserId },
    include: {
      UserGroup: {
        include: {
          company: {
            select: {
              id: true,
              CompanyName: true,
            }
          }
        },
      },
    },
  });
  return uGroup?.UserGroup;
}

export function getGBA(
  records: {
    bull: boolean | null;
    size: any;
    // size: number;
  }[],
) {
  let total = 0;
  for (let record of records) {
    if (!record.bull) {
      continue;
    }
    total += Number(record.size);
  }
  return total;
}

export function getSubjectBuildValue(
  records: {
    bull: boolean | null;
    size: any;
    // size: number;
  }[],
  buildRate: number | undefined,
) {
  let total = 0;
  for (let record of records) {
    if (!record.bull) {
      continue;
    }
    total += Number(record.size);
  }
  return total * (buildRate || 0);
}

export function safeParseJSON(arg: unknown) {
  if (typeof arg === 'string') {
    try {
      return JSON.parse(arg);
    } catch (error) {
      return undefined;
    }
  }
}

export function createStateUpdater<T extends readonly unknown[], K extends readonly unknown[]>(options: SingleOptions<T>, options2: ArrayOptions<K>) {
  return function (name: string, data: unknown) {
    const stateTuple = validateStateId(name);
    if (!stateTuple) {
      return;
    }
    if (!Array.isArray(stateTuple)) {
      createSingleUpdater(options)(stateTuple, data);
    } else {
      createArrayUpdater(options2)(stateTuple, data);
    }
  };
}

type SingleOption<T> = readonly [string, ZodType<T>, (arg: T) => void];
type SingleOptions<T extends readonly unknown[]> = {
  [K in keyof T]: SingleOption<T[K]>;
};
export function createSingleUpdater<T extends readonly unknown[]>(options: SingleOptions<T>) {
  return function (stateTuple: string, data: unknown) {
    for (let [name, Schema, updateFn] of options) {
      if (stateTuple === name) {
        updateParsedValue(Schema, data, updateFn);
      }
    }
    return;
  };
}

export function updateParsedValue<T>(Schema: ZodType<T>, data: unknown, update: (arg: T) => void) {
  const result = Schema.safeParse(data);
  if (result.success) {
    update(result.data);
  }
}

type ArrayUpdateFn = (setState: <K extends NumberIndexable>(prevState: K[]) => K[]) => void;
type ArrayOption<T> = readonly [string, string, ZodType<T>, ArrayUpdateFn];
type ArrayOptions<T extends readonly unknown[]> = {
  [K in keyof T]: ArrayOption<T[K]>;
};
export function createArrayUpdater<T extends readonly unknown[]>(options: ArrayOptions<T>) {
  return function (stateTuple: [string, number, string], data: unknown) {
    const id = stateTuple[0];
    const field = stateTuple[2];
    for (let [name, fieldName, Schema, updateFn] of options) {
      if (id === name && field === fieldName) {
        const index = stateTuple[1];
        const field = stateTuple[2];
        const result = Schema.safeParse(data);
        if (result.success) {
          updateFn((prevState) => {
            return prevState.map((r) => {
              if (r.index !== index) {
                return r;
              }
              return { ...r, [field]: result.data };
            });
          });
        }
      }
    }
  };
}

export type WithIndexAndError<T> = T & { index: number; error?: string };

export function preprocessJSON<T>(Schema: ZodType<T>) {
  return z.preprocess((arg) => safeParseJSON(arg), Schema);
}

type NumberIndexable = { index: number };

interface ReviewRecord {
  date: string;
  user: string;
  valuationType: 'Residential' | 'Commercial';
}

interface GroupedReview {
  date: string;
  users: {
    [key: string]: { countResidential: number; countCommercial: number };
  };
}

export function groupAndCountRecords(records: ReviewRecord[]): GroupedReview[] {
  const groupedRecords: {
    [key: string]: {
      [key: string]: { countResidential: number; countCommercial: number };
    };
  } = {};

  records.forEach((record) => {
    if (!groupedRecords[record.date]) {
      groupedRecords[record.date] = {};
    }
    if (!groupedRecords[record.date][record.user]) {
      groupedRecords[record.date][record.user] = {
        countResidential: 0,
        countCommercial: 0,
      };
    }
    if (record.valuationType === 'Residential') {
      groupedRecords[record.date][record.user].countResidential++;
    } else if (record.valuationType === 'Commercial') {
      groupedRecords[record.date][record.user].countCommercial++;
    }
  });

  const result: GroupedReview[] = [];

  for (const date in groupedRecords) {
    const users = groupedRecords[date];
    result.push({ date, users });
  }

  return result;
}

export function getFullName(firstName = '', lastName = '') {
  return `${firstName} ${lastName}`.trim();
}

export function countRecordsByDate(
  records: { id: string; createdAt: Date; valuationType: ValuationType }[],
): { date: string; count: number; residential: number; commercial: number }[] {
  const countsByDate: {
    [date: string]: { count: number; residential: number; commercial: number };
  } = {};

  records.forEach((record) => {
    const dateKey = record.createdAt.toISOString().split('T')[0]; // Extracting date portion
    if (!countsByDate[dateKey]) {
      countsByDate[dateKey] = { count: 0, residential: 0, commercial: 0 };
    }
    countsByDate[dateKey].count++;
    if (record.valuationType === ValuationType.Residential) {
      countsByDate[dateKey].residential++;
    } else if (record.valuationType === ValuationType.Commercial) {
      countsByDate[dateKey].commercial++;
    }
  });

  return Object.keys(countsByDate).map((date) => ({
    date,
    count: countsByDate[date].count,
    residential: countsByDate[date].residential,
    commercial: countsByDate[date].commercial,
  }));
}

type IsString<T> = T extends string ? T : never;
export function createGetNameProp<Schema>() {
  return (name: IsString<keyof Schema>) => {
    return { name };
  };
}

export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function createPropGetter<T extends string>(obj: Record<T, any> | undefined) {
  const props: T[] = obj ? (Object.keys(obj) as T[]) : [];
  return { getProp: (name: T) => name, props };
}

export function getNumOrUndefined(value: unknown) {
  return isNullOrUndefined(value) ? undefined : Number(value);
}

export function createQueryParams(params: [string, string][]) {
  const arr = params.map(([id, value]) => `${id}=${value}`);
  return arr.length ? arr.join('&') : '';
}


export async function getBanker(email: string) {
  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      UserGroup: {
        include: {
          company: {
            select: {
              id: true,
              CompanyName: true,
            },
          },
        },
      },
    },
  });

  const isBanker = user?.UserGroup?.isInstructor ?? false; // Ensure a boolean is returned

  return {
    isBanker,
  };
}