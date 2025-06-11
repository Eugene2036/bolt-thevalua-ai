import { prisma } from './db.server';

(async () => {
  const outgoings = await prisma.outgoing.findMany({
    where: { unitPerClient: 0 },
    select: { id: true, unitPerClient: true },
  });
  console.log('Found', outgoings.length, 'outgoings with 0 rate');

  for (let outgoing of outgoings) {
    await prisma.outgoing.update({
      where: { id: outgoing.id },
      data: { unitPerClient: 1 },
    });
    console.log('Updated outgoing', outgoing.id);
  }

  console.log('Done');
})();
