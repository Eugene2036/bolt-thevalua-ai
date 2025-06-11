import { prisma } from './db.server';

async function run() {
  const [propertyTypes, insuranceItems] = await Promise.all([
    prisma.propertyType.findMany({
      select: { id: true, identifier: true },
    }),
    prisma.insuranceItem.findMany({
      select: { id: true, identifier: true },
    }),
  ]);
  console.log('Found', propertyTypes.length, 'property types');
  console.log('Found', insuranceItems.length, 'insurance items');

  for (let propertyType of propertyTypes) {
    const alreadyAdded = insuranceItems.some((item) => item.identifier === propertyType.identifier);
    if (alreadyAdded) {
      console.log('Skipping', propertyType.identifier);
      continue;
    }
    console.log('Adding', propertyType.identifier);
    await prisma.insuranceItem.create({
      data: {
        identifier: propertyType.identifier,
      },
    });
    console.log('Added', propertyType.identifier);
  }
}
run();
