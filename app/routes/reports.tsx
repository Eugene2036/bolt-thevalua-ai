import { json, type ActionArgs, type LoaderArgs, type SerializeFrom } from '@remix-run/node';
import { z } from 'zod';
import { useForm } from '~/components/ActionContextProvider';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields } from '~/models/forms';

import { Link, useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { ComponentProps } from 'react';
import { twMerge } from 'tailwind-merge';

import { RouteErrorBoundary } from '~/components/Boundaries';
import { TableCell } from '~/components/TableCell';
import { TableHeading } from '~/components/TableHeading';
import { prisma } from '~/db.server';
import { badRequest, getFullName, processBadRequest } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';
import { useUser } from '~/utils';

export async function loader({ request }: LoaderArgs) {
  const currentUserId = await requireUserId(request);

  const plots = await prisma.plot.findMany({
    where: { valuedById: currentUserId },
    include: {
      reportTemplate: true,
      reportReviewedBy: true,
      sections: true,
    },
  }).then(plots => plots.filter(p => p.sections.length));

  return json({ plots });
}

const Schema = z.object({
  plotId: z.string().min(1),
});

export async function action({ request }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  try {
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    await prisma.plot.update({
      where: { id: result.data.plotId },
      data: { reportValuedById: currentUserId }
    });
    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}

export default function UsersReportsPage() {
  const { plots } = useLoaderData<typeof loader>();
  const user = useUser();

  return (

    <div className="flex flex-col items-stretch bg-white py-6 gap-6 min-w-max">
      {/* <GraphTitle className="items-start">Reports Valued By {getFullName(user.firstName, user.lastName)}</GraphTitle> */}
      <table className="min-w-full items-stretch bg-white overflow-hidden shadow-md border border-stone-200 mt-3" style={{ width: '100%' }}>
        <thead>
          <tr>
            <CustomTableHeading className="w-1/6">Plot #</CustomTableHeading>
            <CustomTableHeading className="w-1/6">Status</CustomTableHeading>
            <CustomTableHeading className="w-1/6">Reviewer</CustomTableHeading>
            <CustomTableHeading className="w-1/6">Analysis Date</CustomTableHeading>
            <CustomTableHeading className="w-1/6">Action</CustomTableHeading>
            <CustomTableHeading className="w-1/6">Action</CustomTableHeading>
          </tr>
        </thead>
        <tbody>
          {plots.map((plot) => (
            <CustomRow key={plot.id} plot={plot} />
          ))}
          {!plots.length && (
            <tr>
              <TableCell colSpan={5}>No data to show</TableCell>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

interface CustomRowProps {
  plot: SerializeFrom<typeof loader>['plots'][number];
}
function CustomRow({ plot }: CustomRowProps) {
  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const disabled = isProcessing || !!plot.reportReviewedById;

  return (
    <tr key={plot.id}>
      <TableCell>
        <Link to={AppLinks.Plot(plot.id)} className="text-teal-600 hover:underline">
          {plot.plotNumber}
        </Link>
      </TableCell>
      <TableCell>{plot.reportReviewedById ? 'Reviewed' : 'Not Reviewed'}</TableCell>
      <TableCell>{plot.reportReviewedBy ? getFullName(plot.reportReviewedBy?.firstName, plot.reportReviewedBy?.lastName) : '-'}</TableCell>
      <TableCell>{dayjs(plot.analysisDate).format('DD/MM/YYYY')}</TableCell>
      <TableCell>
        <div className="flex flex-col items-stretch">
          <Link
            to={AppLinks.ReportContent(plot.id, plot.reportTemplateId!)}
            className="bg-stone-100 rounded-md px-4 py-3 text-teal-600 hover:bg-stone-200 flex flex-col justify-center items-center"
          >
            Edit
          </Link>
        </div>
      </TableCell>
      <TableCell>
        <fetcher.Form method="post" className="flex flex-col items-stretch">
          <input type='hidden' {...getNameProp('plotId')} value={plot.id} />
          <button
            type="submit"
            disabled={disabled}
            className={twMerge("bg-stone-100 rounded-md px-4 py-3 text-teal-600", (!!plot.reportReviewedById || !!plot.reportValuedById) && 'text-stone-400')}
          >
            {plot.reportReviewedBy ? 'Already Reviewed' :
              plot.reportValuedById ? 'Sent For Review' :
                isProcessing ? 'Sending...' :
                  'Send For Review'}
          </button>
        </fetcher.Form>
      </TableCell>
    </tr>
  )
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}

export function CustomTableHeading(props: ComponentProps<typeof TableHeading>) {
  const { className, ...rest } = props;
  return <TableHeading className={twMerge('bg-stone-100 rounded-t py-4 border border-stone-300', className)} {...rest} />;
}