import type { Worksheet } from 'exceljs';

import { json, type LoaderArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import { RouteErrorBoundary } from '~/components/Boundaries';
import { prisma } from '~/db.server';
import { createConstructionItem, getCalculatorRate, validateInObj } from '~/models/construction.fns';
import { getYearRangeValues } from '~/models/construction.server';
import { CalculatorKind, MiniKnownElement, MiniPropertyOption, QualityOfFinish, YearRange } from '~/models/construction.types';
import { formatAmount, isNullOrUndefined } from '~/models/core.validations';
import { getSheet, getSheetNames } from '~/models/excel';

const ValueSchema = z
  .null()
  .transform((_) => 0)
  .or(z.number())
  .or(
    z
      .object({
        // formula: z.string(),
        result: z.number(),
      })
      .transform((arg) => arg.result),
  );

export async function loader({ request }: LoaderArgs) {
  const names = await getSheetNames('public/gab.xlsx');

  const calculatorKind = CalculatorKind.Boundary_Wall;

  const sheet = await getSheet('public/gab.xlsx', calculatorKind);
  if (!sheet) {
    throw new Response('Sheet not found', { status: 404 });
  }

  function getFactors(sheet: Worksheet) {
    const row = sheet.getRow(13);
    const second = row.getCell('J').value;
    const first = row.getCell('K').value;

    const Schema = z.tuple([ValueSchema, ValueSchema]);
    const result = Schema.safeParse([first, second]);
    if (!result.success) {
      throw new Error(`Factors error: ${JSON.stringify(result.error, null, 2)}`);
    }
    return result.data;
  }

  function getRowValues(sheet: Worksheet, rowNum: number) {
    const [firstFactor, secondFactor] = getFactors(sheet);
    const row = sheet.getRow(rowNum);
    const third = row.getCell('I').value;

    const Schema = ValueSchema;
    const result = Schema.safeParse(third);
    if (!result.success) {
      throw new Error([`Row ${rowNum}:`, `Data: ${JSON.stringify(third)}`, `Error: ${JSON.stringify(result.error, null, 2)}`].join('\n'));
    }
    const first = result.data / firstFactor;
    const second = result.data / secondFactor;
    return [first, second, result.data] as [number, number, number];
  }

  const inputs: [string, number, number, number][] = [
    [MiniPropertyOption.BoundaryWall.BLOCKS, ...getRowValues(sheet, 16)],
    [MiniPropertyOption.BoundaryWall.BLOCKS_WITH_PALISADE, ...getRowValues(sheet, 17)],
    [MiniPropertyOption.BoundaryWall.PRE_CAST_SLABS, ...getRowValues(sheet, 18)],
    [MiniPropertyOption.BoundaryWall.STOCK_BRICKS, ...getRowValues(sheet, 19)],
    [MiniPropertyOption.BoundaryWall.STOCK_BRICKS_WITH_PALISADE, ...getRowValues(sheet, 20)],
    [MiniPropertyOption.BoundaryWall.FACE_BRICKS, ...getRowValues(sheet, 21)],
    [MiniPropertyOption.BoundaryWall.FACE_BRICK_WITH_PALISADE, ...getRowValues(sheet, 22)],
    [MiniPropertyOption.BoundaryWall.CLEAR_VU, ...getRowValues(sheet, 23)],
    [MiniPropertyOption.BoundaryWall.PALISADE, ...getRowValues(sheet, 24)],
    [MiniPropertyOption.BoundaryWall.DIAMOND_MESH, ...getRowValues(sheet, 25)],
    [MiniPropertyOption.ElectricFence.Yes, ...getRowValues(sheet, 28)],
    [MiniPropertyOption.ElectricFence.No, ...getRowValues(sheet, 29)],
    [MiniPropertyOption.Gate.METAL_GATE_MOTORISED, ...getRowValues(sheet, 32)],
    [MiniPropertyOption.Gate.METAL_GATE_NOT_MOTORISED, ...getRowValues(sheet, 33)],
    [MiniPropertyOption.Gate.DIAMOND_MESH, ...getRowValues(sheet, 34)],
    [MiniPropertyOption.Gate.NO_GAtE, ...getRowValues(sheet, 35)],
  ];

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

  const devYear = YearRange.Second;
  const floorArea = 500;
  const verandaFloorArea = 0;

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
            createConstructionItem(MiniKnownElement.Boundary_Wall, MiniPropertyOption.BoundaryWall.PRE_CAST_SLABS, QualityOfFinish.Excellent),
            createConstructionItem(MiniKnownElement.ElectricFence, MiniPropertyOption.ElectricFence.Yes, QualityOfFinish.Excellent),
            createConstructionItem(MiniKnownElement.Gate, MiniPropertyOption.Gate.DIAMOND_MESH, QualityOfFinish.Excellent),
          ],
        },
      },
      include: { items: true },
    });
  })();

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

  console.log('LEFT >>> totalTypicalEstimate', formatAmount(totalTypicalEstimate));
  console.log('LEFT >>> costPerSqMTypical', formatAmount(costPerSqMTypical));

  console.log('LEFT >>> totalTypicalWithoutVat', formatAmount(totalTypicalWithoutVat));
  console.log('LEFT >>> costTypicalWithoutVat', formatAmount(costTypicalWithoutVat));

  console.log('RIGHT >>> totalQualityEstimate', formatAmount(totalQualityEstimate));
  console.log('RIGHT >>> costPerSqMQuality', formatAmount(costPerSqMQuality));

  console.log('RIGHT >>> totalQualityWithoutVat', formatAmount(totalQualityWithoutVat));
  console.log('RIGHT >>> costQualityWithoutVat', formatAmount(costQualityWithoutVat));

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

// clwkn28yx0008v9uuzh8zr8nr
export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
