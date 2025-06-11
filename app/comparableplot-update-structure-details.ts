import { prisma } from './db.server';
import upsertInspectionsData from './comparableplot-import-gcc-valuations';

(async () => {
  await upsertInspectionsData;

  try {
    // Fetch all inspections data
    const inspectionsData = await prisma.inspectionsData.findMany();

    console.log(`Found ${inspectionsData.length} inspection records`);

    for (const inspection of inspectionsData) {
      // Find matching ComparablePlot by plotNumber and location
      const comparablePlot = await prisma.comparablePlot.findFirst({
        where: {
          plotNumber: inspection.plotNumber,
          suburb: inspection.suburb,
          location: inspection.location,
        },
      });

      if (comparablePlot) {
        // Update the ComparablePlot with data from InspectionsData
        await prisma.comparablePlot.update({
          where: { id: comparablePlot.id },
          data: {
            titleDeed: inspection.titleDeed,
            numAirCons: inspection.numAirCons,
            numParkingBays: inspection.numParkingBays,
            numOfStructures: inspection.numOfStructures,
            numToilets: inspection.numToilets,
            numStorerooms: inspection.numStorerooms,
            numBathrooms: inspection.numBathrooms,
            swimmingPool: inspection.swimmingPool,
            paving: inspection.paving,
            boundary: inspection.boundary,
            garageType: inspection.garageType,
            kitchen: inspection.kitchen,
            wardrobe: inspection.wardrobe,
            roofModel: inspection.roofModel,
            ceiling: inspection.ceiling,
            interiorWallFinish: inspection.interiorWallFinish,
            longitude: inspection.longitude,
            latitude: inspection.latitude,
          },
        });

        console.log(`Updated ComparablePlot with ID: ${comparablePlot.id}`);
      } else {
        console.log(
          `No matching ComparablePlot found for plotNumber: ${inspection.plotNumber}, suburb: ${inspection.suburb} and location: ${inspection.location}`
        );
      }
    }

    console.log('Update process completed.');
  } catch (error) {
    console.error('Error updating ComparablePlot details:', error);
  }
})();
