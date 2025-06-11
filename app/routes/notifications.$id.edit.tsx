import { ActionArgs, json, redirect, type LoaderArgs } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { badRequest } from 'remix-utils';
import { useEffect, useMemo, useState } from 'react';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { PrimaryButton } from '~/components/PrimaryButton';
import { prisma } from '~/db.server';
import { usePagination } from '~/hooks/usePagination';
import { getValidatedId, processBadRequest, safeJsonParse, StatusCode } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import {
    createdByType,
    InstructionResponse,
    ValuationType,
} from '~/models/plots.validations';
import { requireUserId } from '~/session.server';

import { SecondaryButton } from '~/components/SecondaryButton';
import { useUser } from '~/utils';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields, hasFormError } from '~/models/forms';
import { z } from 'zod';
import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { InlineAlert } from '~/components/InlineAlert';
import { CardHeader } from '~/components/CardHeader';
import { Toaster, toast } from 'sonner';
import BackButton from '~/components/BackButton';
import { TextField } from '~/components/TextField';
import { TextArea } from '~/components/TextArea';
import { Card } from '~/components/Card';
import { TabPanel, TabView } from 'primereact/tabview';
import { Check, ChevronDown, ChevronUp } from 'tabler-icons-react';
import { sendVerificationEmail } from '~/models/emails.server';
import { faker } from '@faker-js/faker';
import Chat from '~/components/Chat';
import { FilePreview } from '~/components/FilePreview';
import { AddMultipleDocumentsValuer } from '~/components/AddMultipleDocumentsValuer';
import { useForm as useForm1 } from '~/components/ActionContextProvider';
import { FormSelect } from '~/components/FormSelect';
import { Env } from '~/models/environment';

export async function loader({ request, params }: LoaderArgs) {
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
                plot: true,
                attachments: {
                    select: {
                        id: true,
                        fileName: true,
                        fileType: true,
                        fileUrl: true,
                    }, where: { createdBy: 'Instructor' }
                },
                user: true,
            }
        });

    const valuerAttachments = await prisma.attachment.findMany({
        where: { notificationId: correctNoteId, createdBy: 'Valuer' },
    });

    const allUsers = await prisma.user.findMany({
        select: {
            id: true,
            firstName: true,
            lastName: true,
        },
    });

    const companyId = await prisma.user.findFirst({
        where: { id: userId },
        include: {
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
        }
    });

    // Then get all users in the same company
    const usersDelegates = await prisma.user.findMany({
        where: {
            UserGroup: {
                company: {
                    id: companyId?.UserGroup?.company.id,
                }
            },
        },
        include: {
            UserGroup: {
                include: {
                    company: {
                        select: {
                            CompanyName: true,
                        },
                    },
                },
            },
        },
    });

    const url = new URL(request.url);

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

    if (!userId || !correctNoteId) {
        throw new Error('userId and notificationId are required');
    }

    return json({ user, plots, userId, correctNoteId, allUsers, notification, messages, valuerAttachments, usersDelegates });
}

interface Props {
    loggedIn: boolean;
    isSuper: boolean;
}

const Schema = z
    .object({
        plotNum: z.coerce.string().min(1),
        firstName: z.coerce.string().min(1),
        lastName: z.coerce.string().min(1),
        email: z.coerce.string().email(),
        telephone: z.coerce.string().optional(),
        neighbourhood: z.coerce.string().min(1),
        location: z.coerce.string().min(1),
        message: z.coerce.string().optional(),
        accepted: z.coerce.string().optional(),
        declineReason: z.coerce.string().optional(),
    });

// Zod schema for message validation
const messageSchema = z.object({
    userId: z.string(),
    content: z.string().min(1, 'Message cannot be empty'),
    notificationId: z.string(),
});

const SchemaAttachments = z.object({
    fileNames: z.preprocess(safeJsonParse, z.array(z.string())),
    fileTypes: z.preprocess(safeJsonParse, z.array(z.string())),
    fileUrls: z.preprocess(safeJsonParse, z.array(z.string())),
});

const SchemaDelegate = z.object({
    noteId: z.coerce.string().min(1),
    userId: z.coerce.string().min(1),
});

export const action = async ({ params, request }: ActionArgs) => {
    const currentUserId = await requireUserId(request);
    const noteId = getValidatedId(params.id);
    try {
        // Parse formData once
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
            // Extract fields before processing
            const fields = Object.fromEntries(formData.entries());
            const result = Schema.safeParse(fields);
            console.log("Update Notification Fields: ", fields);
            console.log("User ID: ", currentUserId);
            console.log("Note ID: ", noteId);
            console.log("Result: ", result);

            if (!result.success) {
                console.error("Validation failed:", result.error.errors); // Log specific validation errors
                console.error("Invalid fields:", fields); // Log the fields that failed validation
                return processBadRequest(result.error, fields);
            }

            const { plotNum, firstName, lastName, email, telephone, neighbourhood, location, accepted, declineReason } = result.data;

            console.log('Notification Schema: ', result.data);

            const notification = await prisma.notification.findUnique({
                where: { noteId: noteId },
            });
            if (!notification) {
                throw new Error('Notification record not found');
            }

            const usrEmail = await prisma.notification.findFirst({
                where: { noteId, userId: currentUserId },
                select: {
                    user: {
                        select: {
                            email: true,
                            UserGroup: {
                                select: {
                                    company: {
                                        select: {
                                            CompanyName: true,
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            await prisma.$transaction(async (tx) => {
                console.log('BEGIN TRANSACTION');
                const currentDate = new Date();

                const updated = await tx.notification.update({
                    where: { noteId: noteId },
                    data: {
                        plotNum,
                        neighbourhood,
                        location,
                        firstName,
                        lastName,
                        email,
                        telephone,
                        accepted,
                        declineReason,
                        declaration: accepted === 'Accepted' ? true : false,
                        acceptedDate: currentDate,
                    }
                });

                console.log('Updated Notification:', updated);

                await tx.event.create({
                    data: {
                        userId: currentUserId,
                        domain: EventDomain.Notification,
                        action: EventAction.Update,
                        recordId: noteId,
                        recordData: JSON.stringify({ from: notification, to: updated }),
                    },
                });

                console.log('TRANSACTION COMPLETED');
                toast.success("Instruction updated for plot " + plotNum);

                // const verToken = faker.string.uuid();
                // const clientEmail = await sendVerificationEmail(usrEmail?.user.email!, verToken, 'cm87qkxz800d9o47t0spuqozv', '', '', plotNum, '', '', usrEmail?.user.UserGroup?.company.CompanyName, '');
                // if (clientEmail) {
                //     return clientEmail;
                // }
            });

            return redirect(AppLinks.UserProfile(currentUserId));

        } else if (actionType === 'uploadValuerAttachments') {
            console.log("Begin uploadValuerAttachments");

            const currentUserId = await requireUserId(request);
            const noteId = getValidatedId(params.id);

            const fields = Object.fromEntries(formData.entries());
            const result = SchemaAttachments.safeParse(fields);

            if (!result.success) {
                return processBadRequest(result.error, fields);
            }
            const { fileNames, fileTypes, fileUrls } = result.data;

            if (!fileUrls.length) {
                return badRequest({ formError: 'Provide attachments of the asset' });
            }

            // Validate arrays have same length
            if (fileUrls.length !== fileTypes.length || fileUrls.length !== fileNames.length) {
                return badRequest({ formError: 'Mismatch in attachment data arrays' });
            }

            const notification = await prisma.notification.findUnique({
                where: { noteId: noteId },
            });
            if (!notification) {
                throw new Error('Notification record not found');
            }

            await prisma.$transaction(async (tx) => {
                // Delete existing valuer attachments
                await tx.attachment.deleteMany({
                    where: {
                        notificationId: noteId,
                        createdBy: createdByType.Valuer
                    },
                });

                // Prepare attachment data
                const attachmentsData = fileUrls.map((fileUrl, index) => ({
                    fileName: fileNames[index],
                    fileUrl: fileUrl,
                    fileType: fileTypes[index],
                    notificationId: noteId,
                    createdBy: createdByType.Valuer,
                }));

                console.log("Prepared Attachment Data:", attachmentsData);

                // Create new attachments
                await tx.attachment.createMany({
                    data: attachmentsData,
                    skipDuplicates: true, // Optional safety measure
                });

                // Get created attachments
                const attachments = await tx.attachment.findMany({
                    where: {
                        notificationId: noteId,
                        createdBy: createdByType.Valuer
                    },
                });

                // Create events for each attachment
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

            return redirect(AppLinks.EditNotifications(noteId));
            // return redirect(AppLinks.UserProfile(currentUserId));
        } else if (actionType === 'delegateInstruction') {
            const fields = Object.fromEntries(formData.entries());
            const result = SchemaDelegate.safeParse(fields);

            if (!result.success) {
                return processBadRequest(result.error, fields);
            }

            const { noteId, userId } = result.data;
            console.log("delegateInstruction fields", fields);

            const notification = await prisma.notification.findUnique({
                where: { noteId: noteId },
            });
            if (!notification) {
                throw new Error('Notification record not found');
            }

            await prisma.$transaction(async (tx) => {
                console.log('BEGIN DELEGATION');

                const updated = await tx.notification.create({
                    data: {
                        createdById: notification.createdById,
                        plotNum: notification.plotNum,
                        message: notification.message,
                        messageBody: notification.messageBody,
                        approved: true,
                        approvedById: notification.approvedById,
                        approvedDate: notification.approvedDate,
                        accepted: "Unread",
                        userId: userId,
                        plotId: notification.plotId,
                        clientType: notification.clientType,
                        companyName: notification.companyName,
                        email: notification.email,
                        firstName: notification.firstName,
                        lastName: notification.lastName,
                        phyAddress: notification.phyAddress,
                        position: notification.position,
                        postalAddress: notification.postalAddress,
                        postalCode: notification.postalCode,
                        repEmail: notification.repEmail,
                        repPhone: notification.repPhone,
                        title: notification.title,
                        location: notification.location,
                        neighbourhood: notification.neighbourhood,
                        declaration: notification.declaration,
                        valuationKind: notification.valuationKind,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        delegated: true,
                    }
                });

                const originalAttachments = await prisma.attachment.findMany({
                    where: {
                        notificationId: noteId,
                        createdBy: createdByType.Instructor,
                    },
                });
                console.log("Original Attachments: ", originalAttachments);

                if (originalAttachments.length > 0) {
                    await tx.attachment.createMany({
                        data: originalAttachments.map(att => ({
                            fileName: att.fileName,
                            fileUrl: att.fileUrl,
                            fileType: att.fileType,
                            notificationId: updated.noteId,
                            createdBy: att.createdBy,
                        })),
                    });
                }

                const combinedAttachments = await prisma.attachment.findMany({
                    where: {
                        notificationId: updated.noteId,
                    },
                });
                console.log("Combined Attachments", combinedAttachments.length);

                // Update valuedById, valuer for the newly delegated plot
                await tx.plot.update({
                    where: { id: notification.plotId },
                    data: {
                        userId,
                        valuer: userId,
                    }
                });

                await tx.event.create({
                    data: {
                        userId: currentUserId,
                        domain: EventDomain.Notification,
                        action: EventAction.Update,
                        recordId: noteId,
                        recordData: JSON.stringify({ from: notification, to: updated }),
                    },
                });
                const verToken = faker.string.uuid();

                const usrEmail = await prisma.user.findFirst({
                    where: { id: userId },
                    select: {
                        email: true,
                        firstName: true,
                        lastName: true,
                        UserGroup: {
                            select: {
                                company: {
                                    select: {
                                        CompanyName: true,
                                    }
                                }
                            }
                        }
                    }
                });

                if (!usrEmail || !usrEmail.email) {
                    throw new Error('User email not found');
                }
                // Send email to the delegate valuer
                const err = await sendVerificationEmail(usrEmail?.email, verToken, 'cm9zuahehe179obogbabkul7a', usrEmail.firstName + ' ' + usrEmail.lastName, '', notification.plotNum, Env.INSTANCE_URL + '/notifications/' + noteId + '/edit', notification.repPhone || notification.telephone, 'Supervisor', usrEmail?.UserGroup?.company.CompanyName);
                if (err) {
                    throw err;
                }
                console.log('COMPLETED DELEGATION');
            });

            return redirect(AppLinks.UserProfile(currentUserId));

        }

        else {
            return badRequest({ formError: 'Invalid action type' });
        }
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
};


export default function EditInstructionPage(props: Props) {
    const { user, plots, userId, correctNoteId, allUsers, notification, messages, valuerAttachments, usersDelegates } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();

    const { getNameProp, isProcessing } = useForm(fetcher, Schema);
    const { getNameProp: getNameProp1, isProcessing: isProcessing1 } = useForm1(fetcher, SchemaAttachments);
    const { getNameProp: getNameProp2, isProcessing: isProcessing2 } = useForm(fetcher, SchemaDelegate);

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

    const { pageSize, handlePageSizeChange, currentPage, numPages, paginatedRecords, toFirstPage, toLastPage, toNextPage, toPreviousPage } = usePagination(plots);

    // Upload documents to Cloudinary
    const [fileNames, setFileNames] = useState<string[]>(notification?.attachments.map((attachment) => attachment.fileName) || []);
    const [fileUrls, setFileUrls] = useState<string[]>(notification?.attachments.map((fileUrl) => fileUrl.fileUrl) || []);
    const [fileTypes, setFileTypes] = useState<string[]>(notification?.attachments.map((fileType) => fileType.fileType) || []);

    const [fileNames1, setFileNames1] = useState<string[]>(valuerAttachments?.map((fileName1) => fileName1.fileName) || []);
    const [fileUrls1, setFileUrls1] = useState<string[]>(valuerAttachments?.map((fileUrl1) => fileUrl1.fileUrl) || []);
    const [fileTypes1, setFileTypes1] = useState<string[]>(valuerAttachments?.map((fileType1) => fileType1.fileType) || []);
    const [createdBy, setCreatedBy] = useState<string[]>(valuerAttachments?.map((createdBy1) => createdBy1.createdBy) || []);

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

    const defaultValues: Record<keyof z.infer<typeof Schema>, boolean | string | undefined> = {
        plotNum: notification?.plotNum,
        firstName: notification?.firstName,
        lastName: notification?.lastName,
        email: notification?.email,
        telephone: notification?.telephone,
        neighbourhood: notification?.neighbourhood,
        location: notification?.location,
        message: notification?.message,
        accepted: notification?.accepted,
        declineReason: notification?.declineReason!,
    };

    const [plotNum, setPlotNum] = useState(notification?.plotNum);
    const [firstName, setFirstName] = useState(notification?.firstName);
    const [lastName, setLastName] = useState(notification?.lastName);
    const [email, setEmail] = useState(notification?.email);
    const [telephone, setTelephone] = useState(notification?.telephone);
    const [neighbourhood, setNeighbourhood] = useState(notification?.neighbourhood);
    const [location, setLocation] = useState(notification?.location);
    const [message, setMessage] = useState(notification?.message);
    const [messageBody, setMessageBody] = useState(notification?.messageBody);
    const [accepted, setAccepted] = useState(notification?.accepted);
    const [declineReason, setDeclineReason] = useState(notification?.declineReason);
    const [showDeclineReasonPopup, setShowDeclineReasonPopup] = useState(false);
    const [showDeclarationPopup, setShowDeclarationPopup] = useState(false);
    const [showValuerAttachmentsPopup, setShowValuerAttachmentsPopup] = useState(false);
    const [showDelegationPopup, setShowDelegationPopup] = useState(false);

    const [isFadingOut, setIsFadingOut] = useState(false);

    const options = [InstructionResponse.Accept, InstructionResponse.Decline];

    const [plotSize, setPlotSize] = useState(notification?.plot.plotExtent);
    const [titleDeedNum, setTitleDeedNumber] = useState(notification?.plot.titleDeedNum);
    const [titleDeedDate, setTitleDeedDate] = useState(notification?.plot.titleDeedDate);
    const [valuationType, setValuationType] = useState(notification?.plot.classification);
    const [clientType, setClientType] = useState(notification?.clientType);

    useEffect(() => {
        if (notification) {
            setAccepted(notification.accepted);
        }
    }, [notification]);

    const handleDeclineClick = () => {
        setShowDeclineReasonPopup(true);
    };

    const handleClosePopup = () => {
        setIsFadingOut(true);
        setTimeout(() => {
            setShowDeclineReasonPopup(false);
            setIsFadingOut(false);
        }, 300); // Match the duration of the fade-out animation
    };

    const handleDeclineReasonSubmit = async ({ params, request }: ActionArgs) => {
        const currentUserId = await requireUserId(request);
        const noteId = getValidatedId(params.id);
        const userId = getValidatedId(params.userId);
        setShowDeclineReasonPopup(false);

        try {

            const fields = await getRawFormFields(request);
            const result = Schema.safeParse(fields);
            if (!result.success) {
                return processBadRequest(result.error, fields);
            }
            const { plotNum, firstName, lastName, email, telephone, neighbourhood, location, accepted, declineReason } = result.data;

            console.log('Notification Schema: ', result.data);

            const notification = await prisma.notification.findUnique({
                where: { noteId: noteId },
                include: { plot: true }
            });
            if (!notification) {
                throw new Error('Notification record not found');
            }

            await prisma.$transaction(async (tx) => {

                console.log('bBEGIN TRANSACTION')
                const updated = await tx.notification.update({
                    where: { noteId: noteId },
                    data: {
                        plotNum,
                        firstName,
                        lastName,
                        email,
                        telephone,
                        neighbourhood,
                        location,
                        accepted,
                        declineReason,
                    }
                });
                await tx.event.create({
                    data: {
                        userId: currentUserId,
                        domain: EventDomain.Notification,
                        action: EventAction.Update,
                        recordId: noteId,
                        recordData: JSON.stringify({ from: notification, to: updated }),
                    },
                });

                console.log('TRANSACTION COMPLETED')
                toast.success("Instruction updated successfully");
                // Send email to the banker user
                const usrEmail = await prisma.user.findFirst({
                    where: { id: userId },
                    select: {
                        email: true,
                        firstName: true,
                        lastName: true,
                        UserGroup: {
                            select: {
                                company: {
                                    select: {
                                        CompanyName: true,
                                    }
                                }
                            }
                        }
                    }
                });

                // email, token, transactionId, valuerName, clientName, plotNumber, urlLink, contactPhone, senderCompany, valuerCompany, declineReason
                const verToken = faker.string.uuid();
                const err = await sendVerificationEmail(usrEmail?.email!, verToken, 'cm8ahq0cu039nm8hu162gdfhi', usrEmail?.firstName + ' ' + usrEmail?.lastName, '', plotNum, process.env.WEB_URL + 'notifications/' + notification.noteId + '/edit', '', '', usrEmail?.UserGroup?.company.CompanyName, updated.declineReason!);

                if (err) {
                    return err;
                }
            });

            return redirect(AppLinks.UserProfile(currentUserId));
        } catch (error) {
            return badRequest({ formError: getErrorMessage(error) });
        }
    };

    // Handle Declaration PopUp
    useEffect(() => {
        if (notification) {
            setAccepted(notification.accepted);
        }
    }, [notification]);

    const handleValuerAttachmentsClick = () => {
        setShowValuerAttachmentsPopup(true);
    };
    const handleCloseValuerAttachmentPopup = () => {
        setIsFadingOut(true);
        setTimeout(() => {
            setShowValuerAttachmentsPopup(false);
            setIsFadingOut(false);
        }, 300);
    };

    const handleDeclarationClick = () => {
        setShowDeclarationPopup(true);
    };
    const handleCloseDeclarationPopup = () => {
        setIsFadingOut(true);
        setTimeout(() => {
            setShowDeclarationPopup(false);
            setIsFadingOut(false);
        }, 300); // Match the duration of the fade-out animation
    };

    const handleDelegationClick = () => {
        setShowDelegationPopup(true);
    };
    const handleCloseDelegationPopup = () => {
        setIsFadingOut(true);
        setTimeout(() => {
            setShowDelegationPopup(false);
            setIsFadingOut(false);
        }, 300);
    };

    const [activeIndex, setActiveIndex] = useState(0);
    const [open, setOpen] = useState(false);
    const [acceptedDec, setAcceptedDec] = useState(false);

    const decl = useMemo(() => {
        return 'We confirm that we do not have any pecuniary interest that would conflict with the proper valuation of the subject property';
    }, []);

    return (
        <div className="grid grid-cols-3 gap-6 p-3 bg-gray-50">
            <div className="flex flex-col items-stretch gap-6 col-span-3 pt-3">
                <div className="flex flex-row items-center gap-6 border-b border-b-stone-400 pb-2">
                    <div className='min-w-full'>
                        <fetcher.Form method="post" className="flex flex-col items-stretch w-[100%] gap-2">
                            <ActionContextProvider
                                {...fetcher.data}
                                fields={('fields' in (fetcher.data ?? {}) && (fetcher.data as any).fields) ? (fetcher.data as any).fields : defaultValues}
                                isSubmitting={isProcessing}
                            >
                                <TabView className="custom-tabview" activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
                                    <TabPanel header="Instruction" className="p-4" headerClassName={activeIndex === 0 ? 'active-tab' : 'default-tab'}>
                                        <Card className="flex flex-col items-stretch gap-2 pt-0 px-2">
                                            <CardHeader className="flex flex-row items-center gap-4 p-2 w-full">
                                                <h1 className=' text-l font-bold'>Instruction Details</h1>
                                            </CardHeader>
                                            <div className="font-light flex flex-row items-center gap-4 border-b border-b-stone-400  p-4">
                                                <div className='grid grid-cols-2 gap-6 py-4 w-full'>
                                                    <label className="grid grid-cols-2 items-center">
                                                        <div className='flex flex-row items-left font-semibold'>Plot Number</div>
                                                        <div className='flex flex-row items-left'>{plotNum}</div>
                                                    </label>
                                                    <label className="grid grid-cols-2 items-center">
                                                        <div className='flex flex-row items-left font-semibold'>Plot Size</div>
                                                        <div className='flex flex-row items-left'>{plotSize} m<sup>2</sup></div>
                                                    </label>
                                                    <label className="grid grid-cols-2 items-center">
                                                        <div className='flex flex-row items-left font-semibold'>Title Deed Number</div>
                                                        <div className='flex flex-row items-left'>{titleDeedNum!}</div>
                                                    </label>
                                                    <label className="grid grid-cols-2 items-center">
                                                        <div className='flex flex-row items-left font-semibold'>Title Deed Date</div>
                                                        <div className='flex flex-row items-left'>{dayjs(titleDeedDate!).format('DD/MM/YYYY')}</div>
                                                    </label>
                                                    <label className="grid grid-cols-2 items-center">
                                                        <div className='flex flex-row items-left font-semibold'>Property Type</div>
                                                        <div className='flex flex-row items-left'>{String(valuationType)}</div>
                                                    </label>
                                                    <label className="grid grid-cols-2 items-center">
                                                        <div className='flex flex-row items-left font-semibold'>Client Type</div>
                                                        <div className='flex flex-row items-left'>{String(clientType)}</div>
                                                    </label>
                                                    <label className="grid grid-cols-2 items-center">
                                                        <div className='flex flex-row items-left font-semibold'>Contact Person</div>
                                                        <div className='flex flex-row items-left'>{firstName} {lastName}</div>
                                                    </label>
                                                    <label className="grid grid-cols-2 items-center">
                                                        <div className='flex flex-row items-left font-semibold'>Phone</div>
                                                        <div className='flex flex-row items-left'>{telephone}</div>
                                                    </label>
                                                    <label className="grid grid-cols-2 items-center">
                                                        <div className='flex flex-row items-left font-semibold'>Email</div>
                                                        <div className='flex flex-row items-left'>
                                                            <div className='flex flex-row items-left'>{email}</div>
                                                        </div>
                                                    </label>

                                                    <label className="grid grid-cols-2 items-center">
                                                        <div className='flex flex-row items-left font-semibold'>Address</div>
                                                        <div className='flex flex-row items-left'>{plotNum} {neighbourhood} {location}</div>
                                                    </label>


                                                    <label className="grid grid-cols-2 items-center">
                                                        <div className='flex flex-row items-left font-semibold'>Purpose of valuation</div>
                                                        <div className='flex flex-row items-left'>{message}</div>
                                                    </label>
                                                    <label className="grid grid-cols-2 items-center">
                                                        <div className='flex flex-row items-left font-semibold'>Additional information</div>
                                                        <div className='flex flex-row items-left'>{String(messageBody)}</div>
                                                    </label>


                                                </div>

                                            </div>
                                        </Card>
                                        <TextField
                                            name='contactPerson'
                                            label=""
                                            hidden
                                            value={firstName + " " + lastName}
                                        />
                                        <TextField
                                            name='contactNumber'
                                            label=""
                                            hidden
                                            value={telephone}
                                        />
                                        <TextField
                                            name='contactEmail'
                                            label=""
                                            hidden
                                            value={email}
                                        />
                                        <TextField
                                            name='message'
                                            label=""
                                            hidden
                                            value={message}
                                        />
                                        <TextArea
                                            name='plotAddress'
                                            label=""
                                            hidden
                                            value={plotNum + " " + neighbourhood + " " + location}
                                        />
                                        <TextArea
                                            name='messageBody'
                                            label=""
                                            hidden
                                            value={String(messageBody)}
                                        />
                                        <TextField
                                            name='plotNum'
                                            label=""
                                            hidden
                                            value={plotNum}
                                        />
                                        <input type="hidden" name="accepted" value="Accepted" />
                                        <input type="hidden" name="actionType" value="updateNotification" />
                                        <input type="hidden" name='declaration' value={acceptedDec.toString()} />
                                        {hasFormError(fetcher.data) && (
                                            <div className="flex flex-col items-stretch py-4">
                                                <InlineAlert>{fetcher.data.formError}</InlineAlert>
                                            </div>
                                        )}
                                    </TabPanel>
                                    <TabPanel header="Attachments" className="p-4" headerClassName={activeIndex === 1 ? 'active-tab' : 'default-tab'}>
                                        <div className="font-light flex flex-col items-stretch">
                                            {/* Instruction Attachments Row */}
                                            <div className='w-full pb-2'>
                                                <Card className="flex flex-col items-stretch gap-2 pt-0 px-2">
                                                    <CardHeader className="flex flex-row items-center gap-4 p-2 w-full">
                                                        <h1 className='text-l font-semibold'>Instruction Attachments</h1>
                                                    </CardHeader>
                                                    {accepted === InstructionResponse.Accept ? (
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4  pb-2">
                                                            {fileUrls.map((fileUrl, index) => (
                                                                <FilePreview
                                                                    key={fileUrl}
                                                                    fileId={fileUrl}
                                                                    removeFile={() => removeDocuments(fileUrl)}
                                                                    fileType={getFileType(fileNames[index])}
                                                                    fileName={fileNames[index]}
                                                                    hideRemoveButton={true}
                                                                />
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="col-span-4 text-center">
                                                            Accept to reveal content
                                                        </div>
                                                    )}
                                                </Card>
                                            </div>

                                            {/* Valuer Attachments Row */}
                                            <div className='w-full'>
                                                <fetcher.Form
                                                    method="post"
                                                    className="flex flex-col items-stretch w-[100%] gap-2"
                                                    encType="multipart/form-data"
                                                >
                                                    <ActionContextProvider
                                                        {...fetcher.data}
                                                        fields={('fields' in (fetcher.data ?? {}) && (fetcher.data as any).fields) ? (fetcher.data as any).fields : defaultValues}
                                                        isSubmitting={isProcessing}
                                                    >
                                                        <Card className="flex flex-col items-stretch gap-2 p-2 pt-2">
                                                            <CardHeader className="flex flex-row items-center gap-4 p-2 w-full">
                                                                <h1 className='text-l font-semibold'>Valuer Attachments</h1>
                                                            </CardHeader>
                                                            {accepted === InstructionResponse.Accept ? (
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                    {fileUrls1.map((fileUrl, index) => (
                                                                        <FilePreview
                                                                            key={fileUrl}
                                                                            fileId={fileUrl}
                                                                            removeFile={() => {
                                                                                const updatedFileNames = [...fileNames1];
                                                                                const updatedFileUrls = [...fileUrls1];
                                                                                const updatedFileTypes = [...fileTypes1];

                                                                                updatedFileNames.splice(index, 1);
                                                                                updatedFileUrls.splice(index, 1);
                                                                                updatedFileTypes.splice(index, 1);

                                                                                setFileNames1(updatedFileNames);
                                                                                setFileUrls1(updatedFileUrls);
                                                                                setFileTypes1(updatedFileTypes);
                                                                            }}
                                                                            fileType={getFileType(fileNames1[index])}
                                                                            fileName={fileNames1[index]}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="col-span-4 text-center">
                                                                    Accept to reveal content
                                                                </div>
                                                            )}
                                                            <CardHeader className="flex flex-row items-center gap-4 p-0 w-full">
                                                                <div className="grow" />
                                                                {accepted == InstructionResponse.Accept && (
                                                                    <SecondaryButton
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setShowValuerAttachmentsPopup(true);
                                                                            setOpen(false);
                                                                        }}
                                                                    >
                                                                        {isProcessing ? 'Processing...' : 'Add Attachments'}
                                                                    </SecondaryButton>
                                                                )}

                                                                <Toaster />
                                                            </CardHeader>
                                                        </Card>
                                                    </ActionContextProvider>
                                                </fetcher.Form>
                                            </div>
                                        </div>
                                    </TabPanel>

                                    {accepted === InstructionResponse.Accept ? (
                                        <TabPanel
                                            header={
                                                notification?.plot.valuationType === 'Residential' ? (
                                                    <span
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(AppLinks.PlotCouncilGrc(notification?.plotId!), '_blank');
                                                        }}
                                                    >
                                                        Start Valuation
                                                    </span>
                                                ) : (
                                                    <span
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(AppLinks.PlotValuations(notification?.plotId!), '_blank');
                                                        }}
                                                    >
                                                        Start Valuation
                                                    </span>
                                                )
                                            }
                                            className="p-4"
                                            headerClassName={`${activeIndex === 2 ? 'active-tab' : 'default-tab'}`}
                                        >
                                        </TabPanel>
                                    ) : (
                                        <div className="col-span-4 text-center">
                                            Accept to reveal content
                                        </div>
                                    )}
                                </TabView>
                                <div className="grid grid-cols-1 items-stretch py-0">

                                    <CardHeader className="flex flex-row items-center gap-4 p-0 w-full">
                                        <BackButton />
                                        <div className="grow" />
                                        <Toaster />
                                        {
                                            (user.isSignatory === true || user.isSuper === true) && notification?.accepted === 'Accepted' ? (
                                                <SecondaryButton
                                                    type="button"
                                                    onClick={() => {
                                                        handleDelegationClick();
                                                        setOpen(false);
                                                    }}
                                                    className="text-red-600"
                                                >
                                                    Assign Instruction?
                                                </SecondaryButton>
                                            ) : null
                                        }
                                        {accepted !== InstructionResponse.Accept && (
                                            <SecondaryButton onClick={() => setOpen((prevState) => !prevState)} className="flex flex-row items-center gap-2" type="button">
                                                Do you accept?
                                                {!!open && <ChevronUp className="text-teal-600" />}
                                                {!open && <ChevronDown className="text-teal-600" />}
                                            </SecondaryButton>
                                        )}
                                    </CardHeader>
                                    <div className="flex flex-row justify-end items-end gap-8">
                                        {!!open && (
                                            <div className="flex flex-col items-stretch bg-stone-50 rounded-lg p-2 gap-4">
                                                {/* <span className="font-light text-stone-800 text-sm py-4">{decl}</span> */}
                                                <div className="flex flex-row items-stretch gap-8">
                                                    <div className="grow" />
                                                    <SecondaryButton
                                                        type="button"
                                                        onClick={() => {
                                                            setShowDeclineReasonPopup(true);
                                                            // setAccepted(option);
                                                            setOpen(false);
                                                        }}
                                                        className="text-red-600"
                                                    >
                                                        NO
                                                    </SecondaryButton>
                                                    <SecondaryButton
                                                        // key={option}
                                                        type="button"
                                                        disabled={isProcessing}
                                                        className="flex flex-row gap-4"
                                                        onClick={() => {
                                                            console.log("Area 3");
                                                            handleDeclarationClick()
                                                            console.log("Area 4");
                                                        }}
                                                    >
                                                        <Check className="text-white" />
                                                        YES
                                                    </SecondaryButton>
                                                </div>
                                            </div>
                                        )}

                                    </div>

                                </div>
                            </ActionContextProvider>
                        </fetcher.Form>
                        <Chat
                            userId={userId}
                            notificationId={correctNoteId}
                            initialMessages={messages}
                        />
                    </div>
                </div>
            </div>

            {
                showDeclineReasonPopup && (
                    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${isFadingOut ? 'fade-out' : 'fade-in'}`}>
                        <div className="bg-white p-6 rounded-lg w-[40%]">
                            <fetcher.Form method="post" className="flex flex-col items-stretch w-[100%] gap-2">
                                <ActionContextProvider
                                    {...fetcher.data}
                                    fields={('fields' in (fetcher.data ?? {}) && (fetcher.data as any).fields) ? (fetcher.data as any).fields : defaultValues}
                                    isSubmitting={isProcessing}
                                >
                                    <h2 className="text-lg font-bold mb-4">Reason for Decline</h2>
                                    <TextArea
                                        name='declineReason'
                                        label="Please provide a reason for declining this request"
                                        value={declineReason!}
                                        onChange={(e) => setDeclineReason(e.target.value)}
                                    />
                                    <TextField
                                        name='firstName'
                                        label=""
                                        hidden
                                        value={firstName}
                                    />
                                    <TextField
                                        name='lastName'
                                        label=""
                                        hidden
                                        value={lastName}
                                    />
                                    <TextField
                                        name='telephone'
                                        label=""
                                        hidden
                                        value={telephone}
                                    />
                                    <TextField
                                        name='email'
                                        label=""
                                        hidden
                                        value={email}
                                    />
                                    <TextField
                                        name='neighbourhood'
                                        label=""
                                        hidden
                                        value={neighbourhood}
                                    />
                                    <TextField
                                        name='location'
                                        label=""
                                        hidden
                                        value={location}
                                    />
                                    <TextField
                                        name='message'
                                        label=""
                                        hidden
                                        value={message}
                                    />
                                    <TextArea
                                        name='messageBody'
                                        label=""
                                        hidden
                                        value={String(messageBody)}
                                    />
                                    <TextField
                                        name='plotNum'
                                        label=""
                                        hidden
                                        value={plotNum}
                                    />

                                    <input type="hidden" name="accepted" value="Declined" />
                                    <input type="hidden" name="actionType" value="updateNotification" />
                                    <div className="flex justify-end gap-4 mt-4">
                                        <SecondaryButton onClick={handleClosePopup}>Cancel</SecondaryButton>
                                        <PrimaryButton type='submit' disabled={isProcessing} onClick={() => { handleDeclineReasonSubmit }}>Submit</PrimaryButton>
                                    </div>
                                </ActionContextProvider>
                            </fetcher.Form>
                        </div>
                    </div>
                )
            }

            {/* Declaration popup windows */}
            {
                showDeclarationPopup && (
                    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${isFadingOut ? 'fade-out' : 'fade-in'}`}>
                        <div className="bg-white p-6 rounded-lg w-[40%]">
                            <fetcher.Form method="post" className="flex flex-col items-stretch w-[100%] gap-2">
                                <ActionContextProvider
                                    {...fetcher.data}
                                    fields={('fields' in (fetcher.data ?? {}) && (fetcher.data as any).fields) ? (fetcher.data as any).fields : defaultValues}
                                    isSubmitting={isProcessing}
                                >
                                    <div className="flex flex-col items-stretch bg-stone-50 rounded-lg p-2 gap-4">
                                        <span className="font-light text-stone-800 text-sm py-4">{decl}</span>
                                        <div className="flex flex-row items-stretch gap-8">
                                            <div className="grow" />
                                            <input type="hidden" name="actionType" value="updateNotification" />
                                            <input type="hidden" name="plotNum" value={plotNum || ""} />
                                            <input type="hidden" name="firstName" value={firstName || ""} />
                                            <input type="hidden" name="lastName" value={lastName || ""} />
                                            <input type="hidden" name="email" value={email || ""} />
                                            <input type="hidden" name="telephone" value={telephone || ""} />
                                            <input type="hidden" name="neighbourhood" value={neighbourhood || ""} />
                                            <input type="hidden" name="message" value={message || ""} />
                                            <input type="hidden" name="accepted" value={"Accepted"} />
                                            <PrimaryButton type='submit' disabled={isProcessing} >Accept</PrimaryButton>
                                            <SecondaryButton onClick={handleCloseDeclarationPopup}>Cancel</SecondaryButton>
                                        </div>
                                    </div>
                                </ActionContextProvider>
                            </fetcher.Form>
                        </div>
                    </div>
                )
            }

            {/* Upload Valuer Attachments */}
            {
                showValuerAttachmentsPopup && (
                    <div className={`fixed inset-0 z-[100] bg-black bg-opacity-50 flex items-center justify-center ${isFadingOut ? 'fade-out' : 'fade-in'}`}>
                        <div className="bg-white p-6 rounded-lg w-[60%]">
                            <div className='w-full'>
                                <fetcher.Form method="post" className="flex flex-col items-stretch w-[100%] gap-2">
                                    <ActionContextProvider
                                        {...fetcher.data}
                                        fields={('fields' in (fetcher.data ?? {}) && (fetcher.data as any).fields) ? (fetcher.data as any).fields : defaultValues}
                                        isSubmitting={isProcessing1}
                                    >
                                        <Card className="flex flex-col items-stretch gap-2 p-2 pt-2">
                                            <CardHeader className="flex flex-row items-center gap-4 p-2 w-full">
                                                <h1 className='text-l font-semibold'>Add Valuer Attachments</h1>
                                            </CardHeader>
                                            <div className="grid grid-cols-4 gap-4">
                                                <input type="hidden" name="actionType" value="uploadValuerAttachments" />
                                                <input type="hidden" {...getNameProp1('fileNames')} value={JSON.stringify(fileNames1)} />
                                                <input type="hidden" {...getNameProp1('fileUrls')} value={JSON.stringify(fileUrls1)} />
                                                <input type="hidden" {...getNameProp1('fileTypes')} value={JSON.stringify(fileTypes1)} />
                                            </div>
                                            <div className='grid grid-cols-1 gap-4'>
                                                <AddMultipleDocumentsValuer
                                                    handleUploadedFiles={(newFileNames, newFileUrls, newFileTypes) => {
                                                        setFileNames1(prev => [...prev, ...newFileNames]);
                                                        setFileUrls1(prev => [...prev, ...newFileUrls]);
                                                        setFileTypes1(prev => [...prev, ...newFileTypes]);
                                                        setCreatedBy(prev => [...prev, "Valuer"]);
                                                    }}
                                                />
                                            </div>
                                            <CardHeader className="flex flex-row items-center gap-4 p-0 w-full">
                                                <div className="grow" />
                                                <SecondaryButton
                                                    type="button"
                                                    onClick={handleCloseValuerAttachmentPopup}
                                                >
                                                    Close
                                                </SecondaryButton>
                                                <PrimaryButton type="submit" disabled={isProcessing}>
                                                    {isProcessing ? 'Saving...' : 'Save'}
                                                </PrimaryButton>
                                                <Toaster />
                                            </CardHeader>
                                        </Card>
                                    </ActionContextProvider>
                                </fetcher.Form>
                            </div>
                        </div>
                    </div>
                )
            }


            {
                showDelegationPopup && (
                    <div className={`fixed inset-0 z-[100] bg-black bg-opacity-50 flex items-center justify-center ${isFadingOut ? 'fade-out' : 'fade-in'}`}>
                        <div className="bg-white p-6 rounded-lg w-[30%]">
                            <div className='w-full'>
                                <fetcher.Form method="post" className="flex flex-col items-stretch w-[100%] gap-2">
                                    <ActionContextProvider
                                        {...fetcher.data}
                                        fields={('fields' in (fetcher.data ?? {}) && (fetcher.data as any).fields) ? (fetcher.data as any).fields : defaultValues}
                                        isSubmitting={isProcessing1}
                                    >
                                        <Card className="flex flex-col items-stretch gap-2 p-2 pt-2">
                                            <CardHeader className="flex flex-row items-center gap-4 p-2 w-full">
                                                <h1 className='text-l font-semibold'>Assign Instruction</h1>
                                            </CardHeader>
                                            <div className="grid grid-cols-1 gap-4">
                                                <input type="hidden" name="actionType" value="delegateInstruction" />
                                                <input type="hidden" {...getNameProp2('noteId')} value={correctNoteId} />
                                                <FormSelect
                                                    {...getNameProp2('userId')}
                                                    label="Select User"
                                                >
                                                    {usersDelegates.map(delegate => (
                                                        <option key={delegate.id} value={delegate.id}>
                                                            {delegate.firstName} {delegate.lastName}
                                                        </option>
                                                    ))}
                                                </FormSelect>
                                            </div>
                                            <CardHeader className="flex flex-row items-center gap-4 p-0 w-full">
                                                <div className="grow" />
                                                <SecondaryButton
                                                    type="button"
                                                    onClick={handleCloseDelegationPopup}
                                                >
                                                    Close
                                                </SecondaryButton>
                                                <PrimaryButton type="submit" disabled={isProcessing}>
                                                    {isProcessing ? 'Processing...' : 'Delegate'}
                                                </PrimaryButton>
                                                <Toaster />
                                            </CardHeader>
                                        </Card>
                                    </ActionContextProvider>
                                </fetcher.Form>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

export function ErrorBoundary() {
    return <RouteErrorBoundary />;
}