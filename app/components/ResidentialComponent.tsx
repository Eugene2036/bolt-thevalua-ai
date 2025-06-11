import { Link } from '@remix-run/react';
import { TableCell } from '~/components/TableCell';
import { AppLinks } from '~/models/links';
import { CustomTableHeading } from '~/routes/dashboard';
import { PAGE_SIZES, usePagination } from '~/hooks/usePagination';
import { formatAmount } from '~/models/core.validations';
import { ValuationType } from '~/models/plots.validations';
import { Pagination } from '~/components/Pagination';
import dayjs from 'dayjs';
import { twMerge } from 'tailwind-merge';
import React from 'react';
import { StoredValueId } from '~/models/storedValuest';

interface ResidentialComponentProps {
  plots: any[];
  user: {
    id: string;
    isSuper: boolean;
    target?: number;
  };
  userId: string;
  valuationTypeFilter?: ValuationType; // <-- Optional filter prop
}

export default function ResidentialComponent({
  plots,
  user,
  userId,
  valuationTypeFilter = ValuationType.Residential, // <-- Default to Residential
}: ResidentialComponentProps) {
  // Filter plots before pagination
  const filteredPlots = plots.filter((plot) => plot.valuationType === valuationTypeFilter);

  const {
    pageSize: plotsPageSize,
    handlePageSizeChange: handlePlotsPageSizeChange,
    currentPage: plotsCurrentPage,
    numPages: plotsNumPages,
    paginatedRecords: paginatedPlots,
    toFirstPage: toPlotsFirstPage,
    toLastPage: toPlotsLastPage,
    toNextPage: toPlotsNextPage,
    toPreviousPage: toPlotsPreviousPage,
  } = usePagination(filteredPlots);

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
    <div>
      <table className="min-w-full items-stretch bg-white overflow-hidden shadow-md border border-stone-200 mt-3" style={{ width: '100%' }}>
        <thead>
          <tr>
            <CustomTableHeading className="py-2 px-4 text-left">Plot #</CustomTableHeading>
            <CustomTableHeading className="py-2 px-4 text-left">Plot Extent</CustomTableHeading>
            <CustomTableHeading className="py-2 px-4 text-left">GBA m<sup>2</sup></CustomTableHeading>
            <CustomTableHeading className="py-2 px-4 text-left">Market Value</CustomTableHeading>
            <CustomTableHeading className="py-2 px-4 text-left">Forced Sale Value</CustomTableHeading>
            <CustomTableHeading className="py-2 px-4 text-left">Gross Replacement Cost</CustomTableHeading>
            {/* <CustomTableHeading className="py-2 px-4 text-left">Category</CustomTableHeading> */}
            <CustomTableHeading className="py-2 px-7 text-left">Ageing</CustomTableHeading>
            <CustomTableHeading className="py-2 px-4 text-left">Last Updated</CustomTableHeading>
            <CustomTableHeading className="py-2 px-4 text-left">Status</CustomTableHeading>
          </tr>
        </thead>
        <tbody className="font-thin">
          {paginatedPlots.map((plot) => {
            const to = (() => {
              if (plot.valuationType !== ValuationType.Residential && !plot.council) return AppLinks.PlotValuations(plot.id);
              if (plot.valuationType === ValuationType.Residential && !plot.council) return AppLinks.PlotGrc(plot.id);
              if (plot.valuationType === ValuationType.Residential && plot.council) return AppLinks.PlotCouncilGrc(plot.id);
              if (plot.valuationType === ValuationType.Commercial && plot.council) return AppLinks.PlotValuations(plot.id);
              return AppLinks.Plot(plot.id);
            })();

            const finalLink = `${to}?redirectTo=_users_${userId}`;
            const timestamp = dayjs(plot.updatedAt).format('DD/MM/YYYY');
            const canEdit = (!plot.valuedById && !plot.reviewedById) || user.isSuper;

            function getStoredValue(identifier: StoredValueId) {
              if (!plot) {
                return undefined;
              }
              const match = plot.storedValues.find((el) => el.identifier === identifier);
              if (!match) {
                return undefined;
              }
              return { ...match, value: Number(match.value) };
            }

            const perculiar = getStoredValue(StoredValueId.Perculiar);
            const vacancyPercentage = getStoredValue(StoredValueId.VacancyPercentage);
            const fsvAdjustment = getStoredValue(StoredValueId.FsvAdjustment);
            const profFee = getStoredValue(StoredValueId.ProfFees);
            const recoveryFigure = getStoredValue(StoredValueId.RecoveryFigure);
            const capitalisationRate = getStoredValue(StoredValueId.CapitalisationRate);
            const insuranceVat = getStoredValue(StoredValueId.InsuranceVat);
            const preTenderEscalationAt = getStoredValue(StoredValueId.PreTenderEscalationAt);
            const preTenderEscalationPerc = getStoredValue(StoredValueId.PreTenderEscalationPerc);
            const postTenderEscalationAt = getStoredValue(StoredValueId.PostTenderEscalationAt);
            const postTenderEscalationPerc = getStoredValue(StoredValueId.PostTenderEscalationPerc);

            const capitalisationRateCom = Number(capitalisationRate?.value);
            const avgPrice = plot.avgPrice;

            const marketValue = avgPrice + Number(avgPrice * (perculiar?.value || 0) * 0.01);
            const sayMarket = marketValue;

            const forcedSaleValue = marketValue * 0.9;
            const sayForced = forcedSaleValue;

            const grcTotal = plot.grcRecords.reduce((acc, record) => acc + record.rate * record.size, 0);
            const sayReplacementValue = grcTotal;

            const netTotal =
              grcTotal +
              plot.grcFeeRecords.reduce((acc, record) => {
                const rowTotal = Number((record.perc * 0.01 * grcTotal).toFixed(2));
                return acc + rowTotal;
              }, 0);


            return (
              <tr key={plot.id} className="hover:bg-gray-100 transition duration-200 ease-in-out">
                <TableCell className="py-2 px-4 border-b border-gray-200">
                  <Link to={finalLink} className="text-teal-600 hover:underline">
                    {plot.plotNumber}
                  </Link>
                </TableCell>
                <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{plot.plotExtent}</TableCell>
                <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{plot.gba ? formatAmount(plot.gba) : '0.00'}</TableCell>
                <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{sayMarket ? formatAmount(sayMarket) : '0.00'}</TableCell>
                <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{sayForced ? formatAmount(sayForced) : '0.00'}</TableCell>
                <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{netTotal ? formatAmount(netTotal) : '0.00'}</TableCell>
                {/* <TableCell className="py-1 px-2 border-b border-gray-200">{plot.valuationType}</TableCell> */}
                <TableCell className="py-2 px-3 border-b border-gray-200 text-right w-7">
                  <Link to={finalLink}>{calculateAgeing(plot.updatedAt)}</Link>
                </TableCell>
                <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{timestamp}</TableCell>
                <TableCell className="py-1 px-2 border-b border-gray-200">
                  <span className={twMerge('text-stone-400', plot.reviewedById && 'text-green-600')}>
                    {plot.reviewedById ? 'Reviewed' : 'Not Reviewed'}
                  </span>
                </TableCell>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex flex-row items-center gap-2 p-2">
        <div className="grow" />
        <Pagination
          pageSizes={PAGE_SIZES}
          pageSize={plotsPageSize}
          handlePageSizeChange={handlePlotsPageSizeChange}
          currentPage={plotsCurrentPage}
          numPages={plotsNumPages}
          toFirstPage={toPlotsFirstPage}
          toLastPage={toPlotsLastPage}
          toNextPage={toPlotsNextPage}
          toPreviousPage={toPlotsPreviousPage}
        />
      </div>
    </div>
  );
}
