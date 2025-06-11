import type { LoaderArgs } from '@remix-run/node';

import { Outlet, useLoaderData } from '@remix-run/react';
import { twMerge } from 'tailwind-merge';

import { RouteErrorBoundary } from '~/components/Boundaries';
import { CenteredView } from '~/components/CenteredView';
import { Toolbar } from '~/components/Toolbar';
import { requireUserId } from '~/session.server';
import { useUser } from '~/utils';

export async function loader({ request }: LoaderArgs) {
    await requireUserId(request);
    return null;
}

export default function ReportTemplatesPage() {
    useLoaderData<typeof loader>();
    const user = useUser();

    return (
        <div className="flex h-screen flex-col items-stretch">
            <Toolbar currentUserName={user.email} isSuper={user.isSuper} isBanker={user.isBanker} isSignatory={user.isSignatory} />
            <div className="flex grow flex-row items-stretch pt-6">
                <CenteredView className="w-full" innerProps={{ className: twMerge('h-full') }}>
                    <div className="flex grow flex-col items-stretch rounded-lg bg-white p-0">
                        <Outlet />
                    </div>
                </CenteredView>
            </div>
        </div>
    );
}

export function ErrorBoundary() {
    return <RouteErrorBoundary />;
}

