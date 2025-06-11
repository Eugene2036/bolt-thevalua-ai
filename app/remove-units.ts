import { prisma } from './db.server';

async function run() {
  const propertyTypes = await prisma.propertyType.findMany({
    select: { id: true, identifier: true, _count: { select: { tenants: true } } },
  });
  console.log('Found', propertyTypes.length, 'property types');

  const def = propertyTypes[0];
  console.log('def', def);

  for (let propertyType of propertyTypes) {
    console.log('#', propertyType.identifier, 'has', propertyType._count.tenants, 'tenants');
    if (propertyType.identifier === 'Unit 5') {
      console.log('Skipping', propertyType.identifier);
      continue;
    }
    if (propertyType.identifier.includes('Unit')) {
      console.log('Updating', propertyType.identifier);
      await prisma.tenant.updateMany({
        where: { propertyTypeId: propertyType.id },
        data: { propertyTypeId: def.id },
      });
      console.log('Updated', propertyType.identifier);
      console.log('Removing', propertyType.identifier);
      await prisma.propertyType.delete({
        where: { id: propertyType.id },
      });
      console.log('Removed', propertyType.identifier);
    } else {
      console.log('Skipping', propertyType.identifier);
    }
  }
}
run();
