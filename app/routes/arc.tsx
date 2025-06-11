import type { LoaderArgs } from '@remix-run/node';

import { useLoaderData } from '@remix-run/react';
import { useEffect } from 'react';

import { doTheThing } from '~/models/arc.client';

export async function loader({ request }: LoaderArgs) {
  return null;
}

export default function Arc() {
  useLoaderData();

  useEffect(() => {
    async function init() {
      try {
        const thing = await doTheThing();
        console.log('>>>', thing);
      } catch (error) {
        console.log('error', error);
      }
    }
    init();
  }, []);

  return (
    <div>
      <h1>Unknown Route</h1>
    </div>
  );
}
