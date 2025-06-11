import { json, type LoaderArgs } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';

import { prisma } from '~/db.server';
import { AppLinks } from '~/models/links';
import { requireUser } from '~/session.server';

export async function loader({ request }: LoaderArgs) {
  const currentUser = await requireUser(request);

  const plots = await prisma.plot.findMany({
    where: { valuedById: currentUser.id },
    include: { valuedBy: true },
  });
  return json({ plots });
}

export default function Allan() {
  const { plots } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Plots</h1>
      <ul className="flex flex-col items-stretch">
        {plots.map((plot) => (
          <li key={plot.id}>
            <Link to={AppLinks.Plot(plot.id)} className="text-teal-600 hover:underline text-base font-light">
              #{plot.plotNumber}
            </Link>
          </li>
        ))}
        <li className="text-stone-400 font-light">No plots found</li>
      </ul>
    </div>
  );
}
