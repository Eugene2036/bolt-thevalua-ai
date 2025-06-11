export interface GrcProps {
  recordType: 'grc';
  identifier: string | undefined;
  size: number | undefined;
  unit: string | undefined;
}
export interface InsuranceProps {
  recordType: 'insurance';
  itemId: string | undefined;
  roofTypeId: string | undefined;
  unit: number | undefined;
}
