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

  const calculatorKind = CalculatorKind.Residential_SS_up_to_100m2;
  const sheet = await getSheet('public/gab.xlsx', calculatorKind);
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
    [PropertyOption.Trusses.NoRoofTrusses, ...getRowValues(sheet, 34)],
    [PropertyOption.Roofing.ConcreteRoofTiles, ...getRowValues(sheet, 27)],
    [PropertyOption.Roofing.IBR, ...getRowValues(sheet, 28)],
    [PropertyOption.Roofing.CorrugatedRoofingSheets, ...getRowValues(sheet, 29)],
    [PropertyOption.Roofing.NoRoofing, ...getRowValues(sheet, 30)],
    [PropertyOption.CarpentryAndJoineryDoors.Yes, ...getRowValues(sheet, 36)],
    [PropertyOption.CarpentryAndJoineryDoors.No, ...getRowValues(sheet, 37)],
    [PropertyOption.CarpentryAndJoineryFittedKitchen.Yes, ...getRowValues(sheet, 39)],
    [PropertyOption.CarpentryAndJoineryFittedKitchen.No, ...getRowValues(sheet, 40)],
    [PropertyOption.CarpentryAndJoineryFittedWardrobes.Yes, ...getRowValues(sheet, 43)],
    [PropertyOption.CarpentryAndJoineryFittedWardrobes.No, ...getRowValues(sheet, 44)],
    [PropertyOption.Ceilings.Yes, ...getRowValues(sheet, 46)],
    [PropertyOption.Ceilings.No, ...getRowValues(sheet, 47)],
    [PropertyOption.Flooring.Vinyl, ...getRowValues(sheet, 49)],
    [PropertyOption.Flooring.Tiling, ...getRowValues(sheet, 50)],
    [PropertyOption.Flooring.Timber, ...getRowValues(sheet, 51)],
    [PropertyOption.Flooring.Carpets, ...getRowValues(sheet, 52)],
    [PropertyOption.Flooring.NoFlooring, ...getRowValues(sheet, 53)],
    [PropertyOption.Frames.SteelWindow, ...getRowValues(sheet, 55)],
    [PropertyOption.Frames.AluminiumWindow, ...getRowValues(sheet, 56)],
    [PropertyOption.Frames.NoWindowsFitted, ...getRowValues(sheet, 57)],
    [PropertyOption.Plastering.Yes, ...getRowValues(sheet, 59)],
    [PropertyOption.Plastering.No, ...getRowValues(sheet, 60)],
    [PropertyOption.WallFinishes.Yes, ...getRowValues(sheet, 62)],
    [PropertyOption.WallFinishes.No, ...getRowValues(sheet, 63)],
    [PropertyOption.PlumbingAndDrainage.Yes, ...getRowValues(sheet, 66)],
    [PropertyOption.PlumbingAndDrainage.No, ...getRowValues(sheet, 67)],
    [PropertyOption.Paintwork.Yes, ...getRowValues(sheet, 69)],
    [PropertyOption.Paintwork.No, ...getRowValues(sheet, 70)],
    [PropertyOption.Electrical.Yes, ...getRowValues(sheet, 72)],
    [PropertyOption.Electrical.No, ...getRowValues(sheet, 73)],
    [PropertyOption.MechanicalWorks.Yes, ...getRowValues(sheet, 76)],
    [PropertyOption.MechanicalWorks.No, ...getRowValues(sheet, 77)],
    [PropertyOption.Veranda.Yes, ...getRowValues(sheet, 82)],
    [PropertyOption.Veranda.No, ...getRowValues(sheet, 83)],
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

// clwkn28yx0008v9uuzh8zr8nr
export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
