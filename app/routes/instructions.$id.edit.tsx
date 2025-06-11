import { ActionArgs, json, redirect, type LoaderArgs } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { badRequest } from 'remix-utils';
import { useState } from 'react';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { prisma } from '~/db.server';
import { getValidatedId, processBadRequest, safeJsonParse, StatusCode } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import {
    createdByType,
    ValuationType,
} from '~/models/plots.validations';
import { requireUserId } from '~/session.server';

import { SecondaryButton } from '~/components/SecondaryButton';
import { useUser } from '~/utils';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { FormFields, getRawFormFields, hasFieldErrors, hasFormError } from '~/models/forms';
import { z } from 'zod';
import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { InlineAlert } from '~/components/InlineAlert';
import { CardHeader } from '~/components/CardHeader';
import BackButton from '~/components/BackButton';
import { Card } from '~/components/Card';
import { AddMultipleDocuments } from '~/components/AddMultipleDocuments';
import { FilePreview } from '~/components/FilePreview';
import { TabPanel, TabView } from 'primereact/tabview';

export async function loader({ request, params }: LoaderArgs) {
    console.log("List of Params: ", params);

    console.log("before param")
    const correctNoteId = getValidatedId(params.id);
    console.log("after param", correctNoteId);

    await requireUserId(request);
    const userId = await requireUserId(request);



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
            select: {
                noteId: true,
                createdAt: true,
                createdById: true,
                updatedAt: true,
                plotNum: true,
                message: true,
                messageBody: true,
                approved: true,
                approvedById: true,
                approvedDate: true,
                accepted: true,
                userId: true,
                acceptedDate: true,
                plotId: true,
                clientType: true,
                companyName: true,
                email: true,
                firstName: true,
                lastName: true,
                phyAddress: true,
                position: true,
                postalAddress: true,
                postalCode: true,
                repEmail: true,
                repPhone: true,
                telephone: true,
                title: true,
                declineReason: true,
                location: true,
                neighbourhood: true,
                declaration: true,
                attachments: true,
                user: true,
            }
        });

    console.log("New Notification Record 2: ", notification);

    const allUsers = await prisma.user.findMany({
        select: {
            id: true,
            firstName: true,
            lastName: true,
        },
    });

    return json({ user, plots, userId, correctNoteId, allUsers, notification });
}

interface Props {
    loggedIn: boolean;
    isSuper: boolean;
}

const Schema = z.object({
    fileNames: z.preprocess(safeJsonParse, z.array(z.string())),
    fileTypes: z.preprocess(safeJsonParse, z.array(z.string())),
    fileUrls: z.preprocess(safeJsonParse, z.array(z.string())),
});

export const action = async ({ params, request }: ActionArgs) => {
    const currentUserId = await requireUserId(request);
    console.log("Parama list:", params);

    const noteId = getValidatedId(params.id);

    try {
        const fields = await getRawFormFields(request);
        const result = Schema.safeParse(fields);
        if (!result.success) {
            return processBadRequest(result.error, fields);
        }
        const { fileUrls, fileTypes, fileNames } = result.data;

        console.log("Attachment Records:", fileUrls, fileTypes, fileNames);

        if (!fileUrls.length) {
            return badRequest({ formError: 'Provide attachments of the asset' });
        }

        const notification = await prisma.notification.findUnique({
            where: { noteId: noteId },
        });
        if (!notification) {
            throw new Error('Notification record not found');
        }

        await prisma.$transaction(async (tx) => {
            await tx.attachment.deleteMany({
                where: {
                    notificationId: noteId,
                    createdBy: createdByType.Instructor
                },
            });

            await tx.attachment.createMany({
                data: fileUrls.map((fileUrl, index) => ({
                    fileName: fileNames[index],
                    fileUrl: fileUrls[index],
                    fileType: fileTypes[index],
                    notificationId: noteId,
                })),
            });

            const attachments = await tx.attachment.findMany({
                where: { notificationId: noteId },
            });

            await tx.event.createMany({
                data: attachments.map((attachment) => ({
                    userId: currentUserId,
                    domain: EventDomain.Image,
                    action: EventAction.Create,
                    recordId: attachment.id,
                    recordData: JSON.stringify(attachment),
                })),
            });
        });

        return redirect(AppLinks.Instructions);
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
};

export default function CreateInstructionPage(props: Props) {
    const { plots, user, notification, correctNoteId } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();
    const { getNameProp, isProcessing } = useForm(fetcher, Schema);

    const currentUser = useUser();
    const { loggedIn, isSuper } = props;

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

    // Upload documents to Cloudinary
    const [fileNames, setFileNames] = useState<string[]>(notification?.attachments.map((attachment) => attachment.fileName) || []);
    const [fileUrls, setFileUrls] = useState<string[]>(notification?.attachments.map((fileUrl) => fileUrl.fileUrl) || []);
    const [fileTypes, setFileTypes] = useState<string[]>(notification?.attachments.map((fileType) => fileType.fileType) || []);

    const getFileType = (fileName: string): 'image' | 'document' | 'pdf' => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        if (extension === 'pdf') {
            return 'pdf';
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
            return 'image';
        } else {
            return 'document';
        }
    };

    const addDocuments = (fileNames: string[], fileUrls: string[], fileTypes: string[]) => {
        const mappedFileTypes = fileNames.map((fileName) => getFileType(fileName)); // Map file types
        setFileNames((prevState) => [...prevState, ...fileNames]);
        setFileUrls((prevState) => [...prevState, ...fileUrls]);
        setFileTypes((prevState) => [...prevState, ...mappedFileTypes]); // Use mapped file types
    };

    const removeDocuments = (fileUrl: string) => {
        const index = fileUrls.indexOf(fileUrl);
        setFileNames((prevState) => prevState.filter((_, i) => i !== index));
        setFileUrls((prevState) => prevState.filter((id) => id !== fileUrl));
        setFileTypes((prevState) => prevState.filter((_, i) => i !== index));
    };

    const defaultValues: FormFields<keyof z.infer<typeof Schema>> = {
        fileNames: JSON.stringify(notification?.attachments.map((attachment) => attachment.fileName)),
        fileUrls: JSON.stringify(notification?.attachments.map((attachment) => attachment.fileUrl)),
        fileTypes: JSON.stringify(notification?.attachments.map((attachment) => attachment.fileType)),
    };

    const [plotNum, setPlotNum] = useState(notification?.plotNum);
    const [firstName, setFirstName] = useState(notification?.firstName);
    const [lastName, setLastName] = useState(notification?.lastName);
    const [telephone, setTelephone] = useState(notification?.telephone);
    const [repPhone, setRepPhone] = useState(notification?.repPhone);
    const [message, setMessage] = useState(notification?.message);
    const [messageBody, setMessageBody] = useState(notification?.messageBody);

    const imagesError = (() => {
        if (!hasFieldErrors(fetcher.data)) {
            return undefined;
        }
        const fieldError = fetcher.data.fieldErrors[getNameProp('fileUrls').name];
        if (!fieldError) {
            return undefined;
        }
        return fieldError.join(', ');
    })();

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

                    <TabPanel header="Creating Instruction" className="p-2" headerClassName={activeIndex === 2 ? 'active-tab' : 'default-tab'}>
                        <div className='min-w-full'>
                            <fetcher.Form method="post" className="flex flex-col items-stretch w-[100%] gap-2">
                                <ActionContextProvider {...fetcher.data} fields={fetcher.data?.fields || defaultValues} isSubmitting={isProcessing}>
                                    <Card>
                                        <CardHeader className="flex flex-col items-center gap-10">
                                            <h2 className="text-xl font-semibold">Add Attachments</h2>
                                        </CardHeader>
                                        <div className="font-light flex flex-row items-center gap-4 border-b border-b-stone-400  p-4">
                                            <div className='grid grid-cols-1 gap-6 py-4 w-full'>
                                                <div className='grid grid-cols-2 gap-6 py-4 w-full'>
                                                    <label className="grid grid-cols-2 items-center">
                                                        <div className='flex flex-row items-left font-semibold'>Contact Person</div>
                                                        <div className='flex flex-row items-left'>{String(firstName + ' ' + lastName)}</div>
                                                    </label>
                                                    <label className="grid grid-cols-2 items-center">
                                                        <div className='flex flex-row items-left font-semibold'>Phone</div>
                                                        <div className='flex flex-row items-left'>{String(telephone + ', ' + repPhone)}</div>
                                                    </label>
                                                    <label className="grid grid-cols-2 items-center">
                                                        <div className='flex flex-row items-left font-semibold'>Plot Number</div>
                                                        <div className='flex flex-row items-left'>{String(plotNum)}</div>
                                                    </label>
                                                    <label className="grid grid-cols-2 items-center">
                                                        <div className='flex flex-row items-left font-semibold'>Message</div>
                                                        <div className='flex flex-row items-left'>{String(message)}<br />{String(messageBody)}</div>
                                                    </label>
                                                </div>
                                                <input type="hidden" {...getNameProp('fileNames')} value={JSON.stringify(fileNames)} />
                                                <input type="hidden" {...getNameProp('fileUrls')} value={JSON.stringify(fileUrls)} />
                                                <input type="hidden" {...getNameProp('fileTypes')} value={JSON.stringify(fileTypes)} />
                                                <div className='grid grid-cols-1 gap-6 py-4 w-full'>
                                                    <Card>
                                                        <div className="flex flex-col items-stretch col-span-6 gap-2 p-2">
                                                            <div className="grid grid-cols-4 gap-4">
                                                                {fileUrls.map((fileUrl, index) => (
                                                                    <FilePreview
                                                                        key={fileUrl}
                                                                        fileId={fileUrl}
                                                                        removeFile={() => removeDocuments(fileUrl)}
                                                                        fileType={getFileType(fileNames[index])} // Use the helper function here
                                                                        fileName={fileNames[index]}
                                                                    />
                                                                ))}
                                                                {/* <AddMultipleDocuments
                                                                handleUploadedFiles={(fileNames, fileUrls, fileTypes) => {
                                                                    setFileNames((prev) => [...prev, ...fileNames]);
                                                                    setFileUrls((prev) => [...prev, ...fileUrls]);
                                                                    setFileTypes((prev) => [...prev, ...fileTypes]);
                                                                }}
                                                            /> */}
                                                            </div>
                                                            <div className='grid grid-cols-2 gap-4'>
                                                                <AddMultipleDocuments
                                                                    handleUploadedFiles={(fileNames, fileUrls, fileTypes) => {
                                                                        setFileNames((prev) => [...prev, ...fileNames]);
                                                                        setFileUrls((prev) => [...prev, ...fileUrls]);
                                                                        setFileTypes((prev) => [...prev, ...fileTypes]);
                                                                    }}
                                                                />
                                                            </div>
                                                            {!!imagesError && <InlineAlert>{imagesError}</InlineAlert>}
                                                        </div>
                                                    </Card>
                                                </div>
                                                <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                                </div>
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
                                            <SecondaryButton type="submit" isIcon disabled={isProcessing} >
                                                {isProcessing ? 'Sending Instruction...' : 'Send Instruction'}
                                            </SecondaryButton>
                                        </CardHeader>
                                    </div>
                                </ActionContextProvider>
                            </fetcher.Form>
                        </div >
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