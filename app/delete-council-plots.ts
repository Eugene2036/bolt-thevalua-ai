import { prisma } from './db.server';

(async () => {
  await prisma.plot.deleteMany({
    where: { council: true },
  });
  console.log('Done');
})();
