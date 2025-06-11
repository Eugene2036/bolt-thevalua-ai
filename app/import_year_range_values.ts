import { readFile } from 'fs/promises';

import { z } from 'zod';

import { prisma } from './db.server';

(async () => {
  try {
    console.log('reading from json file...');
    const data = await readFile('year-range-values.json', 'utf-8');
    console.log('parsing json...');
    const parsedJSON = JSON.parse(data);
    const result = z.tuple([z.string(), z.coerce.number(), z.coerce.number(), z.coerce.number()]).array().safeParse(parsedJSON);
    if (!result.success) {
      throw new Error('Invalid JSON' + result.error.toString());
    }
    const values = result.data.map(([identifier, first, second, third]) => ({
      identifier,
      first,
      second,
      third,
    }));

    console.log('deleting year range values...');
    await prisma.yearRangeValue.deleteMany({
      where: { kind: null },
    });

    console.log('creating year range values...');
    await prisma.yearRangeValue.createMany({
      data: values,
      skipDuplicates: true,
    });
    console.log('Done');
  } catch (error) {
    console.log('error', error);
  }
})();
