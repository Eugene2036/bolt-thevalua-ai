import { Link } from '@remix-run/react';
import { TableCell } from '~/components/TableCell';
import { AppLinks } from '~/models/links';
import { CustomTableHeading } from '~/routes/dashboard';
import { PAGE_SIZES, usePagination } from '~/hooks/usePagination';
import { formatAmount } from '~/models/core.validations';
import { getAnnualOutgoingsPerBoth, getCapitalisedValue, getGrossRental, getMonthlyOutgoings, getNetAnnualRentalIncome, getOutgoingsIncomeRatio, getTotalAreaPerBoth, getTotalParkingPerBoth, getTotalRentalPerBoth, roundToDecimal, ValuationType } from '~/models/plots.validations';
import { Pagination } from '~/components/Pagination';
import dayjs from 'dayjs';
import { twMerge } from 'tailwind-merge';
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

export default function TourismComponent({
  plots,
  user,
  userId,
  valuationTypeFilter = ValuationType.Tourism, // <-- Default to Residential
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
            <CustomTableHeading className="py-2 px-4 text-left">GLA m<sup>2</sup></CustomTableHeading>
            <CustomTableHeading className="py-2 px-4 text-left">Gross Annual Income</CustomTableHeading>
            <CustomTableHeading className="py-2 px-4 text-left">Cap Rate (%)</CustomTableHeading>
            <CustomTableHeading className="py-2 px-4 text-left">Land Value</CustomTableHeading>
            <CustomTableHeading className="py-2 px-4 text-left">Capitalised Value</CustomTableHeading>
            <CustomTableHeading className="py-2 px-4 text-left">Market Value</CustomTableHeading>
            <CustomTableHeading className="py-2 px-4 text-left">Force Sale Value</CustomTableHeading>
            <CustomTableHeading className="py-2 px-4 text-left">Total Replacement Value</CustomTableHeading>
            <CustomTableHeading className="py-2 px-6 text-left">Ageing</CustomTableHeading>
            <CustomTableHeading className="py-2 px-4 text-left">Last Updated</CustomTableHeading>
            <CustomTableHeading className="py-2 px-7 text-left">Status</CustomTableHeading>
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

            const totalArea = getTotalAreaPerBoth(plot.tenants).client;

            const GLA = plot.tenants.reduce((acc, tenant) => acc + tenant.areaPerClient, 0);

            const totalRental = getTotalRentalPerBoth(
              plot.tenants.map((tenant) => ({
                ...tenant,
                grossMonthlyRental: tenant.areaPerClient * tenant.ratePerMarket,
              })),
            );

            const totalParking = getTotalParkingPerBoth(plot.parkingRecords);

            const grossRental = getGrossRental(totalRental, totalParking);

            const outgoings = (() => {
              const annual = getAnnualOutgoingsPerBoth(plot.outgoingRecords);
              return {
                annual,
                monthly: getMonthlyOutgoings(annual, totalArea),
              };
            })();

            const outgoingsRentalRatio = getOutgoingsIncomeRatio(outgoings.annual, grossRental.annual);

            const netAnnualRentalIncome = getNetAnnualRentalIncome(grossRental.annual, outgoings.annual, vacancyPercentage?.value || 0, recoveryFigure?.value || 0, totalArea);

            const valueOfUndeveloped = roundToDecimal((plot.undevelopedPortion || 0) * (plot.rateForUndevelopedPortion || 0), 2);

            const capitalisedValue = getCapitalisedValue(netAnnualRentalIncome, capitalisationRate?.value || 0);

            const capitalisedFigure = totalArea ? Number((capitalisedValue / totalArea).toFixed(2)) : 0;

            const marketValue = roundToDecimal(capitalisedValue + valueOfUndeveloped, 2);

            const fsv = marketValue - (fsvAdjustment?.value || 0) * 0.01 * marketValue;

            const subTotal = plot.insuranceRecords.reduce((acc, record) => {
              const result = acc + record.rate * (record.area || 0);
              return Number(result.toFixed(2));
            }, 0);

            const vat = (() => {
              const result = subTotal * ((insuranceVat?.value || 0) / 100);
              return Number(result.toFixed(2));
            })();

            const comProperty = (() => {
              return 0;
            })();

            const profFees = (() => {
              const result = (profFee?.value || 0) * 0.01 * (subTotal + vat + comProperty);
              return Number(result.toFixed(2));
            })();

            const replacementCost = (() => {
              const result = subTotal + vat + comProperty + profFees;
              return Number(result.toFixed(2));
            })();

            const preTenderEscl = (() => {
              const result = ((((preTenderEscalationPerc?.value || 0) / 100) * (preTenderEscalationAt?.value || 0)) / 12) * replacementCost;
              return Number(result.toFixed(2));
            })();

            const postTenderEscl = (() => {
              const result = ((((postTenderEscalationPerc?.value || 0) / 100) * (postTenderEscalationAt?.value || 0)) / 12) * subTotal;
              return Number(result.toFixed(2));
            })();

            const totalReplacementValue = (() => {
              const result = replacementCost + preTenderEscl + postTenderEscl;
              return roundToDecimal(result, 2);
            })();

            return (
              <tr key={plot.id} className="hover:bg-gray-100 transition duration-200 ease-in-out">
                <TableCell className="py-2 px-4 border-b border-gray-200">
                  <Link to={finalLink} className="text-teal-600 hover:underline">
                    {plot.plotNumber}
                  </Link>
                </TableCell>
                <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{plot.plotExtent}</TableCell>
                <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{GLA ? formatAmount(GLA) : '0.00'}</TableCell>
                <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{grossRental.annual ? formatAmount(grossRental.annual) : '0.00'}</TableCell>
                {/* <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{netAnnualRentalIncome ? formatAmount(netAnnualRentalIncome) : '0.00'}</TableCell> */}
                {/* <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{outgoings.annual ? formatAmount(outgoings.annual) : '0.00'}</TableCell> */}
                {/* <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{outgoings.monthly ? formatAmount(outgoings.monthly) : '0.00'}</TableCell> */}
                {/* <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{outgoingsRentalRatio ? formatAmount(outgoingsRentalRatio) : '0.00'}</TableCell> */}
                <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{capitalisationRate?.value ? formatAmount(capitalisationRate?.value) : '0.00'}</TableCell>
                {/* <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{vacancyPercentage?.value ? formatAmount(vacancyPercentage?.value) : '0.00'}</TableCell> */}
                <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{valueOfUndeveloped ? formatAmount(valueOfUndeveloped) : '0.00'}</TableCell>
                <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{capitalisedValue ? formatAmount(capitalisedValue) : '0.00'}</TableCell>
                <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{marketValue ? formatAmount(marketValue) : '0.00'}</TableCell>
                <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{fsv ? formatAmount(fsv) : '0.00'}</TableCell>
                {/* <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{capitalisedFigure ? formatAmount(capitalisedFigure) : '0.00'}</TableCell> */}
                <TableCell className="py-1 px-2 border-b border-gray-200 text-right">{totalReplacementValue ? formatAmount(totalReplacementValue) : '0.00'}</TableCell>
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
