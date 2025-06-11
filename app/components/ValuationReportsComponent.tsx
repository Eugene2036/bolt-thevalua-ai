import dayjs from 'dayjs';
import React, { useState } from 'react';
import { Link, useFetcher } from '@remix-run/react';
import { Pagination } from '~/components/Pagination';
import { usePagination } from '~/hooks/usePagination';
import { badRequest, formatAmount } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import { PAGE_SIZES } from '~/hooks/usePagination';
import { CustomTableHeading } from '~/routes/dashboard';
import { TableCell } from '~/components/TableCell';
import { ReportStatus } from '~/models/plots.validations';
import { z } from 'zod';
import { getErrorMessage } from '~/models/errors';
import { ActionArgs, json, redirect } from '@remix-run/server-runtime';
import { EventAction, EventDomain } from '~/models/events';
import { useUser } from '~/utils';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { ActionContextProvider, useForm } from './ActionContextProvider';

type ValuationReportsComponentProps = {
  valuationHistoryRecords: Array<{
    id: string;
    plotNumber: string;
    plotId: string;
    valuationType: string;
    inspectionDate: string | null;
    analysisDate: string | null;
    titleDeedNum: string | null;
    titleDeedDate: string;
    marketValue: string;
    forcedSaleValue: string;
    insuranceReplacementCost: string;
    valuer: string;
    createdAt: string;
    plotExtent: string;
    zoning: string;
    reportStatus: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    company: {
      CompanyName: string;
    };
    plot: {
      reviewedBy: {
        id: string;
        firstName: string;
        lastName: string;
      } | null;
    };
  }>;
};

// Zod schema for Valuation Report Status
const statusSchema = z.object({
  id: z.string().min(1, "ID is required"),
  reportStatus: z.string().min(1, "Status is required"),
  actionType: z.literal('reportStatus')
});

export async function action({ request }: ActionArgs) {
  const currentUserId = await requireUserId(request);

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
        where: { id: result.data.id },
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
  return null;
}

export default function ValuationReportsComponent({
  valuationHistoryRecords
}: ValuationReportsComponentProps) {
  const [filters, setFilters] = useState({
    searchTerm: '',
    valuationType: '',
    titleDeedNumber: '',
    createdOnFrom: '',
    createdOnTo: '',
  });
  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, statusSchema);
  const [notifications, setNotifications] = useState(valuationHistoryRecords || []);

  const filteredRecords = valuationHistoryRecords.filter((record) => {
    const searchTermLower = filters.searchTerm.toLowerCase();
    const valuationTypeLower = filters.valuationType.toLowerCase();
    const titleDeedNumberLower = filters.titleDeedNumber.toLowerCase();

    return (
      (filters.searchTerm ?
        record.company.CompanyName.toLowerCase().includes(searchTermLower) ||
        `${record.user.firstName} ${record.user.lastName}`.toLowerCase().includes(searchTermLower) ||
        record.plotNumber.toLowerCase().includes(searchTermLower) ||
        record.plotExtent.toString().includes(searchTermLower) ||
        record.valuer.toLowerCase().includes(searchTermLower) ||
        record.marketValue.toLowerCase().includes(searchTermLower) ||
        record.forcedSaleValue.toLowerCase().includes(searchTermLower) ||
        record.insuranceReplacementCost.toLowerCase().includes(searchTermLower) ||
        record.valuationType.toLowerCase().includes(searchTermLower) ||
        record.titleDeedNum?.toLowerCase().includes(searchTermLower) ||
        dayjs(record.titleDeedDate).format('DD/MM/YYYY').includes(searchTermLower) ||
        record.zoning.toLowerCase().includes(searchTermLower) : true) &&
      (filters.valuationType ?
        record.valuationType.toLowerCase().includes(valuationTypeLower) : true) &&
      (filters.titleDeedNumber ?
        record.titleDeedNum?.toLowerCase().includes(titleDeedNumberLower) : true) &&
      (filters.createdOnFrom ? dayjs(record.createdAt).isAfter(dayjs(filters.createdOnFrom)) : true) &&
      (filters.createdOnTo ? dayjs(record.createdAt).isBefore(dayjs(filters.createdOnTo)) : true)
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
  } = usePagination(filteredRecords);

  return (
    <div className="flex flex-col gap-4 p-0">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg shadow">
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Search records..."
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            className="flex p-1 border border-gray-300 rounded-full text-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <select
            value={filters.valuationType}
            onChange={(e) => setFilters({ ...filters, valuationType: e.target.value })}
            className="flex p-1 border border-gray-300 rounded-full text-sm"
          >
            <option value="">All Valuation Types</option>
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
            <option value="Industrial">Industrial</option>
            <option value="Agricultural">Agricultural</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <fetcher.Form method="post" encType="multipart/form-data" className="flex flex-col items-stretch w-[100%] gap-1">
        <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full items-stretch bg-white overflow-hidden shadow-md border border-stone-200 mt-3" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <CustomTableHeading>Plot Number</CustomTableHeading>
                  <CustomTableHeading>Company</CustomTableHeading>
                  <CustomTableHeading>Inspection Date</CustomTableHeading>
                  <CustomTableHeading>Valuation Date</CustomTableHeading>
                  <CustomTableHeading>Market Value</CustomTableHeading>
                  <CustomTableHeading>Forced Value</CustomTableHeading>
                  <CustomTableHeading>Replacement Value</CustomTableHeading>
                  <CustomTableHeading>Reviewed By</CustomTableHeading>
                  <CustomTableHeading>Valuation Type</CustomTableHeading>
                  <CustomTableHeading>Status</CustomTableHeading>
                </tr>
              </thead>
              <tbody className="font-thin">
                {paginatedRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <TableCell>
                      <Link
                        to={record.valuationType === 'Residential'
                          ? AppLinks.PlotCouncilGrc(record.plotId)
                          : AppLinks.PlotValuations(record.plotId)}
                        className="text-blue-600 hover:underline"
                      >
                        {record.plotNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{record.company.CompanyName}</TableCell>
                    <TableCell>
                      {record.inspectionDate
                        ? dayjs(record.inspectionDate).format('DD/MM/YYYY')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {record.analysisDate
                        ? dayjs(record.analysisDate).format('DD/MM/YYYY')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(Number(record.marketValue || 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(Number(record.forcedSaleValue || 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(Number(record.insuranceReplacementCost || 0))}
                    </TableCell>
                    <TableCell>
                      {record.plot.reviewedBy
                        ? `${record.plot.reviewedBy.firstName} ${record.plot.reviewedBy.lastName}`
                        : '-'}
                    </TableCell>
                    <TableCell>{record.valuationType}</TableCell>
                    <TableCell className="text-center m-0 p-0">
                      <select
                        name="reportStatus"
                        className={`p-0 gap-0 b-0 w-full ${record.reportStatus === ReportStatus.Draft
                          ? 'text-red-500'
                          : record.reportStatus === ReportStatus.InReview
                            ? 'text-yellow-500 '
                            : record.reportStatus === ReportStatus.Reviewed
                              ? 'text-blue-500 '
                              : record.reportStatus === ReportStatus.Completed
                                ? 'text-teal-400 '
                                : record.reportStatus === ReportStatus.Closed
                                  ? 'text-teal-700 '
                                  : ''
                          }`}
                        value={record.reportStatus}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          const formData = new FormData();
                          formData.append('actionType', 'reportStatus');
                          formData.append('id', record.id);
                          formData.append('reportStatus', newStatus);

                          console.log('Submitting:', { id: record.id, reportStatus: newStatus });
                          fetcher.submit(formData, { method: 'post' });

                          setNotifications((prevRecords) =>
                            prevRecords.map((notification) =>
                              notification.id === record.id
                                ? { ...notification, reportStatus: newStatus }
                                : notification
                            )
                          );
                        }}
                      >
                        <option value={ReportStatus.Draft}>{ReportStatus.Draft}</option>
                        <option value={ReportStatus.InReview}>{ReportStatus.InReview}</option>
                        <option value={ReportStatus.Reviewed}>{ReportStatus.Reviewed}</option>
                        <option value={ReportStatus.Completed}>{ReportStatus.Completed}</option>
                      </select>
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ActionContextProvider>
      </fetcher.Form>
      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-600">
          Showing {paginatedRecords.length} of {filteredRecords.length} records
        </div>
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
    </div>
  );
}

export function ErrorBoundary() {
  return <div className="p-4 text-red-500">An error occurred while loading valuation history.</div>;
}