import type { Worksheet } from 'exceljs';

import { json, type LoaderArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import { RouteErrorBoundary } from '~/components/Boundaries';
import { prisma } from '~/db.server';
import { createConstructionItem, getCalculatorRate, validateInObj } from '~/models/construction.fns';
import { getYearRangeValues } from '~/models/construction.server';
import { CalculatorKind, MiniKnownElement, MiniPropertyOption, QualityOfFinish, YearRange } from '~/models/construction.types';
import { isNullOrUndefined } from '~/models/core.validations';
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

  const calculatorKind = CalculatorKind.External_Works_Residential;

  const sheet = await getSheet('public/gab.xlsx', calculatorKind);
  if (!sheet) {
    throw new Response('Sheet not found', { status: 404 });
  }

  function getFactors(sheet: Worksheet) {
    const row = sheet.getRow(13);
    const second = row.getCell('H').value;
    const first = row.getCell('I').value;

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
    const third = row.getCell('G').value;

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
    [MiniPropertyOption.SwimmingPool.Yes, ...getRowValues(sheet, 15)],
    [MiniPropertyOption.SwimmingPool.No, ...getRowValues(sheet, 16)],
    [MiniPropertyOption.Paving.Yes, ...getRowValues(sheet, 21)],
    [MiniPropertyOption.Paving.No, ...getRowValues(sheet, 22)],
    [MiniPropertyOption.CarPort.Yes, ...getRowValues(sheet, 27)],
    [MiniPropertyOption.CarPort.No, ...getRowValues(sheet, 28)],
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

  const devYear = YearRange.Third;
  const floorArea = 60;
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
            createConstructionItem(MiniKnownElement.SwimmingPool, MiniPropertyOption.SwimmingPool.Yes, QualityOfFinish.Excellent),
            createConstructionItem(MiniKnownElement.Paving, MiniPropertyOption.Paving.No, QualityOfFinish.Excellent),
            createConstructionItem(MiniKnownElement.CarPort, MiniPropertyOption.CarPort.Yes, QualityOfFinish.Excellent, 'Enter area of car port', 18),
          ],
        },
      },
      include: { items: true },
    });
  })();

  const yearRangeValues = await getYearRangeValues(calculatorKind);

  getCalculatorRate(
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
