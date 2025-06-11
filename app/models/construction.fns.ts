import type { YearRangeData } from './construction.schema';

import { z } from 'zod';

import { CalculatorKind, KnownElement, MiniKnownElement, MiniPropertyOption, PropertyOption, QualityOfFinish, YearRange } from './construction.types';
import { formatAmount, getNumOrUndefined } from './core.validations';
import { objValuesToArr } from './forms';

export function getPropertyOptions(element: KnownElement | MiniKnownElement) {
  switch (element) {
    case KnownElement.Foundations:
      return [];
    case KnownElement.Concrete:
      return objValuesToArr(PropertyOption.Concrete);
    case KnownElement.Brickwork:
      return objValuesToArr(PropertyOption.Bricks);
    case KnownElement.RoofingCover:
      return objValuesToArr(PropertyOption.Roofing);
    case KnownElement.RoofingTrusses:
      return objValuesToArr(PropertyOption.Trusses);
    case KnownElement.CarpentryAndJoineryDoors:
      return objValuesToArr(PropertyOption.CarpentryAndJoineryDoors);
    case KnownElement.CarpentryAndJoineryFittedKitchen:
      return objValuesToArr(PropertyOption.CarpentryAndJoineryFittedKitchen);
    case KnownElement.CarpentryAndJoineryFittedWardrobes:
      return objValuesToArr(PropertyOption.CarpentryAndJoineryFittedWardrobes);
    case KnownElement.Ceilings:
      return objValuesToArr(PropertyOption.Ceilings);
    case KnownElement.FloorCoverings:
      return objValuesToArr(PropertyOption.Flooring);
    case KnownElement.Metalwork:
      return objValuesToArr(PropertyOption.Frames);
    case KnownElement.Plastering:
      return objValuesToArr(PropertyOption.Plastering);
    case KnownElement.WallFinishes:
      return objValuesToArr(PropertyOption.WallFinishes);
    case KnownElement.PlumbingAndDrainage:
      return objValuesToArr(PropertyOption.PlumbingAndDrainage);
    case KnownElement.Paintwork:
      return objValuesToArr(PropertyOption.Paintwork);
    case KnownElement.Electrical:
      return objValuesToArr(PropertyOption.Electrical);
    case KnownElement.MechanicalWorks:
      return objValuesToArr(PropertyOption.MechanicalWorks);
    case KnownElement.Veranda:
      return objValuesToArr(PropertyOption.Veranda);
    case KnownElement.FurnitureAndFittings:
      return objValuesToArr(PropertyOption.FurnitureAndFittings);
    case MiniKnownElement.Boundary_Wall:
      return objValuesToArr(MiniPropertyOption.BoundaryWall);
    case MiniKnownElement.ElectricFence:
      return objValuesToArr(MiniPropertyOption.ElectricFence);
    case MiniKnownElement.Gate:
      return objValuesToArr(MiniPropertyOption.Gate);
    case MiniKnownElement.SwimmingPool:
      return objValuesToArr(MiniPropertyOption.SwimmingPool);
    case MiniKnownElement.Paving:
      return objValuesToArr(MiniPropertyOption.Paving);
    case MiniKnownElement.CarPort:
      return objValuesToArr(MiniPropertyOption.CarPort);
    default:
      return [];
  }
}

export const getValidated = {
  element: (data: unknown) => {
    const Schema = z.nativeEnum(KnownElement).or(z.nativeEnum(MiniKnownElement));
    const result = Schema.safeParse(data);
    return result.success ? result.data : undefined;
  },
  qualityOfFinish: (data: unknown) => {
    const result = z.nativeEnum(QualityOfFinish).safeParse(data);
    return result.success ? result.data : undefined;
  },
  devYear: (data: unknown) => {
    const result = z.nativeEnum(YearRange).safeParse(data);
    return result.success ? result.data : undefined;
  },
};

export const validateInObj = {
  element: <T extends { element: unknown }>(data: T | undefined) => {
    if (!data) {
      return undefined;
    }
    const element = getValidated.element(data.element);
    return element ? { ...data, element } : undefined;
  },
  qualityOfFinish: <T extends { qualityOfFinish: unknown }>(data: T | undefined) => {
    if (!data) {
      return undefined;
    }
    const qualityOfFinish = getValidated.qualityOfFinish(data.qualityOfFinish);
    return qualityOfFinish ? { ...data, qualityOfFinish } : undefined;
  },
  devYear: <T extends { devYear: unknown }>(data: T | undefined) => {
    if (!data) {
      return undefined;
    }
    const parsedDevYear = getValidated.devYear(data.devYear);
    return parsedDevYear ? { ...data, devYear: parsedDevYear } : undefined;
  },
};

export function calcTypicalEstimate(
  devYear: YearRange,
  suppliedFloorArea: number | undefined,
  propertyOption: string,
  yearRangeValues: YearRangeData[],
  verandaFloorArea?: number,
  multiplierIdentifier?: string | null,
  multiplier?: number,
) {
  const effectiveMultiplier = multiplierIdentifier ? multiplier || 0 : verandaFloorArea ?? suppliedFloorArea ?? 0;

  const yearRangeValue = ((devYear: YearRange, identifier: string) => {
    const value = yearRangeValues.find((v) => v.identifier === identifier);
    if (!value) {
      return 0;
    }
    if (devYear === YearRange.First) {
      return value.first;
    }
    if (devYear === YearRange.Second) {
      return value.second;
    }
    return value.third;
  })(devYear, propertyOption);

  // console.log(propertyOption, yearRangeValue, effectiveMultiplier);

  return yearRangeValue * effectiveMultiplier;
}

export function calcQualityEstimate(typicalEstimate: number, qualityOfFinish: QualityOfFinish) {
  const weights: [QualityOfFinish, number][] = [
    [QualityOfFinish.Delapidated, 0.6],
    [QualityOfFinish.Poor, 0.7],
    [QualityOfFinish.Fair, 0.8],
    [QualityOfFinish.Good, 0.85],
    [QualityOfFinish.VeryGood, 0.9],
    [QualityOfFinish.Excellent, 1],
    [QualityOfFinish.NotApplicable, 1],
  ];
  const weight = weights.find(([q]) => q === qualityOfFinish);
  return weight ? typicalEstimate * weight[1] : 0;
}

export function createConstructionItem(
  element: KnownElement | MiniKnownElement,
  propertyOption: string,
  qualityOfFinish: QualityOfFinish,
  multiplierIdentifier?: string,
  multiplier?: number,
) {
  return {
    element,
    propertyOption,
    qualityOfFinish,
    multiplierIdentifier,
    multiplier,
  };
}

function getTotalEstimates<T extends { typicalEstimate: number; qualityEstimate: number }>(
  records: T[],
  floorArea: number | undefined,
): {
  totalTypicalEstimate: number;
  totalQualityEstimate: number;
  costPerSqMTypical: number;
  costPerSqMQuality: number;
  totalTypicalWithoutVat: number;
  totalQualityWithoutVat: number;
  costTypicalWithoutVat: number;
  costQualityWithoutVat: number;
} {
  let totalTypicalEstimate = 0;
  let totalQualityEstimate = 0;

  for (let record of records) {
    totalTypicalEstimate += record.typicalEstimate;
    totalQualityEstimate += record.qualityEstimate;
  }

  if (!floorArea) {
    return {
      totalTypicalEstimate,
      totalQualityEstimate,

      costPerSqMTypical: 0,
      costPerSqMQuality: 0,

      totalTypicalWithoutVat: 0,
      totalQualityWithoutVat: 0,

      costTypicalWithoutVat: 0,
      costQualityWithoutVat: 0,
    };
  }

  const costPerSqMTypical = totalTypicalEstimate / floorArea;
  const costPerSqMQuality = totalQualityEstimate / floorArea;

  const totalTypicalWithoutVat = totalTypicalEstimate / 1.14;
  const totalQualityWithoutVat = totalQualityEstimate / 1.14;

  const costTypicalWithoutVat = totalTypicalWithoutVat / floorArea;
  const costQualityWithoutVat = totalQualityWithoutVat / floorArea;

  return {
    totalTypicalEstimate,
    totalQualityEstimate,

    costPerSqMTypical,
    costPerSqMQuality,

    totalTypicalWithoutVat,
    totalQualityWithoutVat,

    costTypicalWithoutVat,
    costQualityWithoutVat,
  };
}

export function getCalculatorRate<
  T extends {
    element: KnownElement | MiniKnownElement;
    propertyOption: string;
    qualityOfFinish: QualityOfFinish;
    multiplierIdentifier?: string | null;
    multiplier?: number;
  },
>(calculatorKind: CalculatorKind, items: T[], devYear: YearRange, suppliedFloorArea: number | undefined, verandaFloorArea: number | undefined, yearRangeValues: YearRangeData[]) {
  const floorArea = suppliedFloorArea;
  const refinedProps = items
    .map((prop) => {
      if (calculatorKind === CalculatorKind.SHHA_House_Types && prop.element === KnownElement.Concrete) {
        return undefined;
      }
      return prop;
    })
    .filter(Boolean)
    .filter((item) => filterItemsByCalcKind(item, calculatorKind))
    .map((prop) => {
      const noFloorArea = hasNoFloorArea(calculatorKind, prop.element);
      const floorArea = noFloorArea ? 1 : getNumOrUndefined(suppliedFloorArea);

      const typicalEstimate = calcTypicalEstimate(
        devYear,
        floorArea,
        prop.propertyOption,
        yearRangeValues || [],
        prop.element === KnownElement.Veranda ? getNumOrUndefined(verandaFloorArea) : undefined,
        prop.multiplierIdentifier,
        prop.multiplier,
      );
      const qualityEstimate = calcQualityEstimate(typicalEstimate, prop.qualityOfFinish);

      return { ...prop, typicalEstimate, qualityEstimate };
    });

  console.log(
    'refinedProps',
    JSON.stringify(
      refinedProps.map((p) => [p.element, formatAmount(p.typicalEstimate), formatAmount(p.qualityEstimate)].join(' - ')),
      null,
      2,
    ),
  );

  // console.log(
  //   'total refinedProps - ',
  //   refinedProps.reduce((acc, current) => acc + current.typicalEstimate, 0),
  // );

  const totalEstimates = getTotalEstimates(refinedProps, floorArea);

  return { refinedProps, ...totalEstimates };
}

export function getObso(before: number, after: number) {
  const diff = before - after;
  return (diff / after) * 100;
}

export function filterItemsByCalcKind<T extends { element: KnownElement | MiniKnownElement }>(item: T, currentKind: string | null | undefined) {
  if (currentKind === CalculatorKind.External_Works_Residential) {
    return [MiniKnownElement.SwimmingPool, MiniKnownElement.Paving, MiniKnownElement.CarPort].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Boundary_Wall) {
    return [MiniKnownElement.Boundary_Wall, MiniKnownElement.ElectricFence, MiniKnownElement.Gate].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Residential_SS_up_to_100m2) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Residential_SS_Above_201_M2) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Residential_SS_101_200M2) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.SHHA_House_Types) {
    return [
      KnownElement.Foundations,
      // KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Outbuilding) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Residential_DS_UP_TO_450M2) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Residential_DS_ABOVE_450M2) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Residential_DS_Exclusive) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Multi_res_SS_up_to_500m2) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Multi_res_SS_Above_501M2) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
    ].some((e) => e === item.element);
  }

  if (currentKind === CalculatorKind.Multi_Res_DS_up_to_500m2) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Multi_Res_DS_Above_500M2) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Schools) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Office_DS) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      //   KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Guest_House_Single_Storey) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
      KnownElement.FurnitureAndFittings,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Hotels_Single_Storey) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
      KnownElement.FurnitureAndFittings,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Hotel_DS) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
      KnownElement.FurnitureAndFittings,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Warehouses) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Warehouse_with_mezzanine) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Office_single_storey) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.CarpentryAndJoineryFittedWardrobes,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
    ].some((e) => e === item.element);
  }
  if (currentKind === CalculatorKind.Shopping_Mall) {
    return [
      KnownElement.Foundations,
      KnownElement.Concrete,
      KnownElement.Brickwork,
      KnownElement.RoofingCover,
      KnownElement.RoofingTrusses,
      KnownElement.CarpentryAndJoineryDoors,
      KnownElement.CarpentryAndJoineryFittedKitchen,
      KnownElement.Ceilings,
      KnownElement.FloorCoverings,
      KnownElement.Metalwork,
      KnownElement.Plastering,
      KnownElement.WallFinishes,
      KnownElement.PlumbingAndDrainage,
      KnownElement.Paintwork,
      KnownElement.Electrical,
      KnownElement.MechanicalWorks,
      KnownElement.Veranda,
      KnownElement.ExternalWorksAccessRoad,
    ].some((e) => e === item.element);
  }
  return true;
}

export function hasNoFloorArea(calculatorKind: CalculatorKind, element: KnownElement | MiniKnownElement) {
  const noFittedKitchenKinds = [CalculatorKind.SHHA_House_Types, CalculatorKind.Outbuilding, CalculatorKind.Residential_SS_up_to_100m2];
  const noGateKinds = [CalculatorKind.Boundary_Wall];

  const hasNoFittedKitchen = noFittedKitchenKinds.some((k) => k === calculatorKind) && element === KnownElement.CarpentryAndJoineryFittedKitchen;

  const hasNoGate = noGateKinds.some((k) => k === calculatorKind) && element === MiniKnownElement.Gate;

  const conditions = [hasNoFittedKitchen, hasNoGate];

  return conditions.some((c) => !!c);
}
