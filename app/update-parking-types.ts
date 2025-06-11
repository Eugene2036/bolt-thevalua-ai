import { prisma } from './db.server';
import { ParkingType } from './models/parkingTypes.validations';

(async () => {
  try {
    // const parkingItems = await prisma.parkingItem.findMany();
    const itemsToAdd = [ParkingType.Parkade, ParkingType.ATM, ParkingType.Billboard, ParkingType.Yardage, ParkingType.TelcoTower];
    // const itemsToDelete = ['Sec System'];

    for (let item of itemsToAdd) {
      console.log('Adding parking item', item, '...');
      await prisma.parkingType.create({
        data: { identifier: item },
      });
      console.log('Added');
    }

    console.log('Done');
  } catch (error) {
    console.log('error >>>', error);
  }
})();
