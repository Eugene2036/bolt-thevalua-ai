import { prisma } from './db.server';
import { ValuationType } from './models/plots.validations';

(async () => {
  const a = await prisma.plot.updateMany({
    where: { valuationType: ValuationType.Residential },
    data: { council: true },
  });
  console.log('Done', a.count);
})();
