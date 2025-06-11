import { prisma } from './db.server';
import { GrcFeeType, GrcFeeTypePercs } from './models/plots.validations';

(async () => {
  const fees = await prisma.grcFee.findMany({
    where: { perc: 0 },
  });

  const pros = fees.filter((fee) => fee.identifier === GrcFeeType.Professional);
  const conts = fees.filter((fee) => fee.identifier === GrcFeeType.Contigencies);
  const stats = fees.filter((fee) => fee.identifier === GrcFeeType.Statutory);

  console.log('Updating pros...');
  await prisma.grcFee.updateMany({
    data: { perc: GrcFeeTypePercs.Professional },
    where: { id: { in: pros.map((pro) => pro.id) } },
  });
  console.log('Updated pros');
  console.log('Updating conts...');
  await prisma.grcFee.updateMany({
    where: { id: { in: conts.map((pro) => pro.id) } },
    data: { perc: GrcFeeTypePercs.Contigencies },
  });
  console.log('Updated conts');
  console.log('Updating stats...');
  await prisma.grcFee.updateMany({
    where: { id: { in: stats.map((pro) => pro.id) } },
    data: { perc: GrcFeeTypePercs[GrcFeeType.Statutory] },
  });
  console.log('Updated stats');
  console.log('Done');
})();
