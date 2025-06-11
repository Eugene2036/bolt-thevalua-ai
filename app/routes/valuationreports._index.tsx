import { ActionArgs, json, redirect, type LoaderArgs } from '@remix-run/node';
import { Link, useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { badRequest } from 'remix-utils';
import { useState } from 'react';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { Pagination } from '~/components/Pagination';
import { TableCell } from '~/components/TableCell';
import { prisma } from '~/db.server';
import { PAGE_SIZES, usePagination } from '~/hooks/usePagination';
import { formatAmount, processBadRequest } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import {
    ReportStatus,
} from '~/models/plots.validations';
import { requireUserId } from '~/session.server';
import { CustomTableHeading } from './dashboard';
import { useUser } from '~/utils';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields, hasFormError } from '~/models/forms';
import { z } from 'zod';
import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { InlineAlert } from '~/components/InlineAlert';
import { CardHeader } from '~/components/CardHeader';
import { TabPanel, TabView } from 'primereact/tabview';
import Modal from '~/components/Modal';

export async function loader({ request, params }: LoaderArgs) {
    console.log("Params:", params); // Debug log
    await requireUserId(request);
    const userId = await requireUserId(request);

    const valuationHistory = await prisma.valuationsHistory.findMany({
        where: {
            OR: [
                { reportStatus: 'Reviewed' },
                { reportStatus: 'Closed' }
            ]
        },
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

    return json({ userId, valuationHistory });
}

interface Props {
    loggedIn: boolean;
    isSuper: boolean;
}

const Schema = z.object({
    accepted: z.enum(['Unread', 'Accepted', 'Declined']).default('Unread'),
});

// Zod schema for Valuation Report Status
const statusSchema = z.object({
    id: z.coerce.string().min(1),
    reportStatus: z.coerce.string().min(1),
    actionType: z.literal('reportStatus'),
});


export async function action({ request, params }: ActionArgs) {
    const currentUserId = await requireUserId(request);
    const noteId = params.noteId; // Get noteId from params

    const formData = await request.formData();
    const actionType = formData.get('actionType');

    if (actionType === 'reportStatus') {
        try {
            const id = formData.get('id') as string;
            const reportStatus = formData.get('reportStatus') as string;

            const result = statusSchema.safeParse({ id, reportStatus, actionType });
            console.log('Form Data:', { id, reportStatus });

            if (!result.success) {
                return json({ errors: result.error.flatten() }, { status: 400 });
            }

            const updatedStatus = await prisma.valuationsHistory.update({
                where: { id },
                data: {
                    reportStatus: result.data.reportStatus,
                },
            });

            await prisma.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.ValuationsHistory,
                    action: EventAction.Update,
                    recordId: updatedStatus.id,
                    recordData: JSON.stringify(updatedStatus),
                },
            });

            return json({ updatedStatus });
        } catch (error) {
            return badRequest({ formError: getErrorMessage(error) });
        }
    }

    // Handle other action types if needed
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
                where: { noteId },
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
    const { userId, valuationHistory } = useLoaderData<typeof loader>();

    const fetcher = useFetcher<typeof action>();
    const { getNameProp, isProcessing } = useForm(fetcher, statusSchema);

    const currentUser = useUser();
    const { loggedIn, isSuper } = props;

    const [notifications, setNotifications] = useState(valuationHistory || []);
    const [reportStatus, setReportStatus] = useState('');

    const [filters, setFilters] = useState({
        searchTerm: '',
        companyName: '',
        valuedBy: '',
        valuationType: '',
        titleDeedNumber: '',
        createdOnFrom: '',
        createdOnTo: '',
    });

    const filteredNotifications = notifications.filter((valuationRecord) => {
        const searchTermLower = filters.searchTerm.toLowerCase();
        const valuationTypeLower = filters.valuationType.toLowerCase();
        const titleDeedNumberLower = filters.titleDeedNumber.toLowerCase();

        return (
            (filters.searchTerm ?
                valuationRecord.company.CompanyName.toLowerCase().includes(searchTermLower) ||
                `${valuationRecord.user.firstName} ${valuationRecord.user.lastName}`.toLowerCase().includes(searchTermLower) ||
                valuationRecord.plotNumber.toLowerCase().includes(searchTermLower) ||
                valuationRecord.reportStatus.toLowerCase().includes(searchTermLower) ||
                valuationRecord.plotExtent.toLowerCase().includes(searchTermLower) ||
                valuationRecord.valuer.toLowerCase().includes(searchTermLower) ||
                valuationRecord.titleDeedNum?.toLowerCase().includes(searchTermLower) ||
                valuationRecord.titleDeedDate.toLowerCase().includes(searchTermLower) ||
                valuationRecord.marketValue.toLowerCase().includes(searchTermLower) ||
                valuationRecord.forcedSaleValue.toLowerCase().includes(searchTermLower) ||
                valuationRecord.insuranceReplacementCost.toLowerCase().includes(searchTermLower) ||
                valuationRecord.zoning.toLowerCase().includes(searchTermLower) : true) &&
            (filters.valuationType ?
                valuationRecord.valuationType.toLowerCase().includes(valuationTypeLower) : true) &&
            (filters.titleDeedNumber ?
                valuationRecord.titleDeedNum?.toLowerCase().includes(titleDeedNumberLower) : true) &&
            (filters.createdOnFrom ? dayjs(valuationRecord.createdAt).isAfter(dayjs(filters.createdOnFrom)) : true) &&
            (filters.createdOnTo ? dayjs(valuationRecord.createdAt).isBefore(dayjs(filters.createdOnTo)) : true)
        );
    });

    const {
        pageSize,
        handlePageSizeChange,
        currentPage,
        numPages,
        paginatedRecords,
        toFirstPage,
        toLastPage,
        toNextPage,
        toPreviousPage
    } = usePagination(filteredNotifications);
    const [activeIndex, setActiveIndex] = useState(3);


    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);

    const handleViewReport = (plotId: string) => {
        setSelectedPlotId(plotId);
        setIsModalOpen(true);
    };

    return (
        <div className="grid grid-cols-3 gap-4 p-6 pt-2 bg-gray-50">
            <div className="flex flex-col items-stretch gap-6 col-span-3 pt-2">
                <TabView className="custom-tabview" activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
                    <TabPanel
                        header={
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = AppLinks.Instructions;
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

                    <TabPanel header="Valuation Reports" className="p-2" headerClassName={activeIndex === 3 ? 'active-tab' : 'default-tab'}>
                        <div className="flex flex-row items-center gap-6 border-b border-b-stone-400 pb-2">
                            <div className='min-w-full'>
                                <div className="flex flex-row items-stretch py-0">
                                    <CardHeader className="flex flex-row items-center text-sm  w-full rounded-xl overflow-hidden shadow-md border border-stone-200 ">
                                        <div className="grid grid-cols-3 gap-4 p-2 w-full">
                                            <div className="flex flex-col gap-2">
                                                <label className="flex items-center gap-2">
                                                    {/* Search */}
                                                    <input
                                                        type="text"
                                                        placeholder="Search records..."
                                                        value={filters.searchTerm}
                                                        onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                                                        className="flex p-1 border border-gray-300 rounded-full text-sm w-full"
                                                    />
                                                </label>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="flex items-center gap-2">
                                                    {/* Valuation Type */}
                                                    <select
                                                        value={filters.valuationType}
                                                        onChange={(e) => setFilters({ ...filters, valuationType: e.target.value })}
                                                        className="flex p-1 border border-gray-300 rounded-full text-sm w-full"
                                                    >
                                                        <option value="">All Valuation Types</option>
                                                        <option value="Residential">Residential</option>
                                                        <option value="Commercial">Commercial</option>
                                                        <option value="Industrial">Industrial</option>
                                                        <option value="Agricultural">Agricultural</option>
                                                    </select>
                                                </label>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <label className="flex items-center gap-2">
                                                    From
                                                    <input
                                                        type="date"
                                                        placeholder="Created On From"
                                                        value={filters.createdOnFrom}
                                                        onChange={(e) => setFilters({ ...filters, createdOnFrom: e.target.value })}
                                                        className="p-1 border border-gray-300 rounded-full text-sm w-full"
                                                    />
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    To
                                                    <input
                                                        type="date"
                                                        placeholder="Created On To"
                                                        value={filters.createdOnTo}
                                                        onChange={(e) => setFilters({ ...filters, createdOnTo: e.target.value })}
                                                        className="p-1 border border-gray-300 rounded-full text-sm w-full"
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </CardHeader>
                                </div>
                                <fetcher.Form method="post" encType="multipart/form-data" className="flex flex-col items-stretch w-[100%] gap-1">
                                    <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
                                        <table className="min-w-full items-stretch bg-white overflow-hidden shadow-md border border-stone-200 mt-3" style={{ width: '100%' }}>
                                            <thead>
                                                <tr>
                                                    <CustomTableHeading>Plot Number</CustomTableHeading>
                                                    <CustomTableHeading>Company</CustomTableHeading>
                                                    <CustomTableHeading>Valued By</CustomTableHeading>
                                                    <CustomTableHeading>Valuation Type</CustomTableHeading>
                                                    <CustomTableHeading>Inspection Date</CustomTableHeading>
                                                    <CustomTableHeading>Valuation Date</CustomTableHeading>
                                                    <CustomTableHeading>Market Value</CustomTableHeading>
                                                    <CustomTableHeading>Forced Value</CustomTableHeading>
                                                    <CustomTableHeading>Replacement Value</CustomTableHeading>
                                                    <CustomTableHeading>Status</CustomTableHeading>
                                                    <CustomTableHeading>Action</CustomTableHeading>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {
                                                    paginatedRecords.map((row, index) => (
                                                        <tr key={index} className="hover:bg-gray-100 transition duration-200 ease-in-out font-extralight">
                                                            <TableCell>
                                                                <Link className='cursor-pointer text-blue-500' to={row.valuationType === 'Residential' ? AppLinks.PlotCouncilGrc(row.plotId) : AppLinks.PlotValuations(row.plotId)}>
                                                                    {row.plotNumber}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell className='text-end'>
                                                                <Link className='cursor-pointer' to={row.valuationType === 'Residential' ? AppLinks.PlotCouncilGrc(row.plotId) : AppLinks.PlotValuations(row.plotId)}>
                                                                    {row.company.CompanyName}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell className='text-end'>
                                                                <Link className='cursor-pointer' to={row.valuationType === 'Residential' ? AppLinks.PlotCouncilGrc(row.plotId) : AppLinks.PlotValuations(row.plotId)}>
                                                                    {row.user.firstName} {row.user.lastName}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell className='text-end'>
                                                                <Link className='cursor-pointer' to={row.valuationType === 'Residential' ? AppLinks.PlotCouncilGrc(row.plotId) : AppLinks.PlotValuations(row.plotId)}>
                                                                    {row.valuationType}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell className='text-end'>
                                                                <Link className='cursor-pointer' to={row.valuationType === 'Residential' ? AppLinks.PlotCouncilGrc(row.plotId) : AppLinks.PlotValuations(row.plotId)}>
                                                                    {row.inspectionDate ? dayjs(row.inspectionDate).format('DD/MM/YYYY') : ''}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell className='text-end'>
                                                                <Link className='cursor-pointer' to={row.valuationType === 'Residential' ? AppLinks.PlotCouncilGrc(row.plotId) : AppLinks.PlotValuations(row.plotId)}>
                                                                    {row.analysisDate ? dayjs(row.inspectionDate).format('DD/MM/YYYY') : ''}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell className='text-end'>
                                                                <Link className='cursor-pointer' to={row.valuationType === 'Residential' ? AppLinks.PlotCouncilGrc(row.plotId) : AppLinks.PlotValuations(row.plotId)}>
                                                                    {row.marketValue ? formatAmount(Number(row.marketValue)) : 0.00}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell className='text-end'>
                                                                <Link className='cursor-pointer' to={row.valuationType === 'Residential' ? AppLinks.PlotCouncilGrc(row.plotId) : AppLinks.PlotValuations(row.plotId)}>
                                                                    {row.forcedSaleValue ? formatAmount(Number(row.forcedSaleValue)) : 0.00}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell className='text-end'>
                                                                <Link className='cursor-pointer' to={row.valuationType === 'Residential' ? AppLinks.PlotCouncilGrc(row.plotId) : AppLinks.PlotValuations(row.plotId)}>
                                                                    {row.insuranceReplacementCost ? formatAmount(Number(row.insuranceReplacementCost)) : 0.00}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell className="text-center m-0 p-0">
                                                                <select
                                                                    name="reportStatus"
                                                                    className={`p-0 gap-0 b-0 w-full ${row.reportStatus === ReportStatus.Draft
                                                                        ? 'text-red-500'
                                                                        : row.reportStatus === ReportStatus.InReview
                                                                            ? 'text-yellow-500 '
                                                                            : row.reportStatus === ReportStatus.Reviewed
                                                                                ? 'text-blue-500 '
                                                                                : row.reportStatus === ReportStatus.Completed
                                                                                    ? 'text-teal-400 '
                                                                                    : row.reportStatus === ReportStatus.Closed
                                                                                        ? 'text-teal-700 '
                                                                                        : ''
                                                                        }`}
                                                                    value={row.reportStatus}
                                                                    onChange={(e) => {
                                                                        const newStatus = e.target.value;
                                                                        const formData = new FormData();
                                                                        formData.append('actionType', 'reportStatus');
                                                                        formData.append('id', row.id);
                                                                        formData.append('reportStatus', newStatus);

                                                                        console.log('Submitting:', { id: row.id, reportStatus: newStatus });
                                                                        // Submit the form data using fetcher
                                                                        fetcher.submit(formData, { method: 'post' });

                                                                        // Optimistically update the UI
                                                                        setNotifications((prevNotifications) =>
                                                                            prevNotifications.map((notification) =>
                                                                                notification.id === row.id
                                                                                    ? { ...notification, reportStatus: newStatus }
                                                                                    : notification
                                                                            )
                                                                        );
                                                                    }}
                                                                >
                                                                    {/* <option value={ReportStatus.Draft}>{ReportStatus.Draft}</option>
                                                                    <option value={ReportStatus.InReview}>{ReportStatus.InReview}</option>*/}
                                                                    <option value={ReportStatus.Reviewed}>{ReportStatus.Reviewed}</option>
                                                                    <option value={ReportStatus.Closed}>{ReportStatus.Closed}</option>
                                                                </select>
                                                            </TableCell>
                                                            <TableCell className="text-center bg-stone-50">
                                                                <button
                                                                    className="bg-stone-100 rounded-md px-4 py-3 text-teal-600 hover:bg-stone-200 flex flex-col justify-center items-center cursor-pointer"
                                                                    onClick={() => handleViewReport(row.plotId)}
                                                                >
                                                                    View Report
                                                                </button>
                                                            </TableCell>
                                                            {/* <TableCell className='text-center bg-stone-50'>
                                                                <Link className='bg-stone-100 rounded-md px-4 py-3 text-teal-600 hover:bg-stone-200 flex flex-col justify-center items-center cursor-pointer' to={AppLinks.ViewReportBanker(row.plotId)} target='_blank'>
                                                                    View Report
                                                                </Link>
                                                            </TableCell> */}
                                                        </tr>
                                                    ))
                                                }
                                            </tbody>

                                            {/* Modal for viewing the report */}
                                            {isModalOpen && selectedPlotId && (
                                                <Modal onClose={() => setIsModalOpen(false)}>
                                                    <iframe
                                                        src={`/generate-pdf?plotId=${selectedPlotId}`}
                                                        title="Report Viewer"
                                                        style={{ width: '100%', height: '95vh', border: 'none' }}
                                                    />
                                                </Modal>
                                            )}
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
                                        {hasFormError(fetcher.data) && (
                                            <div className="flex flex-col items-stretch py-4">
                                                <InlineAlert>{fetcher.data.formError}</InlineAlert>
                                            </div>
                                        )}
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
                </TabView>
            </div>
        </div>
    );
}

export function ErrorBoundary() {
    return <RouteErrorBoundary />;
}