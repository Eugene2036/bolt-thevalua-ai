import type { ConstructionProp, ConstructionPropertyItem, Grc, Insurance } from '@prisma/client';

import { prisma } from '~/db.server';

import { createConstructionItem } from './construction.fns';
import { CalculatorKind, KnownElement, MiniKnownElement, MiniPropertyOption, PropertyOption, QualityOfFinish, YearRange } from './construction.types';

export type EmbeddedGrc = Grc & {
  constructionProp: ConstructionProp & {
    items: ConstructionPropertyItem[];
  };
};
export type EmbeddedInsurance = Insurance & {
  constructionProp: ConstructionProp & {
    items: ConstructionPropertyItem[];
  };
};

export let grcPromise: Promise<EmbeddedGrc | Error> | undefined = undefined;
export let insurancePromise: Promise<EmbeddedInsurance | Error> | undefined = undefined;

interface CreateViaGrcPromiseProps {
  plotId: string;
  isBull: boolean;
  identifier: string | undefined;
  size: number | undefined;
  unit: string | undefined;
}
export async function createViaGrcPromise(props: CreateViaGrcPromiseProps) {
  if (grcPromise) {
    return grcPromise;
  }
  grcPromise = new Promise((resolve) => {
    setTimeout(() => resolve(undefined), 500);
  })
    .then(async () => {
      const numGrcs = await prisma.grc.count({
        where: { plotId: props.plotId },
      });

      const prop = await prisma.constructionProp.create({
        data: genConstructionPropDBData().data,
        include: { items: true },
      });
      const grc = await prisma.grc.create({
        data: {
          plotId: props.plotId,
          constructionPropId: prop.id,
          bull: props.isBull,
          identifier: props.identifier || `Item ${numGrcs + 1}`,
          unit: props.unit || '',
          size: props.size || 0,
          rate: 1,
        },
        include: { constructionProp: { include: { items: true } } },
      });
      if (!grc.constructionProp) {
        return { ...grc, constructionProp: prop };
      }
      return { ...grc, constructionProp: grc.constructionProp };
    })
    .finally(() => {
      grcPromise = undefined;
    });
  return grcPromise;
}

interface CreateViaInsuranceProps {
  plotId: string;
  itemId: string | undefined;
  roofTypeId: string | undefined;
  unit: number | undefined;
}
export async function createViaInsurancePromise(props: CreateViaInsuranceProps) {
  if (insurancePromise) {
    return insurancePromise;
  }
  insurancePromise = new Promise((resolve) => {
    setTimeout(() => resolve(undefined), 500);
  })
    .then(async () => {
      const [defaultItem, prop] = await Promise.all([
        prisma.insuranceItem.findFirst({
          select: { id: true },
        }),
        prisma.constructionProp.create({
          data: genConstructionPropDBData().data,
          include: { items: true },
        }),
      ]);
      if (!defaultItem) {
        return new Error('Insurance items not found');
      }
      const insurance = await prisma.insurance.create({
        data: {
          plotId: props.plotId,
          itemId: props.itemId || defaultItem.id,
          roofTypeId: props.roofTypeId || null,
          rate: 1,
          area: props.unit || 1,
          constructionPropId: prop.id,
        },
        include: { constructionProp: { include: { items: true } } },
      });
      if (!insurance.constructionProp) {
        return { ...insurance, constructionProp: prop };
      }
      return { ...insurance, constructionProp: insurance.constructionProp };
    })
    .finally(() => {
      insurancePromise = undefined;
    });
  return insurancePromise;
}

export async function getYearRangeValues(kind?: string, isInsurance?: boolean) {
  return prisma.yearRangeValue
    .findMany({
      where: {
        kind: kind || (isInsurance ? CalculatorKind.Boundary_Wall : CalculatorKind.Residential_SS_up_to_100m2),
      },
    })
    .then((records) =>
      records.map((r) => ({
        ...r,
        first: Number(r.first),
        second: Number(r.second),
        third: Number(r.third),
      })),
    );
}

export function getConstructionItemDBData() {
  return {
    create: [
      createConstructionItem(MiniKnownElement.SwimmingPool, MiniPropertyOption.SwimmingPool.Yes, QualityOfFinish.Excellent),
      createConstructionItem(MiniKnownElement.Paving, MiniPropertyOption.Paving.No, QualityOfFinish.Excellent),
      createConstructionItem(MiniKnownElement.CarPort, MiniPropertyOption.CarPort.Yes, QualityOfFinish.Excellent, 'Enter area of car port', 18),
      createConstructionItem(MiniKnownElement.Boundary_Wall, MiniPropertyOption.BoundaryWall.PRE_CAST_SLABS, QualityOfFinish.Excellent),
      createConstructionItem(MiniKnownElement.ElectricFence, MiniPropertyOption.ElectricFence.Yes, QualityOfFinish.Excellent),
      createConstructionItem(MiniKnownElement.Gate, MiniPropertyOption.Gate.DIAMOND_MESH, QualityOfFinish.Excellent),
      createConstructionItem(KnownElement.Foundations, PropertyOption.Foundations, QualityOfFinish.Excellent),
      createConstructionItem(KnownElement.Concrete, PropertyOption.Concrete.Yes, QualityOfFinish.Excellent),
      createConstructionItem(KnownElement.Brickwork, PropertyOption.Bricks.StockBricks, QualityOfFinish.Excellent),
      createConstructionItem(KnownElement.RoofingCover, PropertyOption.Roofing.ConcreteRoofTiles, QualityOfFinish.Excellent),
      createConstructionItem(KnownElement.RoofingTrusses, PropertyOption.Trusses.TimberRoofTrusses, QualityOfFinish.Excellent),
      createConstructionItem(KnownElement.CarpentryAndJoineryDoors, PropertyOption.CarpentryAndJoineryDoors.Yes, QualityOfFinish.Excellent),
      createConstructionItem(KnownElement.CarpentryAndJoineryFittedKitchen, PropertyOption.CarpentryAndJoineryFittedKitchen.Yes, QualityOfFinish.Excellent),
      createConstructionItem(
        KnownElement.CarpentryAndJoineryFittedWardrobes,
        PropertyOption.CarpentryAndJoineryFittedWardrobes.Yes,
        QualityOfFinish.Excellent,
        'Enter number of wardrobes',
        1,
      ),
      createConstructionItem(KnownElement.Ceilings, PropertyOption.Ceilings.Yes, QualityOfFinish.Excellent),
      createConstructionItem(KnownElement.FloorCoverings, PropertyOption.Flooring.Tiling, QualityOfFinish.Excellent),
      createConstructionItem(KnownElement.Metalwork, PropertyOption.Frames.AluminiumWindow, QualityOfFinish.Excellent),
      createConstructionItem(KnownElement.Plastering, PropertyOption.Plastering.Yes, QualityOfFinish.Excellent),
      createConstructionItem(KnownElement.WallFinishes, PropertyOption.WallFinishes.Yes, QualityOfFinish.Excellent),
      createConstructionItem(KnownElement.PlumbingAndDrainage, PropertyOption.PlumbingAndDrainage.Yes, QualityOfFinish.Excellent, 'Enter number of bathrooms', 1),
      createConstructionItem(KnownElement.Paintwork, PropertyOption.Paintwork.Yes, QualityOfFinish.Excellent),
      createConstructionItem(KnownElement.Electrical, PropertyOption.Electrical.Yes, QualityOfFinish.Excellent),
      createConstructionItem(KnownElement.MechanicalWorks, PropertyOption.MechanicalWorks.Yes, QualityOfFinish.Excellent, 'Enter number of aircons', 1),
      createConstructionItem(KnownElement.Veranda, PropertyOption.Veranda.Yes, QualityOfFinish.Excellent),
      createConstructionItem(KnownElement.FurnitureAndFittings, PropertyOption.FurnitureAndFittings.Yes, QualityOfFinish.Excellent, 'Enter number of rooms', 1),
      createConstructionItem(KnownElement.ExternalWorksAccessRoad, PropertyOption.ExternalWorksAccessRoad.Yes, QualityOfFinish.Excellent, '_', 1),
    ],
  };
}

export function genConstructionPropDBData() {
  return {
    data: {
      name: '',
      floorArea: 0,
      verandaFloorArea: 0,
      devYear: YearRange.First,
      items: getConstructionItemDBData(),
    },
  };
}

export async function createConstructionProp() {
  return prisma.constructionProp.create({
    data: genConstructionPropDBData().data,
    include: { items: true },
  });
}

export async function createNewGrcRecord(plotId: string, bull: boolean) {
  const newProp = await createConstructionProp();
  const newGrc = await prisma.grc.create({
    data: {
      plotId,
      identifier: '',
      unit: '',
      size: 0,
      rate: 0,
      bull,
      constructionPropId: newProp.id,
    },
    include: { constructionProp: { include: { items: true } } },
  });
  return { ...newGrc, constructionProp: newProp };
}

export async function ensureConstructionPropItems(propId: string) {
  return prisma.constructionProp.update({
    where: { id: propId },
    data: { items: getConstructionItemDBData() },
    include: { items: true },
  });
}

export async function ensureExternalWorkPropItems<T extends { element: string }>(propId: string, items: T[]) {
  const elements = [
    [MiniKnownElement.SwimmingPool, MiniPropertyOption.SwimmingPool.Yes],
    [MiniKnownElement.Paving, MiniPropertyOption.Paving.No],
    [MiniKnownElement.CarPort, MiniPropertyOption.CarPort.Yes, 'Enter area of car port', 18],
  ] as const;
  const missing = elements.filter(([element]) => items.every((i) => i.element !== element));
  if (missing.length) {
    for (let element of missing) {
      await prisma.constructionPropertyItem.create({
        data: {
          element: element[0],
          propertyOption: element[1],
          qualityOfFinish: QualityOfFinish.Excellent,
          multiplierIdentifier: element[2],
          multiplier: element[3],
          propId,
        },
      });
    }
    const prop = await prisma.constructionProp.findUnique({
      where: { id: propId },
      include: { items: true },
    });
    return prop;
  }
}

export async function ensureBoundaryWallPropItems<T extends { element: string }>(propId: string, items: T[]) {
  const elements = [
    [MiniKnownElement.Boundary_Wall, MiniPropertyOption.BoundaryWall.BLOCKS],
    [MiniKnownElement.ElectricFence, MiniPropertyOption.ElectricFence.Yes],
    [MiniKnownElement.Gate, MiniPropertyOption.Gate.DIAMOND_MESH],
  ];
  const missing = elements.filter(([element]) => items.every((i) => i.element !== element));
  if (missing.length) {
    for (let element of missing) {
      await prisma.constructionPropertyItem.create({
        data: {
          element: element[0],
          propertyOption: element[1],
          qualityOfFinish: QualityOfFinish.Excellent,
          propId,
        },
      });
    }
    const prop = await prisma.constructionProp.findUnique({
      where: { id: propId },
      include: { items: true },
    });
    return prop;
  }
}

export async function updateConstructionPropKind(propId: string, isBull: boolean, recordedKind: string | null, inputKind: string | undefined) {
  if (typeof inputKind === 'string' && inputKind) {
    if (inputKind === recordedKind) {
      return inputKind;
    }
    await prisma.constructionProp.update({
      where: { id: propId },
      data: { kind: inputKind },
    });
    return inputKind;
  }
  if (recordedKind) {
    return recordedKind;
  }
  if (isBull) {
    const { kind: updatedKind } = await prisma.constructionProp.update({
      where: { id: propId },
      data: { kind: CalculatorKind.Residential_SS_up_to_100m2 },
    });
    return updatedKind!;
  } else {
    const { kind: updatedKind } = await prisma.constructionProp.update({
      where: { id: propId },
      data: { kind: CalculatorKind.Boundary_Wall },
    });
    return updatedKind!;
  }
}
