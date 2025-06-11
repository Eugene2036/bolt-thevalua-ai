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
    ['Assessment rates', 'Rates'],
    ['Basic levies', 'Levies'],
    ['Electricity and water for common areas', 'Electricity and Water in Common Areas'],
    ['General maintenance and repairs', 'Maintenance and Repairs'],
    ['Refurbishment / repairs', 'Refurbishment'],
    ['Management fee', 'Management Fee'],
    ['Auditors fee', 'Auditors Fee'],
    ['Insurance', 'Insurance'],
    ['Security', 'Security Services'],
    ['Cleaning', 'Cleaning Services'],
    ['Lift maintenance', 'Maintenance - Lift'],
    ['Air conditioning maintenance', 'Maintenance - A/C'],
  ] as const;

  for (const outgoing of outgoings) {
    const outgoingIdentifier = outgoingIdentifiers.find(([name]) => name === outgoing.identifier);

    if (!outgoingIdentifier) {
      await prisma.outgoing.delete({
        where: { id: outgoing.id },
      });
      continue;
    }

    await prisma.outgoing.update({
      where: { id: outgoing.id },
      data: { identifier: outgoingIdentifier[1] },
    });
    console.log('Done updating outgoing', outgoing.id, outgoing.identifier);
  }
})();
