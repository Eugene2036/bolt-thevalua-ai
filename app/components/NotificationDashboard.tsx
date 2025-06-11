import { ActionArgs, json, LoaderArgs, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import React, { useEffect, useState } from 'react';
import { prisma } from '~/db.server';
import { badRequest, getValidatedId, processBadRequest } from '~/models/core.validations';
import { requireUserId } from '~/session.server';
import { useUser } from '~/utils';
import dayjs from 'dayjs';
import { CustomTableHeading } from '~/routes/dashboard';
import { TableCell } from './TableCell';
import { SecondaryButton } from './SecondaryButton';
import { ActionContextProvider, useDisabled, useForm } from './ActionContextProvider';
import { EventAction, EventDomain } from '~/models/events';
import { getErrorMessage } from '~/models/errors';
import { AppLinks } from '~/models/links';
import { getRawFormFields, hasFormError } from '~/models/forms';
import { z } from 'zod';
import Checkbox from '@mui/material/Checkbox';
import { InlineAlert } from './InlineAlert';

export const loader = async ({ request }: LoaderArgs) => {
    const currentUserId = await requireUserId(request);

    const notificationData = await prisma.notification.findMany({
        where: { userId: currentUserId },
        select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            message: true,
            accepted: true,
            approved: true,
            approvedById: true,
            attachments: true,
        }
    })
    console.log("Notification Data 1:", notificationData);
    return json({ notificationData });
};

const Schema = z
    .object({
        accepted: z.coerce.boolean(),
    });

export async function action({ request, params }: ActionArgs) {

    const currentUserId = await requireUserId(request);
    // const { usergroup, compID } = useLoaderData<typeof loader>();

    try {
        const id = getValidatedId(params.id);
        const fields = await getRawFormFields(request);
        const result = Schema.safeParse(fields);
        if (!result.success) {
            return processBadRequest(result.error, fields);
        }
        const { accepted } = result.data;

        await prisma.$transaction(async (tx) => {

            const updated = await tx.notification.update({
                where: { id },
                data: {
                    accepted
                },
            });
            await tx.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.Notification,
                    action: EventAction.Update,
                    recordId: updated.id,
                    recordData: JSON.stringify(updated),
                },
            });
        });

        return redirect(AppLinks.UserProfile(currentUserId));
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}

const NotificationDashboard: React.FC = () => {
    // Use the loader data
    const { notificationData } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();
    const { isProcessing, getNameProp } = useForm(fetcher, Schema);

    const currentUser = useUser();
    const disabled = useDisabled();

    const defaultValues: Record<keyof z.infer<typeof Schema>, boolean | string> = {
        accepted: Boolean(notificationData.accepted),
    };

    const [accepted, setAccepted] = useState(notificationData.accepted);
    // Initialize state with an empty array as default value
    const [notifications, setNotifications] = useState(notificationData || []);

    console.log('Current User ID:', currentUser.id);

    useEffect(() => {
        const fetchNotifications = async () => {
            const data = await prisma.notification.findMany({
                where: { userId: currentUser.id },
                include: { attachments: true }
            });
            setNotifications(data);
            console.log("Notification Data 2:", data);
        };
        fetchNotifications();
    }, []);

    function getAction(index: string): string {
        alert('Your response is: ' + index)
        throw new Error('Function not implemented.');
    }

    return (
        <div className='min-w-full'>
            <fetcher.Form method="post" className="flex flex-col items-stretch w-[100%] gap-4">
                <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
                    <h1 className='text-rose-500'>You have {notifications.length} Notifications</h1>

                    <table className="min-w-full items-stretch" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <CustomTableHeading>Message</CustomTableHeading>
                                <CustomTableHeading>Received</CustomTableHeading>
                                <CustomTableHeading>Updated</CustomTableHeading>
                                <CustomTableHeading>Download</CustomTableHeading>
                                <CustomTableHeading>Accept?</CustomTableHeading>
                            </tr>
                        </thead>
                        <tbody className='font-thin'>
                            {notifications.map((row, index) => (
                                <tr key={index}>
                                    <TableCell>{row.message}</TableCell>
                                    <TableCell className='text-right'>{dayjs(row.createdAt).format('DD/MM/YYYY')}</TableCell>
                                    <TableCell className='text-right'>{dayjs(row.updatedAt).format('DD/MM/YYYY')}</TableCell>
                                    <TableCell>
                                        <ul>
                                            {row.attachments.map(attachment => (
                                                <li key={attachment.id}>
                                                    <a href={attachment.fileUrl} download={attachment.fileName}>
                                                        {attachment.fileName}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </TableCell>
                                    <TableCell className='p-2'>
                                        <Checkbox style={{ padding: '0px' }}
                                            {...getNameProp('accepted')}
                                            color="secondary"
                                            defaultChecked={accepted}
                                            value={Boolean(accepted)} onChange={(e) => setAccepted(e.target.checked)}
                                        />
                                    </TableCell>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {hasFormError(fetcher.data) && (
                        <div className="flex flex-col items-stretch py-4">
                            <InlineAlert>{fetcher.data.formError}</InlineAlert>
                        </div>
                    )}
                    <div className="flex flex-col items-end py-0">
                        <SecondaryButton type="submit" disabled={isProcessing}>
                            {isProcessing ? 'Updating Notifications...' : 'Update Notification'}
                        </SecondaryButton>
                    </div>
                </ActionContextProvider>
            </fetcher.Form>
        </div >
    );
};

export default NotificationDashboard;