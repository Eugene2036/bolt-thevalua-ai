import { prisma } from './db.server';

async function deleteAllRecords() {
  try {
    await prisma.$transaction(
      async (tx) => {
        console.log('Deleting all records except ConstructionProp-related models...');

        console.log('deleting tenants...');
        await tx.tenant.deleteMany({});

        console.log('deleting insurance...');
        await tx.insurance.deleteMany({});

        console.log('deleting outgoing...');
        await tx.outgoing.deleteMany({});

        console.log('deleting parking...');
        await tx.parking.deleteMany({});

        console.log('deleting comparablePlot...');
        await tx.comparablePlot.deleteMany({});

        console.log('deleting plotAndComparable...');
        await tx.plotAndComparable.deleteMany({});

        console.log('deleting image...');
        await tx.image.deleteMany({});

        console.log('deleting client...');
        await tx.client.deleteMany({});

        console.log('deleting valuer...');
        await tx.valuer.deleteMany({});

        console.log('deleting instruction...');
        await tx.instruction.deleteMany({});

        console.log('deleting grc...');
        await tx.grc.deleteMany({});

        console.log('deleting grcFee...');
        await tx.grcFee.deleteMany({});

        console.log('deleting grcDepr...');
        await tx.grcDepr.deleteMany({});

        console.log('deleting mv...');
        await tx.mv.deleteMany({});

        console.log('deleting password...');
        await tx.password.deleteMany({});

        console.log('deleting user...');
        await tx.user.deleteMany({});

        console.log('deleting storedValue...');
        await tx.storedValue.deleteMany({});

        console.log('deleting savedConfig...');
        await tx.savedConfig.deleteMany({});

        console.log('deleting event...');
        await tx.event.deleteMany({});

        console.log('deleting suburb...');
        await tx.suburb.deleteMany({});

        console.log('deleting plot...');
        await tx.plot.deleteMany({});
      },
      { maxWait: 5000, timeout: 20000000 },
    );

    console.log('All records deleted except ConstructionProp-related models.');
  } catch (error) {
    console.error('Error while deleting records:', error);
  } finally {
    // Close the Prisma Client connection
    await prisma.$disconnect();
  }
}

// Execute the function
deleteAllRecords();
