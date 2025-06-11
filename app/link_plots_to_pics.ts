import { readFile } from 'fs/promises';

import { z } from 'zod';

import { prisma } from './db.server';

(async () => {
  try {
    const [records, rawPlots, photos] = await Promise.all([
      await prisma.plot.findMany({
        select: { plotNumber: true, coverImageId: true },
      }),
      getValidatedPlots(),
      getValidatedPhotos(),
    ]);

    const relevantPlots = rawPlots.filter((plot) => {
      const plotNumber = plot.attributes.plot_number;
      const alreadyDone = records.some((record) => {
        return record.plotNumber === plotNumber && !!record.coverImageId;
      });
      return !alreadyDone;
    });

    console.log(relevantPlots.length, 'plots left to be processed');
    for (let plot of relevantPlots) {
      const plotNumber = plot.attributes.plot_number;
      if (!plotNumber) {
        continue;
      }

      const index = relevantPlots.indexOf(plot);
      console.log('processing plot', index, 'of', relevantPlots.length);

      const match = photos.attachmentGroups.find((group) => group.parentObjectId === plot.attributes.objectid);

      if (!match) {
        console.log('No match found for', plotNumber);
        continue;
      }

      const images = match.attachmentInfos.map((el) => el.url);
      if (!images.length) {
        continue;
      }
      console.log(images.length, 'images found for plot', plotNumber);

      const [coverImageId, ...otherImages] = images;
      console.log('updating cover image for', plotNumber, '...');
      await prisma.plot.updateMany({
        where: { plotNumber },
        data: { coverImageId },
      });
      console.log('Cover image updated');
      if (otherImages.length) {
        console.log('Looking up plot', plotNumber);
        const plot = await prisma.plot.findFirst({
          where: { plotNumber },
        });
        if (!plot) {
          console.log('Plot record not found');
          continue;
        }
        console.log('Updating images...');
        await prisma.image.deleteMany({
          where: { plotId: plot.id },
        });
        for (let imageId of otherImages) {
          await prisma.image.create({
            data: { plotId: plot.id, imageId },
          });
        }
      }
    }
  } catch (error) {
    console.log('error', error);
  }
})();

async function getValidatedPhotos() {
  const Schema = z.object({
    attachmentGroups: z
      .object({
        parentObjectId: z.coerce.number(),
        attachmentInfos: z
          .object({
            globalId: z.string(),
            url: z.string(),
          })
          .array(),
      })
      .array(),
  });
  const response = (await readFile('app/latest_pics2.json')).toString();
  const result = Schema.safeParse(JSON.parse(response));
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}

async function getValidatedPlots() {
  const Schema = z.object({
    features: z
      .object({
        attributes: z.object({
          objectid: z.coerce.number(),
          globalid: z.string(),
          plot_number: z.string().or(z.null()),
        }),
      })
      .array(),
  });
  const files = [
    'plots1.json',
    'plots2.json',
    'plots3.json',
    'plots4.json',
    'plots5.json',
    'plots6.json',
    'plots7.json',
    'plots8.json',
    'plots9.json',
    'plots10.json',
    'plots11.json',
    'plots12.json',
    'plots13.json',
    'plots14.json',
    'plots15.json',
    'plots16.json',
    'plots17.json',
  ];
  const fetchedData: z.infer<typeof Schema>['features'] = [];
  for (let file of files) {
    const response = (await readFile(`app/${file}`)).toString();
    const result = Schema.safeParse(JSON.parse(response));
    if (!result.success) {
      throw result.error;
    }
    for (let entry of result.data.features) {
      const alreadyAdded = fetchedData.some((el) => el.attributes.plot_number === entry.attributes.plot_number);
      if (alreadyAdded) {
        continue;
      }
      fetchedData.push(entry);
    }
  }
  return fetchedData;
}
