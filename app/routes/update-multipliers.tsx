import { json, type LoaderArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

import { KnownElement, MiniKnownElement } from '~/models/construction.types';

import { prisma } from '../db.server';

export async function loader({ request }: LoaderArgs) {
  const relevant = [MiniKnownElement.CarPort, KnownElement.CarpentryAndJoineryFittedWardrobes, KnownElement.PlumbingAndDrainage, KnownElement.MechanicalWorks];
  const items = await prisma.constructionPropertyItem.findMany({
    where: { element: { in: relevant } },
  });
  for (let item of items) {
    if (item.multiplier) {
      continue;
    }
    await prisma.constructionPropertyItem.update({
      where: { id: item.id },
      data: { multiplier: 1 },
    });
  }
  return json({});
}

export default function UpdateMultipliers() {
  const loaderdata = useLoaderData<typeof loader>();
  console.log('loaderdata', loaderdata);
  return <div>zxc</div>;
}
