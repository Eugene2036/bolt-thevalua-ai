import { PartialBlock } from "@blocknote/core";

export interface Section {
  name: string;
  subSections: SubSection[];
}

export interface SubSection {
  hasTitle: boolean;
  title: string;
  content: PartialBlock[];
  mvAnalysisData?: any;
}

export const DYNAMIC_REPORT_VALUES = [
  ['Plinth Areas', 'plinthAreas'],
  ['Construction Table', 'constructionTable'],
  ['Market Comparables', 'marketValueTable'],

  ['Market Value Amount', 'marketValue'],
  ['Market Value in Words', 'marketValueInWords'],
  ['Forced Sale Value Amount', 'forcedValue'],
  ['Forced Sale Value in Words', 'forcedValueInWords'],
  ['Replacement Cost Amount', 'replacementCost'],
  ['Replacement Cost in Words', 'replacementCostInWords'],
  ['Company Name', 'companyName'],
  ['Company Email', 'companyEmail'],
  ['Company Tel', 'companyTel'],
  ['Plot Number', 'plotNumber'],
  ['Plot Size', 'plotExtent'],
  ['Plot Size in Hectares', 'plotExtentHectares'],
  ['Plot Size In Words', 'plotExtentInWords'],
  ['Instruction Date', 'instructionDate'],
  ['Inspection Date', 'inspectionDate'],
  ['Title Deed Date', 'titleDeedDate'],
  ['Title Deed Number', 'titleDeedNumber'],
  ['Client Company Name', 'clientCompanyName'],
  ['Client Full Name', 'clientFullName'],
  ['Valuation Date', 'valuationDate'],
  ['Services', 'services'],

  ['Plot Description', 'plotDesc'],
  ['Physical Address', 'LocationAddress'],
  ['Zoning', 'zoning'],
  ['Classification', 'classification'],
  ['Usage', 'usage'],
  ['GLA m²', 'glaTotal'],
  ['GBA m²', 'gbaTotal'],
  ['Gross Annual Income', 'grossAnnualIncome'],
  ['Net Annual Income', 'netAnnualIncome'],
  ['Annual Expenditure', 'annualExpenditure'],
  ['Annual Expenditure as a %', 'annualExpenditureAsPerc'],
  ['Operating Costs / Month (P/m²)', 'operatingCosts'],
  ['Capitalisation Rate', 'capRate'],
  ['Vacancy Rate', 'vacancyRate'],
  ['Rate/m² based on MV (GLA)', 'ratePerSqmGLA'],
  ['Rate/m² based on MV (Plot Size)', 'ratePerSqmPlotExtent'],
  ['Rate/m² based on Replacement Cost (GBA)', 'replacementCostPerSqm'],

  [`Valuer's Full Name`, 'valuerFullName'],
  [`Valuer Qualification`, 'valuerQualification'],

  [`Instruction Creator Company`, 'instructionCreatorCompany'],
  [`Map`, 'map'],
] as const;

type ReplacementData = [typeof DYNAMIC_REPORT_VALUES[number][1], string];
export function reportContentReplacer(rawData: string, replacementData: ReplacementData[]) {
  return replacementData.reduce((acc, [id, value]) => {
    return acc.replace(new RegExp(`{${id}}`, 'g'), value || '');
  }, rawData);
}
