import { prisma } from './db.server';

async function run() {
  const records = await prisma.suburb.findMany();
  console.log('records', JSON.stringify(records, null, 2));
}
run();
