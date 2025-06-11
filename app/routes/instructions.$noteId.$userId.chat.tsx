import { ActionArgs, json, redirect, type LoaderArgs } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { badRequest, ClientOnly } from 'remix-utils';
import { useState } from 'react';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { CustomGaugeChart } from '~/components/CustomGaugeChart';
import GraphTitle from '~/components/GraphTitle';
import { PrimaryButtonLink } from '~/components/PrimaryButton';
import { prisma } from '~/db.server';
import { usePagination } from '~/hooks/usePagination';
import { getValidatedId, processBadRequest, StatusCode } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import {
    ValuationType,
} from '~/models/plots.validations';
import { requireUserId } from '~/session.server';

import { ProfilePicFront } from '~/components/ProfilePicFront';
import { useUser } from '~/utils';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields, hasFormError } from '~/models/forms';
import { z } from 'zod';
import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { InlineAlert } from '~/components/InlineAlert';
import { CardHeader } from '~/components/CardHeader';
import BackButton from '~/components/BackButton';
import { Select } from '~/components/Select';
import { TextField } from '~/components/TextField';
import { TextArea } from '~/components/TextArea';
import { CreateInstruction } from '~/models/instructions.server';
import { Card } from '~/components/Card';
import NextButton from '~/components/NextButton';
import { delay } from '~/models/dates';

export async function loader({ request, params }: LoaderArgs) {
    console.log("List of params: ", params);
    const noteID = getValidatedId(params.noteId);

    await requireUserId(request);
    const userId = await requireUserId(request);
    console.log("before")
    const correctNoteId = getValidatedId(params.id);
    console.log("after: ", correctNoteId);


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

    const notification = await prisma.notification
        .findFirst({
            where: { noteId: correctNoteId },
            include: {
                attachments: true, Message: true,
            }
        })
    // .then((notification) => {
    //     if (!notification) {
    //         return undefined;
    //     }
    // })

    console.log("New Notification Record 3: ", notification);

    const allUsers = await prisma.user.findMany({
        select: {
            id: true,
            firstName: true,
            lastName: true,
        },
    });

    const company = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
            UserGroup: {
                include: {
                    company: {
                        select: {
                            id: true,
                            CompanyName: true,
                        }
                    }
                },
            },
        },
    });

    return json({ user, plots, userId, correctNoteId, allUsers, notification, company });
}


interface Props {
    loggedIn: boolean;
    isSuper: boolean;
}

const Schema = z
    .object({
        noteId: z.coerce.string().min(1),
        plotNum: z.coerce.string().min(1),
        plotExtent: z.coerce.number(),
        classification: z.coerce.string().min(1),
        valuationType: z.coerce.string().min(1),
        titleDeedDate: z.coerce.date(),
        titleDeedNum: z.coerce.string().min(1),
        companyId: z.coerce.string().min(1),
        firstName: z.coerce.string().min(1),
        lastName: z.coerce.string().min(1),
        email: z.coerce.string().min(1),
        telephone: z.coerce.string().min(1),
        neighbourhood: z.coerce.string().min(1),
        location: z.coerce.string().min(1),
        message: z.coerce.string().min(1),
        messageBody: z.coerce.string().min(1),
        userId: z.coerce.string().min(1),
        createdById: z.coerce.string().min(1),
        approved: z.coerce.boolean().default(false),
        approvedById: z.coerce.string().min(1),

        postalAddress: z.coerce.string(),
        postalCode: z.coerce.string(),
        phyAddress: z.coerce.string(),

        companyName: z.coerce.string(),
        position: z.coerce.string(),

        title: z.coerce.string(),
        repEmail: z.coerce.string(),
        repPhone: z.coerce.string(),

        clientType: z.coerce.string().min(1),
    });

function generateAlphanumericId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 25; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result.toLowerCase();
}

export async function action({ request }: ActionArgs) {
    const currentUserId = await requireUserId(request);

    try {
        const newNoteId = generateAlphanumericId();
        console.log("New Notification ID: ", newNoteId);

        const fields = await getRawFormFields(request);
        const result = Schema.safeParse(fields);
        if (!result.success) {
            return processBadRequest(result.error, fields);
        }

        const { noteId, approved, ...restOfData } = result.data;
        CreateInstruction({ noteId: newNoteId, approved: true, ...restOfData }, currentUserId);
        delay(5000);
        return redirect(AppLinks.EditInstructions(newNoteId));
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}

export default function CreateInstructionPage(props: Props) {
    const { user, plots, userId, correctNoteId, allUsers, notification, company } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();
    const { getNameProp, isProcessing } = useForm(fetcher, Schema);

    const currentUser = useUser();
    const { loggedIn, isSuper } = props;

    // console.log('Current User Profile:', user.id + ' ' + user.firstName);

    const numValuations = plots.length;
    const numResidential = plots.filter((p) => p.valuationType === ValuationType.Residential).length;
    const numCommercial = plots.filter((p) => p.valuationType === ValuationType.Commercial).length;
    const lastAction = plots.length ? plots.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0].updatedAt : undefined;

    const perc = user.target ? numValuations / user.target : 0;

    const gridItems: [string, string | number][] = [
        ['Valuations', numValuations],
        ['Residential', numResidential],
        ['Commercial', numCommercial],
        ['Last Action', lastAction ? dayjs(lastAction).format('DD/MM/YYYY HH:mm') : ''],
    ];

    const { pageSize, handlePageSizeChange, currentPage, numPages, paginatedRecords, toFirstPage, toLastPage, toNextPage, toPreviousPage } = usePagination(plots);

    const [plotNum, setPlotNum] = useState(notification?.plotNum);
    const [firstName, setFirstName] = useState(notification?.firstName);
    const [lastName, setLastName] = useState(notification?.lastName);
    const [email, setEmail] = useState(notification?.email);
    const [telephone, setTelephone] = useState(notification?.telephone);
    const [neighbourhood, setNeighbourhood] = useState(notification?.neighbourhood);
    const [location, setLocation] = useState(notification?.location);
    const [message, setMessage] = useState(notification?.message);
    const [messageBody, setMessageBody] = useState(notification?.messageBody);
    const [approved, setApproved] = useState(notification?.approved);
    const [approvedById, setApprovedById] = useState(notification?.approvedById);
    const [createdById, setCreatedById] = useState(notification?.createdById);

    return (
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
                <div className="flex flex-row items-center gap-6 border-b border-b-stone-400 pb-2">
                    <div className='min-w-full'>

                        <fetcher.Form method="post" className="flex flex-col items-stretch w-[100%] gap-2">
                            <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>

                                <Card>
                                    <CardHeader className="flex flex-col items-center gap-10">
                                        <h2 className="text-xl font-semibold">Edit Valuation Instruction</h2>
                                    </CardHeader>

                                    <div className="font-light flex flex-row items-center gap-6 p-4 border-b border-b-stone-400 pb-2">
                                        <div className='grid grid-cols-2 gap-6 py-4 w-full'>
                                            <TextField
                                                {...getNameProp('firstName')}
                                                label="First Name"
                                                required
                                                value={String(firstName)} onChange={(e) => setFirstName(e.target.value)}
                                            />
                                            <TextField
                                                {...getNameProp('lastName')}
                                                label="Last Name"
                                                required
                                                value={String(lastName)} onChange={(e) => setLastName(e.target.value)}
                                            />
                                            <TextField
                                                {...getNameProp('email')}
                                                label="Email"
                                                required
                                                value={String(email)} onChange={(e) => setEmail(e.target.value)}
                                            />
                                            <TextField
                                                {...getNameProp('telephone')}
                                                label="Phone"
                                                required
                                                value={String(telephone)} onChange={(e) => setTelephone(e.target.value)}
                                            />
                                            <TextField
                                                {...getNameProp('plotNum')}
                                                label="Plot Number"
                                                required
                                                value={String(plotNum)} onChange={(e) => setPlotNum(e.target.value)}
                                            />
                                            <TextField
                                                {...getNameProp('neighbourhood')}
                                                label="Neighbourhood"
                                                required
                                                value={String(neighbourhood)} onChange={(e) => setNeighbourhood(e.target.value)}
                                            />
                                            <TextField
                                                {...getNameProp('location')}
                                                label="Location"
                                                required
                                                value={String(location)} onChange={(e) => setLocation(e.target.value)}
                                            />
                                            <TextField
                                                {...getNameProp('message')}
                                                label="Purpose of Valuation"
                                                required
                                                value={String(message)} onChange={(e) => setMessage(e.target.value)}
                                            />
                                            <TextArea
                                                {...getNameProp('messageBody')}
                                                label="Additional Information (optional)"
                                                value={String(messageBody)} onChange={(e) => setMessageBody(e.target.value)}
                                            />
                                            <Select
                                                {...getNameProp('userId')}
                                                label="Select Recipient"
                                            >
                                                {allUsers.map(group => (
                                                    <option key={group.id} value={group.id}>
                                                        {group.firstName + ' ' + group.lastName}
                                                    </option>
                                                ))}
                                            </Select>

                                            <input hidden type="text" {...getNameProp('createdById')} defaultValue={user.id} />
                                            <input hidden type="checkbox" {...getNameProp('approved')} defaultChecked={approved} />
                                            <input hidden type="text" {...getNameProp('approvedById')} defaultValue={user.id} />
                                            <input hidden type="text" {...getNameProp('companyId')} defaultValue={company?.id} />
                                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                            </div>
                                        </div>
                                        <div className='grid grid-cols-2 gap-6 py-4 w-full'>
                                            {/* <Chat notificationId={notification?.noteId!} userId={notification?.userId!} initialMessages={notification?.Message!} ></Chat> */}
                                        </div>
                                    </div>
                                </Card>


                                {hasFormError(fetcher.data) && (
                                    <div className="flex flex-col items-stretch py-4">
                                        <InlineAlert>{fetcher.data.formError}</InlineAlert>
                                    </div>
                                )}
                                <div className="flex flex-row items-stretch py-0">
                                    <CardHeader className="flex flex-row items-center gap-4 p-0 w-full">
                                        <BackButton />
                                        <div className="grow" />
                                        <NextButton isProcessing={false} type="submit" disabled={isProcessing} />
                                    </CardHeader>
                                </div>
                            </ActionContextProvider>
                        </fetcher.Form>
                    </div >
                </div>
            </div>
        </div>
    );
}

export function ErrorBoundary() {
    return <RouteErrorBoundary />;
}

