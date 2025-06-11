import { ActionArgs, json, LoaderArgs, redirect } from '@remix-run/node';
import React, { useState } from 'react';
import { prisma } from '~/db.server';
import { PrimaryButton, PrimaryButtonLink } from './PrimaryButton';
import { badRequest, getValidatedId, processBadRequest, StatusCode } from '~/models/core.validations';
import { z } from 'zod';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { AppLinks } from '~/models/links';
import { ClientOnly } from 'remix-utils';
import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { InlineAlert } from '~/components/InlineAlert';
import { SecondaryButtonLink } from '~/components/SecondaryButton';
import GraphTitle from '~/components/GraphTitle';
import { CustomGaugeChart } from '~/components/CustomGaugeChart';
import dayjs from 'dayjs';
import { requireUserId } from '~/session.server';
import { getRawFormFields, hasFieldErrors, hasFields, hasFormError } from '~/models/forms';
import { ProfilePicFront } from './ProfilePicFront';
import { Select } from '~/components/Select';
import { getErrorMessage } from '~/models/errors';
import UploadAttachments from './UploadAttachments';
import { CreateNotification } from '~/models/notifications.server';

export async function loader({ request, params }: LoaderArgs) {
    await requireUserId(request);
    const userId = getValidatedId(params.id);
    const [user, plots] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.plot
            .findMany({
                where: { valuedById: userId },
                include: {
                    valuers: true,
                    tenants: true,
                    parkingRecords: true,
                    outgoingRecords: true,
                    insuranceRecords: true,
                    grcRecords: true,
                    storedValues: true,
                    grcFeeRecords: true,
                    mvRecords: true,
                    grcDeprRecords: true,
                    company: true,
                },
            })
            .then((plots) => {
                return plots.map((plot) => {
                    return {
                        ...plot,
                        undevelopedPortion: Number(plot.undevelopedPortion),
                        rateForUndevelopedPortion: Number(plot.rateForUndevelopedPortion),
                        plotExtent: Number(plot.plotExtent),
                        tenants: plot.tenants.map((tenant) => ({
                            ...tenant,
                            startDate: dayjs(tenant.startDate).format('YYYY-MM-DD'),
                            endDate: dayjs(tenant.endDate).format('YYYY-MM-DD'),
                            remMonths: dayjs(tenant.endDate).diff(dayjs(), 'month'),
                            grossMonthlyRental: Number(tenant.grossMonthlyRental),
                            escalation: Number(tenant.escalation),
                            areaPerClient: Number(tenant.areaPerClient),
                            areaPerMarket: Number(tenant.areaPerMarket),
                            ratePerMarket: Number(tenant.ratePerMarket),
                        })),
                        parkingRecords: plot.parkingRecords.map((record) => ({
                            ...record,
                            ratePerClient: Number(record.ratePerClient),
                            ratePerMarket: Number(record.ratePerMarket),
                        })),
                        outgoingRecords: plot.outgoingRecords
                            .sort((a, b) => {
                                const sortOrder: Record<string, number> = {
                                    '12': 1,
                                    '1': 2,
                                    '%': 3,
                                } as const;
                                return sortOrder[a.itemType || '12'] - sortOrder[b.itemType || '12'];
                            })
                            .map((record) => ({
                                ...record,
                                itemType: record.itemType || undefined,
                                unitPerClient: Number(record.unitPerClient),
                                ratePerClient: Number(record.ratePerClient),
                                ratePerMarket: Number(record.ratePerMarket),
                            })),
                        insuranceRecords: plot.insuranceRecords.map((record) => ({
                            ...record,
                            rate: Number(record.rate),
                            area: Number(record.area),
                        })),
                        grcRecords: plot.grcRecords.map((record) => ({
                            ...record,
                            bull: record.bull || false,
                            size: Number(record.size),
                            rate: Number(record.rate),
                        })),
                        grcFeeRecords: plot.grcFeeRecords.map((record) => ({
                            ...record,
                            perc: Number(record.perc),
                        })),
                        mvRecords: plot.mvRecords.map((record) => ({
                            ...record,
                            size: Number(record.size),
                            // date: dayjs(record.date).format('YYYY-MM-DD'),
                            price: Number(record.price),
                        })),
                        grcDeprRecords: (() => {
                            const records = plot.grcDeprRecords.map((record) => ({
                                ...record,
                                perc: Number(record.perc),
                            }));
                            if (records.length) {
                                return records;
                            }
                            return [{ id: '', identifier: '', perc: 0 }];
                        })(),
                    };
                });
            }),
    ]);
    if (!user) {
        throw new Response('User record not found', {
            status: StatusCode.NotFound,
        });
    }

    //     const id = getValidatedId(params.id);
    //   const company = await prisma.user.findUnique({
    //     where: { id: id },
    //     include: {
    //       UserGroup: {
    //         include: {
    //           company: {
    //             select: {
    //               id: true,
    //               CompanyName: true,
    //             }
    //           }
    //         },
    //       },
    //     },
    //   });

    //   const userGroups = await prisma.userGroup.findMany({ where: { companyId: company?.UserGroup?.company.id } });

    //   console.log('User Groups: ', userGroups)

    const users = await prisma.user.findMany({
        select: {
            id: true,
            firstName: true,
            lastName: true,
        },
    });

    console.log('All Users: ', users);

    const notifications = await prisma.notification.findMany({
        select: {
            id: true,
            message: true,
            userId: true,
            updatedAt: true,
            createdAt: true
        },
    });

    return json({ users, user, plots, userId, notifications });
}

const NotificationSchema = z
    .object({
        message: z.string(),
        userId: z.string(),
        attachments: z.array(z.object({
            fileName: z.string(),
            fileUrl: z.string(),
            notificationId: z.string(),
        })),
    });

export { NotificationSchema };

export async function action({ request }: ActionArgs) {
    const currentUserId = await requireUserId(request);
    try {
        const fields = await getRawFormFields(request);
        const result = NotificationSchema.safeParse(fields);

        console.log('USER ID: ' + currentUserId)
        console.log('RESULT VALUE: ' + result.error)

        if (!result.success) {
            return processBadRequest(result.error, fields);
        }

        const { message, userId, attachments } = result.data;
        await CreateNotification({ Message: message, UserId: userId }, currentUserId);

        return redirect(AppLinks.UserProfile(currentUserId));
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}

const AdminInterface: React.FC = () => {
    const { users, user, plots, userId, notifications } = useLoaderData<typeof loader>();
    const [message, setMessage] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);

    const fetcher = useFetcher<typeof action>();
    const { isProcessing, getNameProp } = useForm(fetcher, NotificationSchema);

    const numValuations = plots.length;

    const perc = user.target ? numValuations / user.target : 0;

    const defaultValues: Record<keyof z.infer<typeof NotificationSchema>, string> = {
        message: '',
        userId: '',
        attachments: ''
    };

    const handleSendNotification = async () => {
        const notification = await prisma.notification.create({
            data: {
                message,
                user: { connect: { id: userId } }, // Example user
                attachments: {
                    create: attachments.map(file => ({
                        fileName: file.name,
                        fileUrl: URL.createObjectURL(file) // Placeholder for file upload logic
                    }))
                }
            }
        });

        console.log('Notification sent:', notification);
    };

    return (
        <fetcher.Form method="post" className="flex flex-col items-stretch w-[60%]">
            <ActionContextProvider {...fetcher.data} fields={hasFields(fetcher.data) ? fetcher.data.fields : defaultValues} isSubmitting={isProcessing}>
                <div className="grid grid-cols-4 gap-6">
                    <div className="flex flex-col items-center gap-6">
                        <GraphTitle className="items-start pt-6">Dashboard</GraphTitle>
                        <ProfilePicFront imageId={user.profilePic!} removeImage={function (): null {
                            throw new Error('Function not implemented.');
                        }} />
                        <GraphTitle className="items-start pt-6">Valuer Performance</GraphTitle>
                        <ClientOnly fallback={<span>Loading...</span>}>{() => <CustomGaugeChart perc={perc} />}</ClientOnly>
                        <div className="flex flex-col justify-center items-center py-4">
                            <PrimaryButtonLink to={AppLinks.DashboardValuers}>Back To Valuers Table</PrimaryButtonLink>
                        </div>
                    </div>
                    <div className="flex flex-col items-stretch gap-6 col-span-3 pt-6">
                        <div className="font-light flex flex-row items-center gap-6 border-b border-b-stone-400 pb-2">
                            <span>
                                Name: <span className="font-semibold">{[user.firstName, user.lastName].join(' ')}</span>
                            </span>
                            <span>|</span>
                            <span>
                                Email: <span className="font-semibold">{user.email}</span>
                            </span>
                            <span>|</span>
                            <span>
                                Tel: <span className="font-semibold">{user.phone || '-'}</span>
                            </span>
                            <span>|</span>
                            <span>
                                <SecondaryButtonLink className='flex items-stretch' to={AppLinks.EditUserProfileDetails(user.id)}>Edit Profile</SecondaryButtonLink>
                            </span>
                            <span>
                                <SecondaryButtonLink className='flex items-stretch' to={AppLinks.Notifications}>Manage Notifications</SecondaryButtonLink>
                            </span>
                        </div>
                        <div className="font-light flex flex-row items-center gap-6 border-b border-b-stone-400 pb-2">
                            <div>
                                <textarea
                                    // {...getNameProp('message')}
                                    name='message'
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Notification message"
                                />
                                <input
                                    // {...getNameProp(AttachmentSchema)}
                                    type="file"
                                    multiple
                                    onChange={(e) => setAttachments(Array.from(e.target.files))}
                                />
                                <UploadAttachments />
                                <Select
                                    // {...getNameProp('userId')}
                                    name='userId'
                                    defaultValue={user.userGroupId}
                                    label="Select User"
                                    errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['userId'] : undefined}
                                >
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.firstName + ' ' + user.lastName}
                                        </option>
                                    ))}
                                </Select>

                                <button onClick={handleSendNotification}>Send Notification</button>
                            </div>
                        </div>
                    </div>
                    {hasFormError(fetcher.data) && (
                        <div className="flex flex-col items-stretch py-4">
                            <InlineAlert>{fetcher.data.formError}</InlineAlert>
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-stretch py-4">
                    <PrimaryButton type="submit" disabled={isProcessing}>
                        {isProcessing ? 'Updating User...' : 'Update User'}
                    </PrimaryButton>
                </div>
            </ActionContextProvider>
        </fetcher.Form >
    );
};


export default AdminInterface;