import { prisma } from './db.server';

(async () => {
  const comparableOptions = await prisma.comparablePlot.findMany({
    select: { suburb: true },
  });
  console.log('Found comparable options', comparableOptions.length);

  const suburbOptions = [...new Set(comparableOptions.map((c) => c.suburb))].sort((a, b) => {
    return a.toLowerCase().localeCompare(b.toLowerCase());
  });
  console.log('Distilled down to', suburbOptions.length, 'suburb options');

  console.log('Creating suburbs...');
  await prisma.suburb.createMany({
    data: suburbOptions.map((option) => ({
      identifier: option,
    })),
  });
  console.log('Done creating suburbs');
})();
