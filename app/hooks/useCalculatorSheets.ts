import { CalculatorKind } from '~/models/construction.types';

export function useCalculatorSheets(isBull: boolean, insurance: boolean) {
  if (insurance) {
    return [
      CalculatorKind.Boundary_Wall,
      CalculatorKind.Guest_House_Single_Storey,
      CalculatorKind.Hotels_Single_Storey,
      CalculatorKind.Hotel_DS,
      CalculatorKind.Warehouses,
      CalculatorKind.Warehouse_with_mezzanine,
      CalculatorKind.Schools,
      CalculatorKind.Office_single_storey,
      CalculatorKind.Office_DS,
      CalculatorKind.Shopping_Mall,
    ];
  }

  return isBull
    ? [
        CalculatorKind.Residential_SS_up_to_100m2,
        CalculatorKind.Residential_SS_101_200M2,
        CalculatorKind.Residential_SS_Above_201_M2,
        CalculatorKind.SHHA_House_Types,
        CalculatorKind.Outbuilding,
        CalculatorKind.Residential_DS_UP_TO_450M2,
        CalculatorKind.Residential_DS_ABOVE_450M2,
        CalculatorKind.Residential_DS_Exclusive,
        CalculatorKind.Multi_res_SS_up_to_500m2,
        CalculatorKind.Multi_res_SS_Above_501M2,
        CalculatorKind.Multi_Res_DS_up_to_500m2,
        CalculatorKind.Multi_Res_DS_Above_500M2,
        CalculatorKind.Schools,
      ]
    : [CalculatorKind.Boundary_Wall, CalculatorKind.External_Works_Residential];
}
