import { prisma } from './db.server';

(async () => {
  const plots = await prisma.plot.findMany({
    select: {
      id: true,
      coverImageId: true,
      images: { select: { imageId: true } },
    },
  });
  let numWithImages = 0;
  let numWithoutImages = 0;
  for (const plot of plots) {
    if (plot.coverImageId) {
      numWithImages++;
    } else {
      numWithoutImages++;
    }
  }
  console.log('numWithImages', numWithImages);
  console.log('numWithoutImages', numWithoutImages);
})();
