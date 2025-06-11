import { prisma } from './db.server';
import { writeToFile } from './models/custom-fs';

(async () => {
  try {
    const values = await prisma.yearRangeValue.findMany();
    const arrays = values.map((v) => [v.identifier, v.first, v.second, v.third]);
    const err = await writeToFile('year-range-values.json', JSON.stringify(arrays, null, 2));
    if (err) {
      throw err;
    }
    console.log('Done');
  } catch (error) {
    console.log('error', error);
  }
})();
