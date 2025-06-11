import { prisma } from './db.server';

(async () => {
  const outgoings = await prisma.outgoing.findMany({
    select: {
      id: true,
      identifier: true,
      itemType: true,
    },
  });

  const outgoingIdentifiers = [
    ['Assessment rates', '1'],
    ['Basic levies', '12'],
    ['Electricity and water for common areas', '12'],
    ['General maintenance and repairs', '%'],
    ['Refurbishment / repairs', '1'],
    ['Management fee', '%'],
    ['Auditors fee', '1'],
    ['Insurance', '%'],
    ['Security', '12'],
    ['Cleaning', '12'],
    ['Lift maintenance', '12'],
    ['Air conditioning maintenance', '12'],
    ['RSC levies', '12'],
  ] as const;

  for (const outgoing of outgoings.filter((record) => !record.itemType)) {
    const outgoingIdentifier = outgoingIdentifiers.find(([name]) => name === outgoing.identifier);

    if (outgoingIdentifier) {
      await prisma.outgoing.update({
        where: { id: outgoing.id },
        data: { itemType: outgoingIdentifier[1] },
      });
      console.log('Done updating outgoing', outgoing.id, outgoing.identifier);
    }
  }
  console.log('Done.');
})();
