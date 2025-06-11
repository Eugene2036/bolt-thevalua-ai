import { prisma } from './db.server';

(async () => {
  const plots = await prisma.plot.findMany({
    select: { id: true, coverImageId: true },
  });
  console.log('Fetched', plots.length, 'plots');

  await plots.reduce(async (acc, plot) => {
    await acc;
    await prisma.plot.update({
      where: { id: plot.id },
      data: { coverImageId: 'g3wu8pjsrhfhgpq67wab' },
    });
    console.log('Update plot', plot.id);
    await prisma.image.create({
      data: {
        plotId: plot.id,
        imageId: 'jziexpkkzdjds12kcofo',
      },
    });
    console.log('Added internal image for plot', plot.id);
  }, Promise.resolve());

  console.log('Done');
})();
