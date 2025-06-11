import { json, type ActionArgs } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { useEffect } from 'react';
import { z } from 'zod';

import { useForm } from '~/components/ActionContextProvider';
import { prisma } from '~/db.server';
import { hasSuccess } from '~/models/core.validations';

export async function action({ request }: ActionArgs) {
  try {
    const plots = await prisma.plot.findMany({
      select: {
        id: true,
        grcRecords: {
          select: { id: true, identifier: true, size: true, rate: true },
        },
      },
    });
    console.log(plots.length, 'total plots found');
    const relevantPlots = plots.filter((p) => {
      return p.grcRecords.length > 0 && p.grcRecords.every((r) => !r.identifier);
    });
    console.log(relevantPlots.length, 'plots with no identifiers found');
    for (const plot of relevantPlots) {
      console.log('Attending to plot', relevantPlots.indexOf(plot) + 1, 'of', relevantPlots.length, '...');
      for (const record of plot.grcRecords) {
        const index = plot.grcRecords.indexOf(record);
        await prisma.grc.update({
          where: { id: record.id },
          data: { identifier: `Structure ${index + 1}` },
        });
      }
    }
    console.log('Done');
    return json({ success: true });
  } catch (error) {
    console.error('Error:', JSON.stringify(error, null, 2));
    return json({ errorMessage: JSON.stringify(error, null, 2) });
  }
}

export default function UpdateStructures() {
  const fetcher = useFetcher<typeof action>();
  const { isProcessing } = useForm(fetcher, z.object({}));
  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      window.alert('Done');
    }
  }, [fetcher.data]);
  return (
    <fetcher.Form method="post">
      <h1>Unknown Route</h1>
      <button type="submit" disabled={isProcessing}>
        {isProcessing && 'Running...'}
        {!isProcessing && 'Run'}
      </button>
    </fetcher.Form>
  );
}
