import { prisma } from './db.server';

async function run() {
  const plots = await prisma.plot.findMany({
    select: {
      plotNumber: true,
      reviewedBy: {
        select: { isSuper: true, email: true, firstName: true, lastName: true },
      },
    },
  });
  const relevant = plots.filter((p) => p.reviewedBy && !p.reviewedBy?.isSuper);
  console.log('num relevant', JSON.stringify(relevant, null, 2));
}
run();
