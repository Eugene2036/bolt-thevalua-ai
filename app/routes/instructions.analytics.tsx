import { ActionArgs, json, redirect, type LoaderArgs } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { badRequest } from 'remix-utils';
import { useEffect, useState } from 'react';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { prisma } from '~/db.server';
import { usePagination } from '~/hooks/usePagination';
import { getValidatedId, processBadRequest, StatusCode } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import {
    ValuationType,
} from '~/models/plots.validations';
import { requireUserId } from '~/session.server';
import { useUser } from '~/utils';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { z } from 'zod';
import { useForm } from '~/components/ActionContextProvider';
import { Toaster } from 'sonner';
import { TabPanel, TabView } from 'primereact/tabview';
import BankerAnalytics from '~/components/BankerAnalytics';

export async function loader({ request, params }: LoaderArgs) {
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

    const valuationInstructionsData = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, UserGroup: { include: { company: true } } } },
            attachments: true,
            plot: { select: { id: true, plotNumber: true, propertyLocation: true, valuationType: true } },
            // plot: { include: { company: { select: { id: true, CompanyName: true, } }, user: { select: { id: true, firstName: true, lastName: true } } } },
        },
    });

    const valuationHistory = await prisma.valuationsHistory.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                }
            },
            company: { select: { CompanyName: true } },
        },
    });

    return json({ user, plots, userId, valuationInstructionsData, valuationHistory });
}

interface Props {
    loggedIn: boolean;
    isSuper: boolean;
}

const Schema = z.object({
    accepted: z.enum(['Unread', 'Accepted', 'Declined']).default('Unread'),
});

export async function action({ request, params }: ActionArgs) {
    const currentUserId = await requireUserId(request);
    const userId = getValidatedId(currentUserId);
    const noteId = params.noteId; // Get noteId from params

    if (!noteId) {
        return badRequest({ formError: "Notification ID is required" });
    }

    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
        return processBadRequest(result.error, fields);
    }
    const { accepted } = result.data;

    try {
        await prisma.$transaction(async (tx) => {
            const updated = await tx.notification.update({
                where: { noteId }, // Use the noteId from params
                data: { accepted }
            });
            await tx.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.Notification,
                    action: EventAction.Update,
                    recordId: updated.noteId,
                    recordData: JSON.stringify(updated),
                },
            });
        });

        return redirect(AppLinks.UserProfile(currentUserId));
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}

export default function UsersId(props: Props) {
    const { user, plots, userId, valuationInstructionsData, valuationHistory } = useLoaderData<typeof loader>();
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

    const [notificationId, setNotificationId] = useState(valuationInstructionsData.length > 0 ? valuationInstructionsData[0].noteId : '');
    const [accepted, setAccepted] = useState(valuationInstructionsData.accepted);
    const [notifications, setNotifications] = useState(valuationInstructionsData || []);


    const [filters, setFilters] = useState({
        searchTerm: '',
        createdOnFrom: '',
        createdOnTo: '',
        approved: false,
        accepted: false,
        declined: false,
        sent: false,
    });

    const filteredNotifications = notifications.filter((notification) => {
        const searchTermLower = filters.searchTerm.toLowerCase();
        return (
            (filters.searchTerm ?
                notification.plotNum.toLowerCase().includes(searchTermLower) ||
                notification.user.UserGroup?.company.CompanyName.toLowerCase().includes(searchTermLower) ||
                notification.user.firstName.toLowerCase().includes(searchTermLower) ||
                notification.user.lastName.toLowerCase().includes(searchTermLower) ||
                notification.user.UserGroup?.company.Phone.toLowerCase().includes(searchTermLower) ||
                notification.neighbourhood.toLowerCase().includes(searchTermLower) ||
                notification.location.toLowerCase().includes(searchTermLower) ||
                (notification.user.firstName.toLowerCase().includes(searchTermLower) ||
                    notification.user.lastName.toLowerCase().includes(searchTermLower)) ||
                notification.email.toLowerCase().includes(searchTermLower)
                : true) &&
            (filters.createdOnFrom ? dayjs(notification.createdAt).isAfter(dayjs(filters.createdOnFrom)) : true) &&
            (filters.createdOnTo ? dayjs(notification.createdAt).isBefore(dayjs(filters.createdOnTo)) : true) &&
            (filters.approved ? notification.approved === filters.approved : true) &&
            (filters.accepted ? notification.accepted === 'Accepted' : true) &&
            (filters.declined ? notification.accepted === 'Declined' : true) &&
            (filters.sent ? notification.accepted === 'Unread' : true)
        );
    });

    // Apply pagination to the filtered notifications
    const { pageSize, handlePageSizeChange, currentPage, numPages, paginatedRecords, toFirstPage, toLastPage, toNextPage, toPreviousPage } = usePagination(filteredNotifications);

    useEffect(() => {
        const fetchNotifications = async () => {
            const data = await prisma.notification.findMany({
                where: { userId: user.id },
                include: { attachments: true }
            });
            setNotifications(data);
        };
        fetchNotifications();
    }, [accepted]);

    const [activeIndex, setActiveIndex] = useState(0);

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
                        headerClassName={`${activeIndex === 1 ? 'active-tab' : 'default-tab'}`}
                    >
                        <BankerAnalytics valuationInstructionsData={valuationInstructionsData} valuationHistory={valuationHistory} />
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
                    <TabPanel
                        header={
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = AppLinks.CreateInstructionsClientType;
                                }}
                            >
                                Create Instruction
                            </span>
                        }
                        className="p-2"
                        headerClassName={`${activeIndex === 2 ? 'active-tab' : 'default-tab'}`}
                    >
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
                <Toaster />
            </div>
        </div>
    );
}

export function ErrorBoundary() {
    return <RouteErrorBoundary />;
};