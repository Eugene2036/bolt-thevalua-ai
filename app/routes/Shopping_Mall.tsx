import type { Worksheet } from 'exceljs';

import { json, type LoaderArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import { RouteErrorBoundary } from '~/components/Boundaries';
import { prisma } from '~/db.server';
import { createConstructionItem, getCalculatorRate, validateInObj } from '~/models/construction.fns';
import { getYearRangeValues } from '~/models/construction.server';
import { CalculatorKind, KnownElement, PropertyOption, QualityOfFinish, YearRange } from '~/models/construction.types';
import { isNullOrUndefined } from '~/models/core.validations';
import { getSheet, getSheetNames } from '~/models/excel';

const ValueSchema = z
  .null()
  .transform((_) => 0)
  .or(z.number())
  .or(z.object({ formula: z.string(), result: z.number() }).transform((arg) => arg.result));

export async function loader({ request }: LoaderArgs) {
  const names = await getSheetNames('public/gab.xlsx');

  const calculatorKind = CalculatorKind.Shopping_Mall;
  const sheet = await getSheet('public/gab.xlsx', calculatorKind);
  if (!sheet) {
    throw new Response('Sheet not found', { status: 404 });
  }

  function getFactors(sheet: Worksheet) {
    const row = sheet.getRow(16);
    const second = row.getCell('F').value;
    const first = row.getCell('G').value;

    const Schema = z.tuple([ValueSchema, ValueSchema]);
    const result = Schema.safeParse([first, second]);
    if (!result.success) {
      throw new Error(JSON.stringify(result.error.issues, null, 2));
      // throw new Error(JSON.stringify(result.error, null, 2));
    }
    return result.data;
  }

  function getRowValues(sheet: Worksheet, rowNum: number) {
    const [firstFactor, secondFactor] = getFactors(sheet);
    const row = sheet.getRow(rowNum);
    const third = row.getCell('E').value;

    const Schema = ValueSchema;
    const result = Schema.safeParse(third);
    if (!result.success) {
      throw new Error(JSON.stringify(result.error.issues, null, 2));
      // throw new Error(JSON.stringify(result.error, null, 2));
    }
    const first = result.data / firstFactor;
    const second = result.data / secondFactor;
    return [first, second, result.data] as [number, number, number];
  }

  const inputs: [string, number, number, number][] = [
    [PropertyOption.Foundations, ...getRowValues(sheet, 17)],
    [PropertyOption.Concrete.Yes, ...getRowValues(sheet, 20)],
    [PropertyOption.Concrete.No, ...getRowValues(sheet, 21)],
    [PropertyOption.Bricks.StockBricks, ...getRowValues(sheet, 23)],
    [PropertyOption.Bricks.Blocks, ...getRowValues(sheet, 24)],
    [PropertyOption.Bricks.FaceBricks, ...getRowValues(sheet, 25)],
    [PropertyOption.Bricks.NoBrickworkDone, ...getRowValues(sheet, 26)],
    [PropertyOption.Trusses.TimberRoofTrusses, ...getRowValues(sheet, 33)],
    [PropertyOption.Trusses.StructuralSteelTrusses, ...getRowValues(sheet, 34)],
    // [
    //   PropertyOption.Trusses.StructuralSteelTrusses,
    //   ...([0, 0, 0] as [number, number, number]),
    // ],
    [PropertyOption.Trusses.NoRoofTrusses, ...getRowValues(sheet, 35)],
    [PropertyOption.Roofing.ConcreteRoofTiles, ...getRowValues(sheet, 28)],
    [PropertyOption.Roofing.IBR, ...getRowValues(sheet, 29)],
    [PropertyOption.Roofing.CorrugatedRoofingSheets, ...getRowValues(sheet, 30)],
    [PropertyOption.Roofing.NoRoofing, ...getRowValues(sheet, 31)],
    [PropertyOption.CarpentryAndJoineryDoors.Yes, ...getRowValues(sheet, 37)],
    [PropertyOption.CarpentryAndJoineryDoors.No, ...getRowValues(sheet, 38)],
    [PropertyOption.CarpentryAndJoineryFittedKitchen.Yes, ...getRowValues(sheet, 40)],
    [PropertyOption.CarpentryAndJoineryFittedKitchen.No, ...getRowValues(sheet, 41)],
    [PropertyOption.CarpentryAndJoineryFittedWardrobes.Yes, ...getRowValues(sheet, 43)],
    [PropertyOption.CarpentryAndJoineryFittedWardrobes.No, ...getRowValues(sheet, 44)],
    [PropertyOption.Ceilings.Yes, ...getRowValues(sheet, 46)],
    [PropertyOption.Ceilings.No, ...getRowValues(sheet, 47)],
    [PropertyOption.Flooring.Vinyl, ...getRowValues(sheet, 49)],
    [PropertyOption.Flooring.Tiling, ...getRowValues(sheet, 50)],
    [PropertyOption.Flooring.Timber, ...getRowValues(sheet, 51)],
    [PropertyOption.Flooring.Carpets, ...getRowValues(sheet, 52)],
    [PropertyOption.Flooring.NoFlooring, ...getRowValues(sheet, 53)],
    [PropertyOption.Frames.SteelWindow, ...getRowValues(sheet, 58)],
    [PropertyOption.Frames.AluminiumWindow, ...getRowValues(sheet, 59)],
    [PropertyOption.Frames.NoWindowsFitted, ...getRowValues(sheet, 60)],
    [PropertyOption.Plastering.Yes, ...getRowValues(sheet, 62)],
    [PropertyOption.Plastering.No, ...getRowValues(sheet, 63)],
    [PropertyOption.WallFinishes.Yes, ...getRowValues(sheet, 65)],
    [PropertyOption.WallFinishes.No, ...getRowValues(sheet, 66)],
    [PropertyOption.PlumbingAndDrainage.Yes, ...getRowValues(sheet, 69)],
    [PropertyOption.PlumbingAndDrainage.No, ...getRowValues(sheet, 70)],
    [PropertyOption.Paintwork.Yes, ...getRowValues(sheet, 72)],
    [PropertyOption.Paintwork.No, ...getRowValues(sheet, 73)],
    [PropertyOption.Electrical.Yes, ...getRowValues(sheet, 76)],
    [PropertyOption.Electrical.No, ...getRowValues(sheet, 77)],
    [PropertyOption.MechanicalWorks.Yes, ...getRowValues(sheet, 79)],
    [PropertyOption.MechanicalWorks.No, ...getRowValues(sheet, 80)],
    [PropertyOption.Veranda.Yes, ...getRowValues(sheet, 84)],
    [PropertyOption.Veranda.No, ...getRowValues(sheet, 85)],
    [PropertyOption.ExternalWorksAccessRoad.Yes, ...getRowValues(sheet, 93)],
    [PropertyOption.ExternalWorksAccessRoad.No, ...getRowValues(sheet, 94)],
  ];
  console.log('inputs', inputs);

  console.log('deleting prev values...');
  await prisma.yearRangeValue.deleteMany({
    where: { kind: calculatorKind },
  });
  console.log('deleted prev values');

  console.log('Adding year range values...');
  for (let input of inputs) {
    await prisma.yearRangeValue.create({
      data: {
        identifier: input[0],
        first: input[1],
        second: input[2],
        third: input[3],
        kind: calculatorKind,
      },
    });
  }
  console.log('Done');

  const devYear = YearRange.Third;
  const floorArea = 500;
  const verandaFloorArea = 55;

  console.log('Recording items...');
  const constructionPlot = await (async () => {
    await prisma.constructionProp.deleteMany({
      where: { name: calculatorKind },
    });
    return prisma.constructionProp.create({
      data: {
        name: calculatorKind,
        kind: calculatorKind,
        floorArea,
        verandaFloorArea,
        devYear,
        items: {
          create: [
            createConstructionItem(KnownElement.Foundations, PropertyOption.Foundations, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.Concrete, PropertyOption.Concrete.Yes, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.Brickwork, PropertyOption.Bricks.StockBricks, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.RoofingCover, PropertyOption.Roofing.IBR, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.RoofingTrusses, PropertyOption.Trusses.StructuralSteelTrusses, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.CarpentryAndJoineryDoors, PropertyOption.CarpentryAndJoineryDoors.Yes, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.CarpentryAndJoineryFittedKitchen, PropertyOption.CarpentryAndJoineryFittedKitchen.Yes, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.Ceilings, PropertyOption.Ceilings.Yes, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.FloorCoverings, PropertyOption.Flooring.Tiling, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.Metalwork, PropertyOption.Frames.SteelWindow, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.Plastering, PropertyOption.Plastering.Yes, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.WallFinishes, PropertyOption.WallFinishes.Yes, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.PlumbingAndDrainage, PropertyOption.PlumbingAndDrainage.Yes, QualityOfFinish.Fair, 'Enter number of wc/showers', 5),
            createConstructionItem(KnownElement.Paintwork, PropertyOption.Paintwork.Yes, QualityOfFinish.Fair),
            createConstructionItem(KnownElement.Electrical, PropertyOption.Electrical.Yes, QualityOfFinish.Good),
            createConstructionItem(KnownElement.MechanicalWorks, PropertyOption.MechanicalWorks.Yes, QualityOfFinish.VeryGood),
            createConstructionItem(KnownElement.Veranda, PropertyOption.Veranda.Yes, QualityOfFinish.VeryGood),
            createConstructionItem(KnownElement.ExternalWorksAccessRoad, PropertyOption.ExternalWorksAccessRoad.Yes, QualityOfFinish.Delapidated, '_', 1),
          ],
        },
      },
      include: { items: true },
    });
  })();
  console.log('Recorded items');

  const yearRangeValues = await getYearRangeValues(calculatorKind);

  const {
    costPerSqMQuality,
    costPerSqMTypical,
    totalQualityEstimate,
    totalTypicalEstimate,
    totalTypicalWithoutVat,
    costTypicalWithoutVat,
    totalQualityWithoutVat,
    costQualityWithoutVat,
  } = getCalculatorRate(
    calculatorKind,
    constructionPlot.items
      .map((item) => validateInObj.element(item))
      .map((item) => validateInObj.qualityOfFinish(item))
      .filter(Boolean)
      .map((i) => ({
        ...i,
        multiplier: !isNullOrUndefined(i.multiplier) ? Number(i.multiplier) : undefined,
      })),
    devYear,
    floorArea,
    verandaFloorArea,
    yearRangeValues,
  );

  console.log('costPerSqMQuality', costPerSqMQuality);
  console.log('costPerSqMTypical', costPerSqMTypical);
  console.log('totalQualityEstimate', totalQualityEstimate);
  console.log('totalTypicalEstimate', totalTypicalEstimate);

  console.log('totalTypicalWithoutVat >>>', totalTypicalWithoutVat);
  console.log('costTypicalWithoutVat >>>', costTypicalWithoutVat);
  console.log('totalQualityWithoutVat >>>', totalQualityWithoutVat);
  console.log('costQualityWithoutVat >>>', costQualityWithoutVat);

  return json({ names });
}

export default function Temp() {
  const { names } = useLoaderData<typeof loader>();
  return (
    <div className="flex flex-col items-stretch">
      <h1>Names</h1>
      {names.map((name) => (
        <span key={name} className="text-base">
          {name}
        </span>
      ))}
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
