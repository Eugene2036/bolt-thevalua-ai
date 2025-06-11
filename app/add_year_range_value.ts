import { prisma } from './db.server';
import { PropertyOption } from './models/construction.types';

(async () => {
  try {
    console.log('Adding year range values...');
    await prisma.yearRangeValue.create({
      data: {
        identifier: PropertyOption.Veranda.Yes,
        first: 200,
        second: 200,
        third: 200,
      },
    });
    await prisma.yearRangeValue.create({
      data: {
        identifier: PropertyOption.Veranda.No,
        first: 0,
        second: 0,
        third: 0,
      },
    });
    console.log('Done');
  } catch (error) {
    console.log('error', error);
  }
})();
