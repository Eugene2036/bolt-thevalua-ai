import { prisma } from './db.server';
import { PropertyOption } from './models/construction.types';

(async () => {
  try {
    console.log('deleting prev values...');
    await prisma.yearRangeValue.deleteMany({});
    console.log('deleted prev values');
    const inputs: [string, number, number, number][] = [
      [PropertyOption.Foundations, 200, 200, 200],
      [PropertyOption.Concrete.Yes, 200, 200, 200],
      [PropertyOption.Concrete.No, 0, 0, 0],
      [PropertyOption.Bricks.StockBricks, 200, 200, 200],
      [PropertyOption.Bricks.Blocks, 200, 200, 200],
      [PropertyOption.Bricks.FaceBricks, 200, 200, 200],
      [PropertyOption.Bricks.NoBrickworkDone, 0, 0, 0],
      [PropertyOption.Trusses.TimberRoofTrusses, 200, 200, 200],
      [PropertyOption.Trusses.StructuralSteelTrusses, 200, 200, 200],
      [PropertyOption.Trusses.NoRoofTrusses, 0, 0, 0],
      [PropertyOption.Roofing.ConcreteRoofTiles, 200, 200, 200],
      [PropertyOption.Roofing.IBR, 200, 200, 200],
      [PropertyOption.Roofing.CorrugatedRoofingSheets, 200, 200, 200],
      [PropertyOption.Roofing.NoRoofing, 0, 0, 0],
      [PropertyOption.CarpentryAndJoineryDoors.Yes, 200, 200, 200],
      [PropertyOption.CarpentryAndJoineryDoors.No, 0, 0, 0],
      [PropertyOption.CarpentryAndJoineryFittedKitchen.Yes, 200, 200, 200],
      [PropertyOption.CarpentryAndJoineryFittedKitchen.No, 0, 0, 0],
      [PropertyOption.CarpentryAndJoineryFittedWardrobes.Yes, 200, 200, 200],
      [PropertyOption.CarpentryAndJoineryFittedWardrobes.No, 0, 0, 0],
      [PropertyOption.Ceilings.Yes, 200, 200, 200],
      [PropertyOption.Ceilings.No, 0, 0, 0],
      [PropertyOption.Flooring.Vinyl, 200, 200, 200],
      [PropertyOption.Flooring.Tiling, 200, 200, 200],
      [PropertyOption.Flooring.Timber, 200, 200, 200],
      [PropertyOption.Flooring.Carpets, 200, 200, 200],
      [PropertyOption.Flooring.NoFlooring, 0, 0, 0],
      [PropertyOption.Frames.SteelWindow, 200, 200, 200],
      [PropertyOption.Frames.AluminiumWindow, 200, 200, 200],
      [PropertyOption.Frames.NoWindowsFitted, 200, 200, 200],
      [PropertyOption.Plastering.Yes, 200, 200, 200],
      [PropertyOption.Plastering.No, 0, 0, 0],
      [PropertyOption.WallFinishes.Yes, 200, 200, 200],
      [PropertyOption.WallFinishes.No, 0, 0, 0],
      [PropertyOption.PlumbingAndDrainage.Yes, 200, 200, 200],
      [PropertyOption.PlumbingAndDrainage.No, 0, 0, 0],
      [PropertyOption.Paintwork.Yes, 200, 200, 200],
      [PropertyOption.Paintwork.No, 0, 0, 0],
      [PropertyOption.Electrical.Yes, 200, 200, 200],
      [PropertyOption.Electrical.No, 0, 0, 0],
      [PropertyOption.MechanicalWorks.Yes, 200, 200, 200],
      [PropertyOption.MechanicalWorks.No, 0, 0, 0],
    ];
    console.log('Adding year range values...');
    for (let input of inputs) {
      console.log('Adding year range value', input[0], '...');
      await prisma.yearRangeValue.create({
        data: {
          identifier: input[0],
          first: input[1],
          second: input[2],
          third: input[3],
        },
      });
      console.log('Added');
    }
    console.log('Done');
  } catch (error) {
    console.error('error', error);
  }
})();
