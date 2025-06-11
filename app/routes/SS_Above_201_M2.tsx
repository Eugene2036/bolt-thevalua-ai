import type { Worksheet } from 'exceljs';

import { json, type LoaderArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import { RouteErrorBoundary } from '~/components/Boundaries';
import { prisma } from '~/db.server';
import { CalculatorKind, PropertyOption } from '~/models/construction.types';
import { getSheet, getSheetNames } from '~/models/excel';

const ValueSchema = z
  .null()
  .transform((_) => 0)
  .or(z.number())
  .or(z.object({ formula: z.string(), result: z.number() }).transform((arg) => arg.result));

export async function loader({ request }: LoaderArgs) {
  const names = await getSheetNames('public/gab.xlsx');

  const calculatorKind = CalculatorKind.Residential_SS_Above_201_M2;

  const sheet = await getSheet('public/gab.xlsx', 'Residential SS  Above 201 M2');
  if (!sheet) {
    throw new Response('Sheet not found', { status: 404 });
  }

  function getFactors(sheet: Worksheet) {
    const row = sheet.getRow(16);
    const second = row.getCell('G').value;
    const first = row.getCell('H').value;

    const Schema = z.tuple([ValueSchema, ValueSchema]);
    const result = Schema.safeParse([first, second]);
    if (!result.success) {
      throw new Error(JSON.stringify(result.error, null, 2));
    }
    return result.data;
  }

  function getRowValues(sheet: Worksheet, rowNum: number) {
    const [firstFactor, secondFactor] = getFactors(sheet);
    const row = sheet.getRow(rowNum);
    const third = row.getCell('F').value;

    const Schema = ValueSchema;
    const result = Schema.safeParse(third);
    if (!result.success) {
      throw new Error(JSON.stringify(result.error, null, 2));
    }
    const first = result.data / firstFactor;
    const second = result.data / secondFactor;
    return [first, second, result.data] as [number, number, number];
  }

  const inputs: [string, number, number, number][] = [
    [PropertyOption.Foundations, ...getRowValues(sheet, 17)],
    [PropertyOption.Concrete.Yes, ...getRowValues(sheet, 19)],
    [PropertyOption.Concrete.No, ...getRowValues(sheet, 20)],
    [PropertyOption.Bricks.StockBricks, ...getRowValues(sheet, 22)],
    [PropertyOption.Bricks.Blocks, ...getRowValues(sheet, 23)],
    [PropertyOption.Bricks.FaceBricks, ...getRowValues(sheet, 24)],
    [PropertyOption.Bricks.NoBrickworkDone, ...getRowValues(sheet, 25)],
    [PropertyOption.Trusses.TimberRoofTrusses, ...getRowValues(sheet, 32)],
    [PropertyOption.Trusses.StructuralSteelTrusses, ...([0, 0, 0] as [number, number, number])],
    [PropertyOption.Trusses.NoRoofTrusses, ...getRowValues(sheet, 33)],
    [PropertyOption.Roofing.ConcreteRoofTiles, ...getRowValues(sheet, 27)],
    [PropertyOption.Roofing.IBR, ...getRowValues(sheet, 28)],
    [PropertyOption.Roofing.CorrugatedRoofingSheets, ...getRowValues(sheet, 29)],
    [PropertyOption.Roofing.NoRoofing, ...getRowValues(sheet, 30)],
    [PropertyOption.CarpentryAndJoineryDoors.Yes, ...getRowValues(sheet, 35)],
    [PropertyOption.CarpentryAndJoineryDoors.No, ...getRowValues(sheet, 36)],
    [PropertyOption.CarpentryAndJoineryFittedKitchen.Yes, ...getRowValues(sheet, 38)],
    [PropertyOption.CarpentryAndJoineryFittedKitchen.No, ...getRowValues(sheet, 39)],
    [PropertyOption.CarpentryAndJoineryFittedWardrobes.Yes, ...getRowValues(sheet, 42)],
    [PropertyOption.CarpentryAndJoineryFittedWardrobes.No, ...getRowValues(sheet, 43)],
    [PropertyOption.Ceilings.Yes, ...getRowValues(sheet, 45)],
    [PropertyOption.Ceilings.No, ...getRowValues(sheet, 46)],
    [PropertyOption.Flooring.Vinyl, ...getRowValues(sheet, 48)],
    [PropertyOption.Flooring.Tiling, ...getRowValues(sheet, 49)],
    [PropertyOption.Flooring.Timber, ...getRowValues(sheet, 50)],
    [PropertyOption.Flooring.Carpets, ...getRowValues(sheet, 51)],
    [PropertyOption.Flooring.NoFlooring, ...getRowValues(sheet, 52)],
    [PropertyOption.Frames.SteelWindow, ...getRowValues(sheet, 54)],
    [PropertyOption.Frames.AluminiumWindow, ...getRowValues(sheet, 55)],
    [PropertyOption.Frames.NoWindowsFitted, ...getRowValues(sheet, 56)],
    [PropertyOption.Plastering.Yes, ...getRowValues(sheet, 58)],
    [PropertyOption.Plastering.No, ...getRowValues(sheet, 59)],
    [PropertyOption.WallFinishes.Yes, ...getRowValues(sheet, 61)],
    [PropertyOption.WallFinishes.No, ...getRowValues(sheet, 62)],
    [PropertyOption.PlumbingAndDrainage.Yes, ...getRowValues(sheet, 65)],
    [PropertyOption.PlumbingAndDrainage.No, ...getRowValues(sheet, 66)],
    [PropertyOption.Paintwork.Yes, ...getRowValues(sheet, 68)],
    [PropertyOption.Paintwork.No, ...getRowValues(sheet, 69)],
    [PropertyOption.Electrical.Yes, ...getRowValues(sheet, 71)],
    [PropertyOption.Electrical.No, ...getRowValues(sheet, 72)],
    [PropertyOption.MechanicalWorks.Yes, ...getRowValues(sheet, 75)],
    [PropertyOption.MechanicalWorks.No, ...getRowValues(sheet, 76)],
    [PropertyOption.Veranda.Yes, ...getRowValues(sheet, 80)],
    [PropertyOption.Veranda.No, ...getRowValues(sheet, 81)],
  ];

  await prisma.yearRangeValue.deleteMany({
    where: { kind: calculatorKind },
  });

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
