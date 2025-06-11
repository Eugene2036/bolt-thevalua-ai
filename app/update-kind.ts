import { prisma } from './db.server';
import { CalculatorKind } from './models/construction.types';

(async () => {
  try {
    const records = await prisma.yearRangeValue.findMany();
    const relevant = records.filter((r) => !r.kind);
    console.log('found', relevant.length, 'records to update');
    for (let record of relevant) {
      console.log('updating record...', record.id);
      await prisma.yearRangeValue.update({
        where: { id: record.id },
        data: { kind: CalculatorKind.Residential_SS_up_to_100m2 },
      });
      console.log('updated');
    }
    console.log('done');
  } catch (error) {
    console.error('error', error);
  }
})();
