import { z } from 'zod';

import { KnownElement, MiniKnownElement, QualityOfFinish, YearRange } from './construction.types';
import { ComposeRecordIdSchema, preprocessJSON } from './core.validations';

export const YearRangeDataSchema = z.object({
  identifier: z.string(),
  first: z.coerce.number(),
  second: z.coerce.number(),
  third: z.coerce.number(),
});
export type YearRangeData = z.infer<typeof YearRangeDataSchema>;
export const UpdateRangeValuesSchema = z.object({
  rangeValues: preprocessJSON(YearRangeDataSchema.array()),
});
export const RowItemSchema = z.object({
  id: z.string().or(z.literal('')),
  element: z.nativeEnum(KnownElement).or(z.nativeEnum(MiniKnownElement)),
  propertyOption: z.string(),
  qualityOfFinish: z.nativeEnum(QualityOfFinish),
  multiplierIdentifier: z.string(),
  multiplier: z.coerce.number().or(z.literal('')),
});
export const NewMutateConstructionSchema = z
  .object({
    plotId: z.string().min(1),
    isBull: z.coerce.boolean().optional(),
    floorArea: z.literal('').or(z.coerce.number()),
    verandaFloorArea: z.literal('').or(z.coerce.number()),
    devYear: z.nativeEnum(YearRange),
    items: preprocessJSON(RowItemSchema.array()),
  })
  .transform((arg) => ({
    ...arg,
    floorArea: arg.floorArea || 0,
    verandaFloorArea: arg.verandaFloorArea || 0,
  }));
export const MutateConstructionSchema = z
  .object({
    floorArea: z.literal('').or(z.coerce.number()),
    verandaFloorArea: z.literal('').or(z.coerce.number()),
    devYear: z.nativeEnum(YearRange),
    items: preprocessJSON(RowItemSchema.array()),
  })
  .transform((arg) => ({
    ...arg,
    floorArea: arg.floorArea || 0,
    verandaFloorArea: arg.verandaFloorArea || 0,
  }));
export const CalculatorRowItemSchema = z.object({
  id: z.string().or(z.literal('')),
  element: z.nativeEnum(KnownElement).or(z.nativeEnum(MiniKnownElement)),
  propertyOption: z.string(),
  qualityOfFinish: z.nativeEnum(QualityOfFinish),
  multiplier: z.coerce.number().or(z.literal('')),
});
export const CalculatorSchema = z
  .object({
    id: ComposeRecordIdSchema('calculator'),
    floorArea: z.literal('').or(z.coerce.number()),
    verandaFloorArea: z.literal('').or(z.coerce.number()),
    devYear: z.nativeEnum(YearRange),
    items: preprocessJSON(CalculatorRowItemSchema.array()),
  })
  .transform((arg) => ({
    ...arg,
    floorArea: arg.floorArea || 0,
    verandaFloorArea: arg.verandaFloorArea || 0,
  }));
