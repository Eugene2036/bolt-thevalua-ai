import { prisma } from './db.server';
import { PropertyType } from './models/propertyTypes.validations';

(async () => {
  try {
    await prisma.propertyType.updateMany({
      where: { identifier: 'Store' },
      data: { identifier: PropertyType.Store },
    });
    console.log('Done');
  } catch (error) {
    console.log('error', error);
  }
})();
