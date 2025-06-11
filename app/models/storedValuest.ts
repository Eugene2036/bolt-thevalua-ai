import { z } from 'zod';

export enum StoredValueId {
  VacancyPercentage = 'Vacancy Percentage',
  RecoveryFigure = 'Recovery Figure',
  CapitalisationRate = 'Capitalisation Rate',
  CapitalisedFigure = 'Capitalised Figure',
  NetAnnualEscalation = 'Net Annual Escalation',
  DiscountRate = 'Discount Rate',
  LastCapitalisedPerc = 'Last Capitalised At',
  InsuranceVat = 'Insurance VAT',
  PreTenderEscalationAt = 'Pre-Tender Escalation @',
  PreTenderEscalationPerc = 'Pre-Tender Escalation %',
  PostTenderEscalationAt = 'Post-Tender Escalation @',
  PostTenderEscalationPerc = 'Post-Tender Escalation %',

  ProfFees = 'Prof Fees',

  LandRate = 'Land Rate',
  BuildRate = 'Build Rate',
  Perculiar = 'Adjustment for perculiar situation',
  FsvAdjustment = 'Adjustment for FSV',

  GrossReplacementCost = 'Gross Replacement Cost',
  LandValue = 'Land Value',
  ValueOfDevelopments = 'Value Of Developments',
  CapitalValue = 'Capital Value'
}

export const STORED_VALUE_IDS = [
  StoredValueId.VacancyPercentage,
  StoredValueId.RecoveryFigure,
  StoredValueId.CapitalisationRate,
  StoredValueId.CapitalisedFigure,
  StoredValueId.NetAnnualEscalation,
  StoredValueId.DiscountRate,
  StoredValueId.LastCapitalisedPerc,
  StoredValueId.PreTenderEscalationAt,
  StoredValueId.PreTenderEscalationPerc,
  StoredValueId.PostTenderEscalationAt,
  StoredValueId.PostTenderEscalationPerc,
  StoredValueId.LandRate,
  StoredValueId.BuildRate,
  StoredValueId.GrossReplacementCost,
  StoredValueId.CapitalValue,
  StoredValueId.LandValue,
  StoredValueId.ValueOfDevelopments,
] as const;

const StoredValueSchema = z
  .object({
    identifier: z.nativeEnum(StoredValueId),
    value: z.coerce.number(),
  })
  .array();
export function isStoredValues(data: unknown): data is z.infer<typeof StoredValueSchema> {
  return StoredValueSchema.safeParse(data).success;
}

export function getVacanciesValue(vacancyPercentage: number, totalAnnualGross: number) {
  return (vacancyPercentage * totalAnnualGross) / 100;
}

export function getRecoveriesValue(rate: number, gla: number) {
  // const result =
  //   totalArea * recoveryFigure * 12 * (1 - vacancyPercentage / 100);
  console.log(rate, gla);
  const result = rate * gla;
  return Number(result.toFixed(2));
}
