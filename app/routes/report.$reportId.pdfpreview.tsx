import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

import { RouteErrorBoundary } from '~/components/Boundaries';
import CloudinaryPDFPreview from '~/components/CloudinaryPDFPreview';
import { useUser } from '~/utils';

export async function loader({ params }: LoaderArgs) {

  const reportId = params.reportId;
  if (!reportId) {
    throw new Error('Report ID is required');
  }
  return json({ reportId });
}


export default function PDFpreviewPage() {
  const { reportId } = useLoaderData<typeof loader>();
  const currentUser = useUser();
  const publicId = 'valuation_reports/' + reportId;

  return (
    <div className="flex flex-col items-stretch gap-0 p-0">
      <div className='min-w-full'>
        <CloudinaryPDFPreview publicId={publicId}
          width="100%"
          height="100vh"
          className="valuation-report-preview" />
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
