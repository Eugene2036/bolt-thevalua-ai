import { ActionArgs, json, redirect, type LoaderArgs } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { badRequest } from 'remix-utils';
import React, { useEffect, useState } from 'react';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { prisma } from '~/db.server';
import { getValidatedId, processBadRequest, StatusCode } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import {
    PurposeOfValuation,
    ValuationKind,
    ValuationType,
} from '~/models/plots.validations';
import { requireUserId } from '~/session.server';

import { SecondaryButton } from '~/components/SecondaryButton';
import { useUser } from '~/utils';
import { getErrorMessage } from '~/models/errors';
import { FormFields, hasFormError } from '~/models/forms';
import { z } from 'zod';
import { ActionContextProvider, useForm, useUpdateState } from '~/components/ActionContextProvider';
import { InlineAlert } from '~/components/InlineAlert';
import { CardHeader } from '~/components/CardHeader';
import { toast } from 'sonner';
import BackButton from '~/components/BackButton';
import { EditInstruction, TransferInstruction } from '~/models/instructions.server';
import { Card } from '~/components/Card';
import NextButton from '~/components/NextButton';
import { delay } from '~/models/dates';
import { TabPanel, TabView } from 'primereact/tabview';
import Chat from '~/components/Chat';
import { FormTextArea } from '~/components/FormTextArea';
import { FormSelect } from '~/components/FormSelect';
import { FormTextField } from '~/components/FormTextField';
import TownNeighborhoodEditMode from '~/components/TownNeighborhoodEditMode';
import { FormPhoneNumberTextField } from '~/components/FormPhoneNumberTextField';

export async function loader({ request, params }: LoaderArgs) {
    console.log("Edit Notification Loader params", params);

    await requireUserId(request);
    const userId = await requireUserId(request);
    const correctNoteId = getValidatedId(params.id);

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
                plot: true,
                attachments: true,
                Message: true,
            }
        });

    const allUsers = await prisma.user
        .findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                UserGroup: {
                    select: {
                        company: {
                            select: {
                                id: true,
                                CompanyName: true,
                            }
                        }
                    }
                }
            },
        });

    const company = await prisma.user
        .findUnique({
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

    const messages = await prisma.message.findMany({
        where: { notificationId: correctNoteId },
        orderBy: { createdAt: 'asc' },
        select: {
            id: true,
            content: true,
            createdAt: true,
            userId: true,
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                }
            },
        },
    });

    console.log("Messages & User: ", messages);

    if (!userId || !correctNoteId) {
        throw new Error('userId and notificationId are required');
    }

    return json({ user, plots, userId, correctNoteId, allUsers, notification, company, messages });
}

const Schema = z
    .object({
        noteId: z.coerce.string().min(1),
        plotNum: z.coerce.string().min(1),
        firstName: z.coerce.string().min(1),
        lastName: z.coerce.string().min(1),
        telephone: z.coerce.string().min(1),
        email: z.coerce.string().min(1),
        neighbourhood: z.coerce.string().min(1),
        location: z.coerce.string().min(1),

        plotExtent: z.coerce.number(),
        classification: z.coerce.string().min(1),
        valuationType: z.coerce.string().min(1),
        titleDeedDate: z.coerce.date(),
        titleDeedNum: z.coerce.string().min(1),
        companyId: z.coerce.string().min(1),
        message: z.coerce.string().min(1),
        messageBody: z.coerce.string(),
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

        declineReason: z.coerce.string(),

        clientType: z.coerce.string().min(1),
        valuationKind: z.coerce.string().min(1),

    });

// Zod schema for message validation
const messageSchema = z.object({
    userId: z.string(),
    content: z.string().min(1, 'Message cannot be empty'),
    notificationId: z.string(),
});

function generateAlphanumericId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 25; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result.toLowerCase();
}

export async function action({ request, params }: ActionArgs) {
    const currentUserId = await requireUserId(request);
    const notificationId = getValidatedId(params.id);

    try {
        // Read the form data once and reuse it
        const formData = await request.formData();
        const actionType = formData.get('actionType');

        if (actionType === 'sendMessage') {
            const userId = formData.get('userId') as string;
            const notificationId = formData.get('notificationId') as string;
            const content = formData.get('content') as string;

            const result = messageSchema.safeParse({ userId, content, notificationId });
            if (!result.success) {
                return json({ errors: result.error.flatten() }, { status: 400 });
            }

            const newMessage = await prisma.message.create({
                data: {
                    userId: result.data.userId,
                    content: result.data.content,
                    notificationId: result.data.notificationId,
                },
            });

            return json({ newMessage });
        } else if (actionType === 'updateNotification') {
            // Convert FormData to a plain object before validating
            const fields: Record<string, any> = {};
            formData.forEach((value, key) => {
                fields[key] = value;
            });

            const result = Schema.safeParse(fields);
            if (!result.success) {
                return processBadRequest(result.error, fields);
            }

            const { noteId, ...restOfData } = result.data;
            await EditInstruction({ noteId: notificationId, ...restOfData }, currentUserId);

        } else if (actionType === 'transferInstruction') {
            console.log("Begin Transfer Instruction Action", notificationId);
            // For transfer, we need to include all the required fields
            const fields = {
                noteId: notificationId,
                plotNum: formData.get('plotNum') as string,
                firstName: formData.get('firstName') as string,
                lastName: formData.get('lastName') as string,
                telephone: formData.get('telephone') as string,
                email: formData.get('email') as string,
                neighbourhood: formData.get('neighbourhood') as string,
                location: formData.get('location') as string,
                plotExtent: Number(formData.get('plotExtent')),
                classification: formData.get('classification') as string,
                valuationType: formData.get('valuationType') as string,
                titleDeedDate: new Date(formData.get('titleDeedDate') as string),
                titleDeedNum: formData.get('titleDeedNum') as string,
                companyId: formData.get('companyId') as string,
                message: formData.get('message') as string,
                messageBody: formData.get('messageBody') as string,
                userId: formData.get('userId') as string,
                createdById: formData.get('createdById') as string,
                approved: formData.get('approved') === 'true',
                approvedById: formData.get('approvedById') as string,
                postalAddress: formData.get('postalAddress') as string,
                postalCode: formData.get('postalCode') as string,
                phyAddress: formData.get('phyAddress') as string,
                companyName: formData.get('companyName') as string,
                position: formData.get('position') as string,
                title: formData.get('title') as string,
                repEmail: formData.get('repEmail') as string,
                repPhone: formData.get('repPhone') as string,
                declineReason: formData.get('declineReason') as string,
                clientType: formData.get('clientType') as string,
            };

            const result = Schema.safeParse(fields);
            if (!result.success) {
                return processBadRequest(result.error, fields);
            }

            const { noteId, ...restOfData } = result.data;
            await TransferInstruction({ noteId: notificationId, ...restOfData }, currentUserId);
            console.log("End Transfer Instruction Action", notificationId);
            toast.success("Insturction sent to " + restOfData.firstName + " " + restOfData.lastName, {
                description: "The instruction has been successfully transferred.",
                duration: 5000,
                style: {
                    background: '#f0fff4',
                    color: '#4ade80',
                },
            });
            await delay(2000);
            return redirect(AppLinks.Instructions);
        }

        return redirect(AppLinks.EditBankNotifications(notificationId));
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}


export default function EditInstructionPage(props: Props) {


    const { user, plots, userId, correctNoteId, allUsers, notification, company, messages } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();
    const { getNameProp, isProcessing } = useForm(fetcher, Schema);

    const currentUser = useUser();
    const { loggedIn, isSuper } = props;
    const updateState = useUpdateState();

    const [selectedUserId, setSelectedUserId] = useState(notification?.userId || '');
    const [selectedCompanyId, setSelectedCompanyId] = useState(notification?.plot.companyId);

    const handleUserIdChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedUserId = event.target.value;
        const selectedUser = allUsers.find(user => user.id === selectedUserId);
        if (selectedUser) {
            setSelectedCompanyId(selectedUser.UserGroup?.company.id);
        }
        setSelectedUserId(selectedUserId);
        updateState('userId', selectedUserId);
    };

    const defaultValues: FormFields<keyof z.infer<typeof Schema>> | undefined = notification
        ? {
            plotNum: notification?.plotNum,
            postalAddress: notification?.postalAddress || '',
            postalCode: notification?.postalCode || '',
            phyAddress: notification?.phyAddress || '',
            neighbourhood: notification?.neighbourhood,
            location: notification?.location,
            email: notification?.email,
            telephone: notification?.telephone,

            classification: notification?.plot.classification,
            valuationType: notification?.plot.valuationType,
            titleDeedDate: notification?.plot.titleDeedDate,
            titleDeedNum: notification?.plot.titleDeedNum,
            companyId: notification?.plot.companyId,

            companyName: notification?.companyName || '',
            position: notification?.position || '',

            firstName: notification?.firstName,
            lastName: notification?.lastName,
            title: notification?.title,
            repEmail: notification?.repEmail || '',
            repPhone: notification?.repPhone || '',

            message: notification?.message || '',
            messageBody: notification?.messageBody || '',
            approved: false,
            valuationKind: notification?.valuationKind,


        }
        : undefined;

    const [plotNum, setPlotNum] = useState(notification?.plotNum || '');
    const [neighbourhood, setNeighbourhood] = useState(notification?.neighbourhood || '');
    const [location, setLocation] = useState(notification?.location || '');
    const [firstName, setFirstName] = useState(notification?.firstName || '');
    const [lastName, setLastName] = useState(notification?.lastName || '');
    const [telephone, setTelephone] = useState(notification?.telephone || '');
    const [email, setEmail] = useState(notification?.email || '');
    const [message, setMessage] = useState(notification?.message || '');
    const [messageBody, setMessageBody] = useState(notification?.messageBody || '');
    const [approved, setApproved] = useState(notification?.approved || false);
    const [approvedById, setApprovedById] = useState(notification?.approvedById || '');
    const [createdById, setCreatedById] = useState(notification?.createdById || '');
    // const [selectedUserId, setSelectedUserId] = useState(notification?.userId || '')


    const titles = ['Mr', 'Mrs', 'Miss', 'Ms', 'Prof', 'Dr', 'Cde'];

    const [classification, setClassification] = useState(notification?.plot.classification);
    const [valuationType, setValuationType] = useState(notification?.plot.valuationType);
    const [titleDeedDate, setTitleDeedDate] = useState(notification?.plot.titleDeedDate);
    const [titleDeedNum, setTitleDeedNum] = useState(notification?.plot.titleDeedNum);
    const [companyId, setCompanyId] = useState(notification?.plot.companyId);

    const [title, setTitle] = useState(notification?.title);

    const [companyName, setCompanyName] = useState(notification?.companyName);
    const [position, setPosition] = useState(notification?.position);

    const [postalAddress, setPostalAddress] = useState(notification?.postalAddress);
    const [postalCode, setPostalCode] = useState(notification?.postalCode);
    const [phyAddress, setPhyAddress] = useState(notification?.phyAddress || '');
    const [repPhone, setRepPhone] = useState(notification?.repPhone || '')
    const [repEmail, setRepEmail] = useState(notification?.repEmail)

    const [clientType, setClientType] = useState(notification?.clientType)
    const [plotExtent, setPlotExtent] = useState(notification?.plot.plotExtent);

    const [declineReason, setDeclineReason] = useState(notification?.declineReason);

    const [valuationKind, setValuationKind] = useState(notification?.valuationKind);

    useEffect(() => {
        if (notification?.userId) {
            setSelectedUserId(notification.userId);
        }
    }, [notification]);

    // SELECTED TOWN AND HEIGHBOURHOOD
    const [selectedTown, setSelectedTown] = useState(location);
    const [selectedNeighborhood, setSelectedNeighborhood] = useState(neighbourhood);

    const handleSelectionChange = (town: any, neighborhood: any) => {
        setSelectedTown(town?.label || null);
        setSelectedNeighborhood(neighborhood?.label || null);

        // You can also access the full objects if needed:
        console.log('Full town object:', town);
        console.log('Full neighborhood object:', neighborhood);
    };

    // Example initial values (these should match your actual data)
    const initialTown = {
        value: '1', // Should match a town ID from your data
        label: selectedTown, // Should match a town name from your data
        neighborhoods: [
            // This should match the actual neighborhoods data for this town
            { id: '101', name: selectedNeighborhood }
        ]
    };

    const initialNeighborhood = {
        value: '101', // Should match a neighborhood ID from your data
        label: selectedNeighborhood // Should match a neighborhood name from your data
    };

    const [activeIndex, setActiveIndex] = useState(2);

    return (
        <div className="grid grid-cols-3 gap-4 p-6 pt-2 bg-gray-50">
            <div className="flex flex-col items-stretch gap-6 col-span-3 pt-2">
                <TabView className="custom-tabview" activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
                    <TabPanel
                        header={
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = AppLinks.BankerAnalytics;
                                }}
                            >
                                Cockpit
                            </span>
                        }
                        className="p-2"
                        headerClassName={`${activeIndex === 0 ? 'active-tab' : 'default-tab'}`}
                    >
                    </TabPanel>
                    <TabPanel
                        header={
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = AppLinks.Instructions;
                                }}
                            >
                                Instructions
                            </span>
                        }
                        className="p-2"
                        headerClassName={`${activeIndex === 1 ? 'active-tab' : 'default-tab'}`}
                    >
                    </TabPanel>

                    <TabPanel header="Editing Instruction" className="p-2" headerClassName={activeIndex === 2 ? 'active-tab' : 'default-tab'}>
                        <fetcher.Form method="post" className="flex flex-col items-stretch gap-6">
                            <ActionContextProvider {...fetcher.data} fields={fetcher.data?.fields || defaultValues} isSubmitting={isProcessing} >
                                <input hidden type="text" {...getNameProp('postalCode')} value="" />
                                <Card>
                                    <CardHeader className="flex flex-col items-center gap-4">
                                        <h2 className="text-xl font-semibold">Client Information</h2>
                                    </CardHeader>
                                    <div className="grid grid-col-1 items-stretch">
                                        <div className="flex flex-col items-stretch p-4">
                                            {clientType !== 'Individual' && (
                                                <div className="flex flex-col items-stretch gap-4">
                                                    <input type="hidden" {...getNameProp('title')} value="" />
                                                    <div className="grid grid-cols-3 gap-6">
                                                        <span className="font-lg font-semibold">Organisation</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-6">
                                                        <FormTextField
                                                            {...getNameProp('companyName')}
                                                            label="Organisation Name"
                                                            defaultValue={notification?.companyName || ''}
                                                            value={companyName!}
                                                            onChange={(e) => setCompanyName(e.target.value)}
                                                            required />
                                                        <FormTextField
                                                            {...getNameProp('postalAddress')}
                                                            defaultValue={notification?.postalAddress!}
                                                            label="Postal Address"
                                                            value={postalAddress!}
                                                            onChange={(e) => setPostalAddress(e.target.value)}
                                                            required />
                                                        <FormTextField
                                                            {...getNameProp('email')} type="email" label="Email"
                                                            defaultValue={notification?.email}
                                                            value={email}
                                                            onChange={(e) => setEmail(e.target.value)}
                                                            required />
                                                        <FormPhoneNumberTextField
                                                            name="telephone"
                                                            label="Phone"
                                                            defaultValue={notification?.telephone}
                                                            value={telephone}
                                                            onChange={(telephone) => setTelephone(telephone)}
                                                            defaultCountry="BW"
                                                            required
                                                        />
                                                    </div>
                                                    <span className="font-lg font-semibold">Representative</span>
                                                    <div className="grid grid-cols-3 gap-6">
                                                        <FormTextField
                                                            {...getNameProp('firstName')}
                                                            defaultValue={notification?.firstName}
                                                            label="First Name"
                                                            value={firstName}
                                                            onChange={(e) => setFirstName(e.target.value)}
                                                            required />
                                                        <FormTextField {...getNameProp('lastName')}
                                                            defaultValue={notification?.lastName}
                                                            label="Last Name"
                                                            value={lastName}
                                                            onChange={(e) => setLastName(e.target.value)}
                                                            required />
                                                        <FormSelect {...getNameProp('title')}
                                                            defaultValue={notification?.title}
                                                            value={title}
                                                            onChange={(e) => setTitle(e.target.value)}
                                                            label="Salutation" required>
                                                            {titles.map((title) => (
                                                                <option key={title}>{title}</option>
                                                            ))}
                                                        </FormSelect>
                                                        <FormTextField
                                                            {...getNameProp('position')}
                                                            defaultValue={notification?.position || ''}
                                                            label="Position"
                                                            value={position!}
                                                            onChange={(e) => setPosition(e.target.value)}
                                                        // required
                                                        />
                                                        <FormTextField
                                                            {...getNameProp('repEmail')}
                                                            defaultValue={notification?.repEmail}
                                                            label="Email"
                                                            value={repEmail}
                                                            onChange={(e) => setRepEmail(e.target.value)}
                                                            required />
                                                        <FormPhoneNumberTextField
                                                            name="repPhone"
                                                            label="Mobile"
                                                            defaultValue={notification?.repPhone}
                                                            value={repPhone}
                                                            onChange={(repPhone) => setRepPhone(repPhone)}
                                                            defaultCountry="BW"
                                                            required
                                                        />

                                                        <input type="text" {...getNameProp('telephone')} value={telephone} hidden />
                                                        <input type="text" {...getNameProp('repPhone')} value={repPhone} hidden />
                                                    </div>

                                                </div>
                                            )}
                                            {clientType === 'Individual' && (
                                                <div className="flex flex-col items-stretch">
                                                    <div className="grid grid-cols-3 gap-6">
                                                        <input type="hidden" {...getNameProp('companyName')} value="" />
                                                        <input type="hidden" {...getNameProp('position')} value="" />
                                                        <input type="hidden" {...getNameProp('repEmail')} value="" />
                                                        <input type="hidden" {...getNameProp('repPhone')} value="" />

                                                        <FormTextField {...getNameProp('firstName')}
                                                            defaultValue={notification?.firstName}
                                                            value={firstName}
                                                            onChange={(e) => setFirstName(e.target.value)}
                                                            label='First Name' required />
                                                        <FormTextField {...getNameProp('lastName')}
                                                            defaultValue={notification?.lastName}
                                                            value={lastName}
                                                            onChange={(e) => setLastName(e.target.value)}
                                                            label="Last Name" required />
                                                        <FormSelect {...getNameProp('title')}
                                                            defaultValue={notification?.title}
                                                            value={title}
                                                            onChange={(e) => setTitle(e.target.value)}
                                                            label="Salutation" required>
                                                            {titles.map((title) => (
                                                                <option key={title}>{title}</option>
                                                            ))}
                                                        </FormSelect>
                                                        <FormTextField
                                                            {...getNameProp('postalAddress')}
                                                            defaultValue={notification?.postalAddress!}
                                                            value={postalAddress!}
                                                            onChange={(e) => setPostalAddress(e.target.value)}
                                                            label="Postal Address"
                                                        />
                                                        <FormTextField
                                                            {...getNameProp('postalCode')}
                                                            defaultValue={notification?.postalCode!}
                                                            value={postalCode!}
                                                            onChange={(e) => setPostalCode(e.target.value)}
                                                            label="Postal Code"
                                                        />
                                                        <FormPhoneNumberTextField
                                                            name=""
                                                            label="Phone"
                                                            defaultValue={notification?.telephone}
                                                            value={telephone}
                                                            onChange={(telephone) => setTelephone(telephone)}
                                                            defaultCountry="BW"
                                                            required
                                                        />
                                                        <FormTextField
                                                            {...getNameProp('email')}
                                                            type="email"
                                                            label="Email"
                                                            defaultValue={notification?.email}
                                                            value={email}
                                                            onChange={(e) => setEmail(e.target.value)}
                                                            required />
                                                        <FormTextField
                                                            {...getNameProp('phyAddress')}
                                                            defaultValue={notification?.phyAddress!}
                                                            hidden
                                                            value={plotNum + ' ' + neighbourhood + ' ' + location}
                                                            onChange={(e) => setPhyAddress(e.target.value)}
                                                            required
                                                        />
                                                        <input type="text" {...getNameProp('telephone')} value={telephone} hidden />
                                                    </div>
                                                </div>
                                            )}
                                            {hasFormError(fetcher.data) && <InlineAlert>{fetcher.data.formError}</InlineAlert>}
                                        </div>
                                    </div>
                                    <div className="grid grid-col-1 items-stretch p-4">
                                        <Card className="grid grid-cols-1 p-4">
                                            <CardHeader className="flex flex-col items-center gap-10">
                                                <h2 className="text-l  font-semibold">Property Details</h2>
                                            </CardHeader>
                                            <div className="grid grid-cols-3 gap-6">
                                                <FormTextField
                                                    {...getNameProp('plotNum')}
                                                    label="Plot Number"
                                                    value={plotNum}
                                                    onChange={(e) => setPlotNum(e.target.value)}
                                                    required />
                                                <FormTextField
                                                    {...getNameProp('plotExtent')}
                                                    label="Plot Size (sqm)"
                                                    required
                                                    value={plotExtent}
                                                    onChange={(e) => setPlotExtent(e.target.value)}
                                                />
                                                <TownNeighborhoodEditMode initialTown={initialTown} initialNeighborhood={initialNeighborhood} onSelectionChange={handleSelectionChange} />
                                                <FormSelect
                                                    {...getNameProp('message')}
                                                    label="Purpose of Valuation"
                                                    value={message}
                                                    required
                                                    onChange={(e) => setMessage(e.target.value as PurposeOfValuation)}
                                                >
                                                    <option value={PurposeOfValuation.Forecolsure}>{PurposeOfValuation.Forecolsure}</option>
                                                    <option value={PurposeOfValuation.NewMortgageApplication}>{PurposeOfValuation.NewMortgageApplication}</option>
                                                    <option value={PurposeOfValuation.MortgageReview}>{PurposeOfValuation.MortgageReview}</option>
                                                    <option value={PurposeOfValuation.Refinancing}>{PurposeOfValuation.Refinancing}</option>
                                                </FormSelect>


                                                <div className="grid grid-cols-2 rounded-lg px-0 gap-2">
                                                    <div className="flex flex-col">
                                                        <FormSelect
                                                            {...getNameProp('valuationType')}
                                                            label="Select Property Type"
                                                            value={valuationType}
                                                            onChange={(e) => setValuationType(e.target.value as ValuationType)}
                                                        >
                                                            <option value={ValuationType.Residential}>{ValuationType.Residential}</option>
                                                            <option value={ValuationType.Commercial}>{ValuationType.Commercial}</option>
                                                        </FormSelect>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <FormSelect
                                                            {...getNameProp('valuationKind')}
                                                            label="Select Valuation Type"
                                                            value={valuationKind}
                                                            onChange={(e) => setValuationKind(e.target.value as ValuationKind)}
                                                        >
                                                            <option value={ValuationKind.Normal}>{ValuationKind.Normal}</option>
                                                            <option value={ValuationKind.Desktop}>{ValuationKind.Desktop}</option>
                                                        </FormSelect>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 rounded-lg px-0 gap-2">
                                                    <div className="flex flex-col">
                                                        <FormTextField
                                                            {...getNameProp('titleDeedNum')}
                                                            label="Title Deed Number"
                                                            value={titleDeedNum!}
                                                            onChange={(e) => setTitleDeedNum(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <FormTextField
                                                            label="Title Deed Date"
                                                            type="date"
                                                            {...getNameProp('titleDeedDate')}
                                                            value={titleDeedDate ? new Date(titleDeedDate).toISOString().split('T')[0] : ''}
                                                            onChange={(e) => setTitleDeedDate(e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <FormSelect
                                                    {...getNameProp('userId')}
                                                    label="Select Recipient"
                                                    onChange={handleUserIdChange}
                                                    value={selectedUserId}
                                                >
                                                    <option key={'xxx'} value={'yyy'}>
                                                        -- Select a recipient --
                                                    </option>
                                                    {allUsers.map(group => (
                                                        <option key={group.id} value={group.id}>
                                                            {group.UserGroup?.company.CompanyName + ' - ' + group.firstName + ' ' + group.lastName}
                                                        </option>
                                                    ))}
                                                </FormSelect>
                                                <FormTextArea
                                                    {...getNameProp('messageBody')}
                                                    label="Additional Information (optional)"
                                                    value={messageBody}
                                                    onChange={(e) => setMessageBody(e.target.value)}
                                                />
                                                <FormTextArea
                                                    {...getNameProp('declineReason')}
                                                    label="Decline Reason"
                                                    value={declineReason || ''}
                                                    onChange={(e) => setDeclineReason(e.target.value)}
                                                    disabled
                                                    className="cursor-not-allowed bg-stone-100"
                                                />

                                                <FormTextField {...getNameProp('neighbourhood')} hidden value={selectedNeighborhood} onChange={(e) => setNeighbourhood(e.target.value)} required />
                                                <FormTextField {...getNameProp('location')} hidden value={selectedTown} onChange={(e) => setLocation(e.target.value)} required />
                                                <input hidden type="text" {...getNameProp('createdById')} defaultValue={currentUser.id} />
                                                <input hidden type="checkbox" {...getNameProp('approved')} defaultChecked={false} />
                                                <input hidden type="text" {...getNameProp('approvedById')} defaultValue={currentUser.id} />
                                                <input hidden type="text" {...getNameProp('companyId')} value={selectedCompanyId || ''} />
                                                <input hidden type="text" {...getNameProp('clientType')} value={clientType} />
                                                <input type="text" {...getNameProp('classification')} hidden value={valuationType} onChange={(e) => setClassification(e.target.value)} />
                                                <input type="hidden" name="actionType" value="updateNotification" />

                                            </div>
                                        </Card>
                                    </div>
                                    <CardHeader className="flex flex-row items-center gap-4" topBorder>
                                        <BackButton />
                                        <div className="grow" />
                                        {notification?.accepted === 'Declined' && (
                                            <SecondaryButton
                                                type="button" // Changed from type="submit" to prevent form submission
                                                onClick={() => {
                                                    setActiveIndex(0);
                                                    // Collect all form data
                                                    const formData = new FormData();
                                                    formData.append('actionType', 'transferInstruction');
                                                    formData.append('noteId', correctNoteId);
                                                    formData.append('plotNum', plotNum);
                                                    formData.append('firstName', firstName);
                                                    formData.append('lastName', lastName);
                                                    formData.append('telephone', telephone);
                                                    formData.append('email', email);
                                                    formData.append('neighbourhood', selectedNeighborhood);
                                                    formData.append('location', selectedTown);
                                                    formData.append('plotExtent', plotExtent?.toString() || '');
                                                    formData.append('classification', classification || '');
                                                    formData.append('valuationType', valuationType || '');
                                                    formData.append('titleDeedDate', titleDeedDate || '');
                                                    formData.append('titleDeedNum', titleDeedNum || '');
                                                    formData.append('companyId', selectedCompanyId || '');
                                                    formData.append('message', message);
                                                    formData.append('messageBody', messageBody);
                                                    formData.append('userId', selectedUserId);
                                                    formData.append('createdById', currentUser.id);
                                                    formData.append('approved', 'false');
                                                    formData.append('approvedById', currentUser.id);
                                                    formData.append('postalAddress', postalAddress || '');
                                                    formData.append('postalCode', postalCode || '');
                                                    formData.append('phyAddress', phyAddress || '');
                                                    formData.append('companyName', companyName || '');
                                                    formData.append('position', position || '');
                                                    formData.append('title', title || '');
                                                    formData.append('repEmail', repEmail || '');
                                                    formData.append('repPhone', repPhone || '');
                                                    formData.append('declineReason', declineReason || '');
                                                    formData.append('clientType', clientType || '');

                                                    fetcher.submit(formData, { method: 'post' });
                                                }}
                                            >
                                                Transfer Instruction
                                            </SecondaryButton>
                                        )}

                                        <NextButton type="submit" isProcessing={isProcessing} />
                                    </CardHeader>
                                </Card>
                            </ActionContextProvider>
                        </fetcher.Form>
                        <Chat
                            userId={userId}
                            notificationId={correctNoteId}
                            initialMessages={messages}
                        />
                    </TabPanel>
                    <TabPanel
                        header={
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = AppLinks.ValuationReports;
                                }}
                            >
                                Valuation Reports
                            </span>
                        }
                        className="p-2"
                        headerClassName={`${activeIndex === 3 ? 'active-tab' : 'default-tab'}`}
                    >
                    </TabPanel>

                </TabView>
            </div>
        </div>
    );
}

export function ErrorBoundary() {
    return <RouteErrorBoundary />;
}