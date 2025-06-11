import { prisma } from './db.server';
import { KnownElement, PropertyOption, QualityOfFinish } from './models/construction.types';

(async () => {
  try {
    const props = await prisma.constructionProp.findMany({
      include: { items: true },
    });
    for (let prop of props) {
      const alreadyAdded = prop.items.some((item) => item.element === KnownElement.Veranda);
      if (alreadyAdded) {
        console.log('Item already added', prop.id);
        continue;
      }
      console.log('Adding item...', prop.id);
      await prisma.constructionPropertyItem.create({
        data: {
          element: KnownElement.Veranda,
          propertyOption: PropertyOption.Veranda.Yes,
          qualityOfFinish: QualityOfFinish.Excellent,
          propId: prop.id,
        },
      });
      console.log('Item added', prop.id);
    }
  } catch (error) {}
})();
