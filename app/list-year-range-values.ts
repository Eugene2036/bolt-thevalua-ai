import type { Decimal } from '@prisma/client/runtime';

import { prisma } from './db.server';
import { CalculatorKind } from './models/construction.types';

(async () => {
  try {
    const records = await prisma.yearRangeValue.findMany();

    const grouped = groupByKind(records);
    for (let key in grouped) {
      const records = grouped[key];
      for (let record of records) {
        console.log(record.identifier, record.first, record.second, record.third);
      }
    }
  } catch (error) {
    console.log('error', error);
  }
})();

interface Obj {
  identifier: string;
  first: Decimal;
  second: Decimal;
  third: Decimal;
  kind: string | null;
}

function groupByKind(objs: Obj[]): Record<string, Obj[]> {
  return objs.reduce(
    (acc, obj) => {
      const key = obj.kind || CalculatorKind.Residential_SS_up_to_100m2;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(obj);
      return acc;
    },
    {} as Record<string, Obj[]>,
  );
}
