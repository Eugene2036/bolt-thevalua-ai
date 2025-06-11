import { z } from 'zod';

import { ComposeRecordIdSchema } from './core.validations';

export function getGrossRatePerClient(areaPerClient: number, grossMonthlyRental: number) {
  return areaPerClient ? Number((grossMonthlyRental / areaPerClient).toFixed(2)) : 0;
}

export function getGLA(totalArea: number, subjectArea: number) {
  return totalArea ? (subjectArea / totalArea).toFixed(2) : '0';
}

export const TenantSchema = z
  .object({
    name: z.string().min(1),
    termOfLease: z.string(),
    leaseLife: z.coerce.number().min(0),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    grossMonthlyRental: z.coerce.number().min(0),
    escalation: z.coerce.number().min(0),
    propertyTypeId: ComposeRecordIdSchema('property type'),
    areaPerClient: z.coerce.number().min(0),
    areaPerMarket: z.coerce.number().min(0),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date cannot be earlier than start date.',
    path: ['endDate'],
  });

export const AddTenantSchema = z
  .object({
    name: z.string().min(1),
    termOfLease: z.string(),
    leaseLife: z.coerce.number().min(0),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    grossMonthlyRental: z.coerce.number().min(0),
    escalation: z.coerce.number().min(0),
    propertyTypeId: ComposeRecordIdSchema('property type'),
    areaPerClient: z.coerce.number().min(0),
    areaPerMarket: z.coerce.number().min(0),
  })
  .merge(
    z.object({
      plotId: ComposeRecordIdSchema('plot'),
    }),
  )
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date cannot be earlier than start date.',
    path: ['endDate'],
  });

export const ParkingSchema = z.object({
  parkingTypeId: ComposeRecordIdSchema('parking type'),
  unitPerClient: z.coerce.number().min(0),
  ratePerClient: z.coerce.number().min(0),
});
export const AddParkingSchema = ParkingSchema.merge(
  z.object({
    plotId: ComposeRecordIdSchema('plot'),
  }),
);

export const OutgoingSchema = z.object({
  identifier: z.string().min(1),
  unitPerClient: z.coerce.number().min(0),
  ratePerClient: z.coerce.number().min(0),
});
export const AddOutgoingSchema = OutgoingSchema.merge(
  z.object({
    plotId: ComposeRecordIdSchema('plot'),
  }),
);

export const InsuranceSchema = z.object({
  itemId: ComposeRecordIdSchema('insurance item'),
  roofTypeId: ComposeRecordIdSchema('roof type').or(z.literal('')),
  rate: z.coerce.number().min(0),
});
export const AddInsuranceSchema = InsuranceSchema.merge(
  z.object({
    plotId: ComposeRecordIdSchema('plot'),
  }),
);
