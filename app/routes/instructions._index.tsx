import { ActionArgs, json, redirect, type LoaderArgs } from '@remix-run/node';
import { Link, useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { badRequest } from 'remix-utils';
import { useEffect, useState } from 'react';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { Pagination } from '~/components/Pagination';
import { TableCell } from '~/components/TableCell';
import { prisma } from '~/db.server';
import { PAGE_SIZES, usePagination } from '~/hooks/usePagination';
import { getValidatedId, processBadRequest, StatusCode } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import {
    ValuationType,
} from '~/models/plots.validations';
import { requireUserId } from '~/session.server';
import { CustomTableHeading } from './dashboard';
import { useUser } from '~/utils';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { z } from 'zod';
import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { CardHeader } from '~/components/CardHeader';
import { Toaster } from 'sonner';
import { TabPanel, TabView } from 'primereact/tabview';
import BankerAnalytics from '~/components/BankerAnalytics';

export async function loader({ request, params }: LoaderArgs) {
    await requireUserId(request);
    const userId = await requireUserId(request);

    const company = await prisma.user.findUnique({
        where: { id: userId },
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
    const companyId = company?.UserGroup?.company.id;

    const [user, plots] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.plot
            .findMany({
                where: { valuedById: userId, companyId: companyId },
                orderBy: { updatedAt: 'desc' },
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
        where: { delegated: false },
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, UserGroup: { include: { company: { select: { id: true, CompanyName: true, Mobile: true } } } } } },
            attachments: true,
            plot: { select: { id: true, plotNumber: true, propertyLocation: true, valuationType: true, company: { select: { CompanyName: true, Mobile: true } } } },
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
                notification.user.UserGroup?.company.Mobile.toLowerCase().includes(searchTermLower) ||
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

    function calculateAgeing(dateReceived: string): string {
        const receivedDate = dayjs(dateReceived);
        const currentDate = dayjs();
        const diffInDays = currentDate.diff(receivedDate, 'day');

        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return '1 day';
        if (diffInDays < 7) return `${diffInDays} days`;
        if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} week${diffInDays >= 14 ? 's' : ''}`;
        return `${Math.floor(diffInDays / 30)} month${diffInDays >= 60 ? 's' : ''}`;
    }

    return (
        <div className="grid grid-cols-3 gap-4 p-6 pt-2 bg-gray-50">
            <div className="flex flex-col items-stretch gap-6 col-span-3 pt-2">
                <TabView className="custom-tabview" activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
                    <TabPanel header="Cockpit" className="p-2" headerClassName={activeIndex === 0 ? 'active-tab' : 'default-tab'}>
                        <BankerAnalytics valuationInstructionsData={valuationInstructionsData} valuationHistory={valuationHistory} />
                    </TabPanel>
                    <TabPanel header="Instructions" className="p-2" headerClassName={activeIndex === 1 ? 'active-tab' : 'default-tab'}>
                        <div className="flex flex-row items-center gap-6 border-b border-b-stone-400 pb-2">
                            <div className='min-w-full'>
                                <div className="flex flex-row items-stretch py-0">
                                    <input type='hidden' name='noteId' value={notificationId} />
                                    <CardHeader className="flex flex-row items-center text-sm  w-full rounded-xl overflow-hidden shadow-md border border-stone-200 ">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder="Search record..."
                                                value={filters.searchTerm}
                                                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                                                className="flex p-1 border border-gray-300 rounded-full text-sm min-w-36"
                                            />
                                        </label>
                                        <div className="grid grid-cols-2 gap-4 p-2">
                                            <label className="flex items-center gap-2">
                                                From
                                                <input
                                                    type="date"
                                                    placeholder="Created On From"
                                                    value={filters.createdOnFrom}
                                                    onChange={(e) => setFilters({ ...filters, createdOnFrom: e.target.value })}
                                                    className="p-1 border border-gray-300 rounded-full text-sm"
                                                />
                                            </label>
                                            <label className="flex items-center gap-2">
                                                To
                                                <input
                                                    type="date"
                                                    placeholder="Created On To"
                                                    value={filters.createdOnTo}
                                                    onChange={(e) => setFilters({ ...filters, createdOnTo: e.target.value })}
                                                    className="p-1 border border-gray-300 rounded-full text-sm"
                                                />
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="notificationStatus"
                                                    checked={!filters.sent && !filters.accepted && !filters.declined}
                                                    onChange={() => setFilters({
                                                        ...filters,
                                                        sent: false,
                                                        accepted: false,
                                                        declined: false
                                                    })}
                                                    className="p-1 border border-gray-300 rounded text-sm"
                                                />
                                                All: ({notifications.length})
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="notificationStatus"
                                                    checked={filters.sent}
                                                    onChange={() => setFilters({
                                                        ...filters,
                                                        sent: true,
                                                        accepted: false,
                                                        declined: false
                                                    })}
                                                    className="p-1 border border-gray-300 rounded text-sm"
                                                />
                                                Unread: ({notifications.filter(n => n.accepted === 'Unread').length})
                                            </label>
                                            <label className="flex items-center gap-2 text-teal-600">
                                                <input
                                                    type="radio"
                                                    name="notificationStatus"
                                                    checked={filters.accepted}
                                                    onChange={() => setFilters({
                                                        ...filters,
                                                        sent: false,
                                                        accepted: true,
                                                        declined: false
                                                    })}
                                                    className="p-1 border border-gray-300 rounded text-sm"
                                                />
                                                Accepted: ({notifications.filter(n => n.accepted === 'Accepted').length})
                                            </label>
                                            <label className="flex items-center gap-1 text-red-600">
                                                <input
                                                    type="radio"
                                                    name="notificationStatus"
                                                    checked={filters.declined}
                                                    onChange={() => setFilters({
                                                        ...filters,
                                                        sent: false,
                                                        accepted: false,
                                                        declined: true
                                                    })}
                                                    className="p-1 border border-gray-300 rounded text-sm"
                                                />
                                                Declined: ({notifications.filter(n => n.accepted === 'Declined').length})
                                            </label>
                                        </div>
                                    </CardHeader>
                                </div>
                                <fetcher.Form method="post" className="flex flex-col items-stretch w-[100%] gap-1">
                                    <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
                                        <table className="min-w-full items-stretch bg-white rounded-xl overflow-hidden shadow-md border border-stone-200 mt-3" style={{ width: '100%' }}>
                                            <thead>
                                                <tr>
                                                    <CustomTableHeading>Plot Number</CustomTableHeading>
                                                    <CustomTableHeading>Valuation Firm</CustomTableHeading>
                                                    <CustomTableHeading>Valuer</CustomTableHeading>
                                                    <CustomTableHeading>Phone</CustomTableHeading>
                                                    <CustomTableHeading>Email</CustomTableHeading>
                                                    <CustomTableHeading>Type</CustomTableHeading>
                                                    <CustomTableHeading>Ageing</CustomTableHeading>
                                                    <CustomTableHeading>Status</CustomTableHeading>
                                                    <CustomTableHeading>Created On</CustomTableHeading>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedRecords.map((row, index) => (
                                                    <tr key={index} className="hover:bg-gray-100 transition duration-200 ease-in-out font-extralight">
                                                        <input type='hidden' name='noteId' value={row.noteId} />
                                                        <TableCell>
                                                            <Link className='cursor-pointer' to={AppLinks.EditNotificationDetails(row.noteId)}>
                                                                {row.plotNum}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Link className='cursor-pointer' to={AppLinks.EditNotificationDetails(row.noteId)}>
                                                                {row.user.UserGroup?.company.CompanyName
                                                                }
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Link className='cursor-pointer' to={AppLinks.EditNotificationDetails(row.noteId)}>
                                                                {row.user.firstName} {row.user.lastName}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell className='text-end'>
                                                            <Link className='cursor-pointer' to={AppLinks.EditNotificationDetails(row.noteId)}>
                                                                {row.user.UserGroup?.company.Mobile}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell><a href={"mailto:" + row.email} className='text-blue-500'>{row.user.email}</a></TableCell>
                                                        <TableCell>
                                                            <Link className='cursor-pointer' to={AppLinks.EditNotificationDetails(row.noteId)}>
                                                                {row.clientType}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Link className='cursor-pointer' to={AppLinks.EditNotificationDetails(row.noteId)}>
                                                                {calculateAgeing(row.createdAt)}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Link className='cursor-pointer' to={AppLinks.EditNotificationDetails(row.noteId)}>
                                                                {(row.accepted === 'Declined' ? <span className='text-red-600'>{row.accepted}</span> : (row.accepted === 'Accepted' ? <span className='text-teal-600'>{row.accepted}</span> : row.accepted))}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Link className='cursor-pointer' to={AppLinks.EditNotificationDetails(row.noteId)}>
                                                                {dayjs(row.createdAt).format('DD/MM/YYYY')}
                                                            </Link>
                                                        </TableCell>

                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="flex flex-row items-center gap-2">
                                            <div className="grow" />
                                            <Pagination
                                                pageSizes={PAGE_SIZES}
                                                pageSize={pageSize}
                                                handlePageSizeChange={handlePageSizeChange}
                                                currentPage={currentPage}
                                                numPages={numPages}
                                                toFirstPage={toFirstPage}
                                                toLastPage={toLastPage}
                                                toNextPage={toNextPage}
                                                toPreviousPage={toPreviousPage}
                                            />
                                        </div>
                                        {/* {hasFormError(fetcher.data) && (
                                            <div className="flex flex-col items-stretch py-4">
                                            </div>
                                        )} */}
                                        <div className="flex flex-row items-stretch py-0">
                                            <CardHeader className="flex flex-row items-center gap-4 p-0 w-full">
                                                <div className="grow" />
                                            </CardHeader>
                                        </div>
                                    </ActionContextProvider>
                                </fetcher.Form>
                            </div>
                        </div>
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