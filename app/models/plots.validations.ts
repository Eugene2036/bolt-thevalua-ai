import { z } from 'zod';

import { places } from './core.validations';
import { AppLinks } from './links';
import { getRecoveriesValue, getVacanciesValue } from './storedValuest';

export function getCapitalisedValue(netAnnualRentalIncome: number, capitalisationRate: number) {
  const result = capitalisationRate ? netAnnualRentalIncome / (capitalisationRate / 100) : 0;
  return roundToTwoDecimals(result);
  // return roundDown(result, -5);
  // return Math.round(result / 100_000) * 100_000;
}

export function roundToTwoDecimals(num: number): number {
  return parseFloat(num.toFixed(2));
}

export function roundToDecimal(num: number, numDecimal: number): number {
  return parseFloat(num.toFixed(numDecimal));
}

export function getNetAnnualRentalIncome(annualGrossRentals: number, annualOutgoings: number, vacancyPercentage: number, recoveryFigure: number, totalArea: number) {
  const result = annualGrossRentals - annualOutgoings - getVacanciesValue(vacancyPercentage, annualGrossRentals) + getRecoveriesValue(vacancyPercentage, recoveryFigure);
  // getRecoveriesValue(vacancyPercentage, recoveryFigure, totalArea);
  return places(result);
}

export function getTotalArea(areaValues: number[]) {
  const result = areaValues.reduce((acc, currentValue) => acc + currentValue, 0);
  return places(result);
}

export function getTotalAreaPerBoth(tenants: { areaPerClient: number; areaPerMarket: number }[]) {
  const client = getTotalArea(tenants.map((tenant) => tenant.areaPerClient));
  const market = getTotalArea(tenants.map((tenant) => tenant.areaPerMarket));
  return { client, market };
}

export function getTotalRental(rentalValues: number[]) {
  const result = rentalValues.reduce((acc, currentValue) => acc + currentValue, 0);
  return places(result);
}
export function getTotalRentalPerBoth(
  tenants: {
    grossMonthlyRental: number;
  }[],
) {
  return getTotalArea(tenants.map((tenant) => tenant.grossMonthlyRental));
}

export function getTotalParking(values: number[]) {
  const result = values.reduce((acc, current) => acc + current, 0);
  return places(result);
}

export function getTotalParkingPerBoth(
  parkingRecords: {
    unitPerClient: number;
    ratePerClient: number;
  }[],
) {
  return getTotalParking(parkingRecords.map((tenant) => tenant.unitPerClient * tenant.ratePerClient));
}

export function getGrossRental(totalRental: number, totalParking: number) {
  const monthly = places(totalRental + totalParking);
  const annual = places(monthly * 12);
  return { monthly, annual };
}

export function getTotalOutgoings(values: number[]) {
  const result = values.reduce((acc, current) => acc + current, 0);
  return places(result);
}

export function getAnnualOutgoingsPerBoth(
  outgoingRecords: {
    itemType?: string | undefined;
    unitPerClient: number;
    ratePerClient: number;
  }[],
) {
  return getTotalOutgoings(
    outgoingRecords
      .map((tenant) => {
        if (tenant.itemType === '%') {
          return tenant.unitPerClient * tenant.ratePerClient * 0.01;
        }
        return tenant.unitPerClient * tenant.ratePerClient;
      })
      .map((value) => Number(value.toFixed(2))),
  );
}

export function getMonthlyOutgoings(annualOutgoings: number, totalArea: number) {
  return totalArea ? places(annualOutgoings / totalArea / 12) : 0;
}

export function getOutgoingsIncomeRatio(outgoings: number, grossRental: number) {
  const result = places(grossRental ? outgoings / grossRental : 0);
  return result * 100;
}

export const PropertyDetailsSchema = z.object({
  propertyId: z.coerce.number().int().positive(),
  title: z.string().min(1),
  valuer: z.string().min(1),
  inspectionDate: z.coerce.date(),
  plotDesc: z.string().min(1),
  plotExtent: z.string().min(1),
  address: z.string().min(1),
  zoning: z.string().min(1),
  classification: z.string().min(1),
  usage: z.string().min(1),
});

export const UpdatePropertyDetailsSchema = PropertyDetailsSchema.merge(
  z.object({
    id: z.string().min(1),
  }),
);

export enum ValuationType {
  Commercial = 'Commercial',
  Residential = 'Residential',
  // Agricultural = 'Agricultural',
  // Industrial = 'Industrial',
  // Hospitality = 'Hospitality',
  // Retail = 'Retail',
  // Tourism = 'Tourism',
}

export enum ValuationKind {
  Normal = 'Normal',
  Desktop = 'Desktop',
}

export enum PurposeOfValuation {
  NewMortgageApplication = 'New Mortgage Application',
  MortgageReview = 'Mortgage Review',
  Refinancing = 'Refinancing',
  Forecolsure = 'Forecolsure',
}

export enum ClientType {
  Individual = 'Individual',
  Organisation = 'Organisation'
}

export enum InstructionResponse {
  Decline = 'Declined',
  Accept = 'Accepted',
}

// Filter who created the instruction attachment file
export enum createdByType {
  Instructor = 'Instructor',
  Valuer = 'Valuer',
}

export enum ReportStatus {
  Draft = "Draft",
  InReview = "In Review",
  Reviewed = "Reviewed",
  Completed = "Completed",
  Closed = "Closed"
}

export enum CLOUDINARY_CONFIG {
  UPLOAD_PRESET = 'syzbj36u',
  CLOUD_NAME = 'deacmcthw',
}

export const UpdateAnalysisDateSchema = z.object({
  newDate: z.coerce.date(),
});
export const UpdateInspectionDateSchema = z.object({
  newDate: z.coerce.date(),
});

export const UpdatePlotSizeSchema = z.object({
  plotSize: z.coerce.number().min(0),
});

export const UpdateStoredValueSchema = z.object({
  id: z.string().min(1),
  identifier: z.string().min(1),
  value: z.coerce.number().or(z.string()),
});

export const UpdateValuerCommentsSchema = z.object({
  comments: z.string(),
});

export function autoRedirect(plot: { id: string; valuationType: string; council: boolean }) {
  if (plot.valuationType !== ValuationType.Residential && !plot.council) {
    return AppLinks.PlotValuations(plot.id);
  }
  if (plot.valuationType === ValuationType.Residential && !plot.council) {
    return AppLinks.PlotGrc(plot.id);
  }
  if (plot.valuationType === ValuationType.Residential && plot.council) {
    return AppLinks.PlotCouncilGrc(plot.id);
  }
  if (plot.valuationType === ValuationType.Commercial && plot.council) {
    return AppLinks.PlotValuations(plot.id);
  }
  return AppLinks.Plot(plot.id);
}

export const ValuationTypeSchema = z.nativeEnum(ValuationType);
export function getValidatedValuationType(data: unknown) {
  const result = ValuationTypeSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
}

export function validateValuationType<T extends { valuationType: any }>(data: T) {
  const result = getValidatedValuationType(data.valuationType);
  if (result) {
    return { ...data, valuationType: result };
  }
}

export enum GrcFeeType {
  Professional = 'Professional',
  Contigencies = 'Contigencies',
  Statutory = 'Statutory',
}

export const GrcFeeTypePercs = {
  [GrcFeeType.Professional]: 10,
  [GrcFeeType.Contigencies]: 1,
  [GrcFeeType.Statutory]: 1,
} as const;

export function getValuer(valuer: { firstName: string; lastName: string; email: string } | undefined | null) {
  if (!valuer) {
    return undefined;
  }
  const fullName = [valuer.firstName, valuer.lastName].join(' ').trim();
  return fullName || valuer.email;
}
