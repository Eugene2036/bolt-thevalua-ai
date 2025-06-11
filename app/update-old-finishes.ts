import { prisma } from './db.server';
import { QualityOfFinish } from './models/construction.types';

(async () => {
  try {
    const records = await prisma.constructionPropertyItem.findMany();
    const oldFinishes = ['Low', 'Good', 'Average', 'High'];
    const relevant = records.filter((r) => r.qualityOfFinish && oldFinishes.includes(r.qualityOfFinish));
    console.log('found', relevant.length, 'records to update');
    for (let record of relevant) {
      console.log('updating record...', record.id);
      await prisma.constructionPropertyItem.update({
        where: { id: record.id },
        data: { qualityOfFinish: QualityOfFinish.Excellent },
      });
      console.log('updated');
    }
    console.log('done');
  } catch (error) {
    console.error('error', error);
  }
})();
