import type { LoaderArgs } from '@remix-run/node';

import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

import { prisma } from '../db.server';
import { createConstructionItem } from '../models/construction.fns';
import { KnownElement, PropertyOption, QualityOfFinish } from '../models/construction.types';

function chunkArray<T>(array: T[], chunkSize: number = 500): T[][] {
  const result: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    result.push(chunk);
  }

  return result;
}

export async function loader({ request }: LoaderArgs) {
  try {
    const props = await prisma.constructionProp.findMany({
      // select: { id: true },
      select: { id: true, items: { select: { element: true } } },
    });
    const mapped = props
      .filter((prop) => prop.items.every((i) => i.element !== KnownElement.ExternalWorksAccessRoad))
      .map((prop) => {
        return {
          propId: prop.id,
          ...createConstructionItem(KnownElement.ExternalWorksAccessRoad, PropertyOption.ExternalWorksAccessRoad.Yes, QualityOfFinish.Excellent, '_', 1),
        };
      });

    const chunks = chunkArray(mapped);

    for (let chunk of chunks) {
      await prisma.constructionPropertyItem.createMany({
        data: chunk,
      });

      const index = chunks.indexOf(chunk);
      console.log('updated chunk', 'length', chunk.length, 'index', index + 1, 'of', chunks.length, 'chunks');
    }
    console.log('done');
    return json({ zdcd: 'csx' });
  } catch (error) {
    console.log('error >>>', error);
    return json({ zdcd: 'csx' });
  }
}

export default function AddExtraProp() {
  const { zdcd } = useLoaderData<typeof loader>();
  console.log(zdcd);
  return (
    <div>
      <h1>Unknown Route</h1>
    </div>
  );
}
