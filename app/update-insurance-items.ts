import { prisma } from './db.server';
import { InsuranceItem } from './models/insurance';

(async () => {
  try {
    // const insuranceItems = await prisma.insuranceItem.findMany();
    const itemsToAdd = [
      InsuranceItem.Factory,
      InsuranceItem.Flat,
      InsuranceItem.Showroom,
      InsuranceItem.Storeroom,
      InsuranceItem.Terrace,
      InsuranceItem.Workshop,
      InsuranceItem.Retail,
      InsuranceItem.Shed,
      InsuranceItem.Other,
      InsuranceItem.BoundaryWall,
    ];
    // const itemsToDelete = ['Sec System'];

    for (let item of itemsToAdd) {
      console.log('Adding insurance item', item, '...');
      await prisma.insuranceItem.create({
        data: { identifier: item },
      });
      console.log('Added');
    }

    console.log('Done');
  } catch (error) {
    console.log('error >>>', error);
  }
})();
