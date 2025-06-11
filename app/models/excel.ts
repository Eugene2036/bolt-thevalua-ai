import type { ZodTypeAny } from 'zod';

import ExcelJS from 'exceljs';
import { z } from 'zod';

import { stringifyZodError } from './core.validations';

export function parseRowCell<T extends ZodTypeAny>(row: string[], titleAndSchemaIndex: number, Schema: T, errorMessage: string) {
  if (titleAndSchemaIndex < 0) {
    return new Error(errorMessage);
  }
  const cell = row[titleAndSchemaIndex] || undefined;
  if (!cell) {
    return new Error(errorMessage);
  }
  const result = Schema.safeParse(cell);
  if (!result.success) {
    return new Error(stringifyZodError(result.error));
  }
  return result.data as T['_output'];
}

const TenantNameSchema = z
  .string({
    required_error: "Enter the tenant's name",
    invalid_type_error: 'Enter valid input for the tenant',
  })
  .min(1, "Enter the tenant's name")
  .max(255, "Use less than 255 characters for the tenant's name");
const PropertyTypeSchema = z
  .string({
    required_error: 'Enter the property type',
    invalid_type_error: 'Enter valid input for the property type',
  })
  .min(1, 'Enter the property type')
  .max(255, 'Use less than 20 characters for the property type');
const AreaSchema = z.coerce
  .number({
    required_error: 'Enter the area',
    invalid_type_error: 'Provide valid input for the area',
  })
  .min(1, 'Enter the area');
const StartDateSchema = z.preprocess((arg) => {
  if (typeof arg !== 'string') {
    return arg;
  }
  const parts = arg.split('-');
  if (parts.length === 3) {
    const Number = z.coerce.number();
    const result = z.tuple([Number, Number, Number]).safeParse(parts);
    if (!result.success) {
      return arg;
    }
    const [date, month, year] = result.data;
    return new Date(year, month, date);
  }
  return arg;
}, z.coerce.date());
const EndDateSchema = z.preprocess((arg) => {
  if (typeof arg !== 'string') {
    return arg;
  }
  const parts = arg.split('-');
  if (parts.length === 3) {
    const Number = z.coerce.number();
    const result = z.tuple([Number, Number, Number]).safeParse(parts);
    if (!result.success) {
      return arg;
    }
    const [date, month, year] = result.data;
    return new Date(year, month, date);
  }
  return arg;
}, z.coerce.date());

const TwoDigitDateSchema = z.preprocess((arg) => {
  console.log('PREP', typeof arg, arg);
  if (typeof arg !== 'string') {
    return arg;
  }
  const parts = arg.split('/');
  if (parts.length === 3) {
    const Number = z.coerce.number();
    const result = z.tuple([Number, Number, Number]).safeParse(parts);
    if (!result.success) {
      return arg;
    }
    const [date, month, year] = result.data;
    return new Date(year, month, date);
  }
  return arg;
}, z.coerce.date());

const GrossMonthlySchema = z.coerce.number({
  required_error: 'Enter the gross monthly value',
  invalid_type_error: 'Provide valid input for the gross monthly value',
});
const EsclationSchema = z.coerce.number({
  required_error: 'Enter the escalation',
  invalid_type_error: 'Provide valid input for the escalation',
});

export const ExcelRowSchema = z.tuple([TenantNameSchema, PropertyTypeSchema, AreaSchema, StartDateSchema, EndDateSchema, GrossMonthlySchema, EsclationSchema], {
  required_error: 'Please provide row data',
});
export type ParsedExcelRow = z.infer<typeof ExcelRowSchema>;

export const EXCEL_TABLE_COLUMNS = [
  ['Tenant (Text)', TenantNameSchema] as const,
  ['Asset Type (Text)', PropertyTypeSchema] as const,
  ['Area (Number)', AreaSchema] as const,
  ['Start Date (DD-MM-YYYY)', StartDateSchema] as const,
  ['End Date (DD-MM-YYYY)', EndDateSchema] as const,
  ['Gross Monthly (Number)', GrossMonthlySchema] as const,
  ['Escalation (Number)', EsclationSchema] as const,
] as const;

export const COMPARABLE_TABLE_COLUMNS = [
  ['Plot No.', z.coerce.number().or(z.string())] as const,
  ['Location', z.string()] as const,
  ['Neigbhourhood', z.coerce.number().or(z.string())] as const,
  ['Use', z.string()] as const,
  ['Plot Size', z.coerce.number()] as const,
  ['Price', z.coerce.number()] as const,
  ['Year', z.coerce.number()] as const,
] as const;

export const COMPARABLE_TABLE_COLUMNS2 = [
  ['Plot', z.coerce.number().or(z.string())] as const,
  ['Plot Size', z.coerce.number()] as const,
  ['Property Type', z.string()] as const,
  ['Location', z.string()] as const,
  ['Neighbourhood', z.coerce.number().or(z.string())] as const,
  ['Price', z.coerce.number()] as const,
  [
    'Date',
    z.preprocess((arg) => {

      const parts = String(arg).split('/');
      if (parts.length === 3) {
        const Number = z.coerce.number();
        const result = z.tuple([Number, Number, Number]).safeParse(parts);
        if (!result.success) {
          console.log('arg', arg, result.error);
          return new Date(2019, 1, 1);
        }
        const [date, month, year] = result.data;
        return new Date(year, month, date);
      }
      return new Date(String(arg));
    }, z.coerce.date()),
  ] as const,
] as const;

export const ComparableExcelRowSchema2 = z.tuple(
  [
    z.coerce.number().or(z.string()), // plot number
    z.coerce.number(), // plot size
    z.string(), // use
    z.string(), // location
    z.coerce.number().or(z.string()), // neighbourhood
    z.coerce.number(), // price
    // z.coerce.date(), // year
    z.preprocess((arg) => {
      // if (typeof arg !== 'string') {
      //   return arg;
      // }
      // const parts = arg.split('/');
      const parts = String(arg).split('/');
      if (parts.length === 3) {
        const Number = z.coerce.number();
        const result = z.tuple([Number, Number, Number]).safeParse(parts);
        if (!result.success) {
          console.log('arg', arg, result.error);
          return new Date(2019, 1, 1);
          // return arg;
        }
        const [date, month, year] = result.data;
        return new Date(year, month, date);
      }
      return new Date(String(arg));
    }, z.coerce.date()),
    // .or(z.coerce.date()),
    // z.coerce.number(), // year
  ],
  {
    required_error: 'Please provide row data',
  },
);
export type ParseComparableExcelRow2 = z.infer<typeof ComparableExcelRowSchema2>;

export const ComparableExcelRowSchema = z.tuple(
  [
    z.coerce.number().or(z.string()), // plot number
    z.string(), // location
    z.coerce.number().or(z.string()), // neighbourhood
    z.string(), // use
    z.coerce.number(), // plot size
    z.coerce.number(), // price

    z.coerce.number(), // year
  ],
  {
    required_error: 'Please provide row data',
  },
);
export type ParseComparableExcelRow = z.infer<typeof ComparableExcelRowSchema>;

export const COUNCIL_PLOT_TABLE_COLUMNS = [
  ['Plot No', z.coerce.number().or(z.string())] as const,
  ['Plot Size', z.coerce.number()] as const,
  ['Inspection', z.coerce.date()] as const,
  ['Structures', z.coerce.number()] as const,
  ['Neighborhood', z.string()] as const,
  ['Location', z.string()] as const,
] as const;
export const COUNCIL_PLOT_TABLE_COLUMNS_2 = [
  ['Plot No', z.coerce.number().or(z.string())] as const,
  ['Plot Size', z.coerce.number()] as const,
  ['Inspection', z.coerce.date()] as const,
  ['Structures', z.coerce.number()] as const,
  ['Neighborhood', z.string()] as const,
  ['Extension', z.string()] as const,
  ['Location', z.string()] as const,
] as const;
export const COUNCIL_PLOT_TABLE_COLUMNS_3 = [
  ['Plot No', z.coerce.number().or(z.string())] as const,
  ['Plot Size', z.coerce.number()] as const,
  ['Inspection', z.coerce.date()] as const,
  ['Structures', z.coerce.number()] as const,
  ['Neighborhood', z.string()] as const,
  ['Land Rate', z.coerce.number()] as const,
  ['Extension', z.null().or(z.string())] as const,
  ['Location', z.string()] as const,
] as const;
export const CouncilPlotExcelRowSchema = z.tuple(
  [
    z.coerce.number().or(z.string()), // plot number
    z.coerce.number(), // plot size
    z.coerce.date(), // inspection date
    z.coerce.number(), // structures
    z.string(), // neighbourhood
    z.string(), // location
  ],
  {
    required_error: 'Please provide row data',
  },
);
export type ParseCouncilPlotExcelRow = z.infer<typeof CouncilPlotExcelRowSchema>;

export const CouncilPlotExcelRowSchema2 = z.tuple(
  [
    z.coerce.number().or(z.string()), // plot number
    z.coerce.number(), // plot size
    z.coerce.date(), // inspection date
    z.coerce.number(), // structures
    z.string(), // neighbourhood
    z.string(), // extension
    z.string(), // location
  ],
  {
    required_error: 'Please provide row data',
  },
);
export type ParseCouncilPlotExcelRow2 = z.infer<typeof CouncilPlotExcelRowSchema2>;

export const CouncilPlotExcelRowSchema3 = z.tuple(
  [
    z.coerce.number().or(z.string()), // plot number
    z.coerce.number(), // plot size
    TwoDigitDateSchema, // inspection date
    z.coerce.number(), // structures
    z.string(), // neighbourhood
    z.coerce.number(), // land rate
    z.string(), // extension
    z.string(), // location
  ],
  {
    required_error: 'Please provide row data',
  },
);
export type ParseCouncilPlotExcelRow3 = z.infer<typeof CouncilPlotExcelRowSchema3>;

export async function getSheetNames(filePath: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheetNames = workbook.worksheets.map((sheet) => sheet.name);
  return sheetNames;
}

export async function getSheet(filePath: string, sheetName: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets.find((s) => s.name === sheetName);
  return sheet;
}
