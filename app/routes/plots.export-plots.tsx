import type { Decimal } from '@prisma/client/runtime';

import { createReadStream } from 'fs';
import path from 'path';

import { Response, redirect, type LoaderArgs } from '@remix-run/node';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';

import { prisma } from '~/db.server';
import {
  StatusCode,
  bardRound,
  formatAmount,
  getFullName,
  getGrcAndFees,
  getGrcLessDepr,
  getGrcTotal,
  getMarketValue,
  getSubjectBuildValue,
  getSubjectLandValue,
  roundDown,
} from '~/models/core.validations';
import { DATE_INPUT_FORMAT } from '~/models/dates';
import { Env } from '~/models/environment';
import { getErrorMessage } from '~/models/errors';
import { AppLinks } from '~/models/links';
import {
  ValuationType,
  getAnnualOutgoingsPerBoth,
  getCapitalisedValue,
  getGrossRental,
  getMonthlyOutgoings,
  getNetAnnualRentalIncome,
  getOutgoingsIncomeRatio,
  getTotalAreaPerBoth,
  getTotalParkingPerBoth,
  getTotalRentalPerBoth,
  getValuer,
  roundToDecimal,
} from '~/models/plots.validations';
import { StoredValueId } from '~/models/storedValuest';
import { requireUser } from '~/session.server';

interface StoredValue {
  identifier: string;
  value: Decimal;
}
function getStoredValue(storedValues: StoredValue[], identifier: StoredValueId) {
  if (!storedValues) {
    return undefined;
  }
  const match = storedValues.find((el) => el.identifier === identifier);
  if (!match) {
    return undefined;
  }
  return { ...match, value: Number(match.value) };
}
function getStoredValues(storedValues: StoredValue[], ids: StoredValueId[]) {
  return ids.map((id) => getStoredValue(storedValues, id));
}

export async function loader({ request }: LoaderArgs) {
  const currentUser = await requireUser(request);

  if (!currentUser.isSuper) {
    return redirect(AppLinks.Home);
  }

  try {
    const records = await prisma.plot
      .findMany({
        where: { council: true, valuedById: { not: null } },
        select: {
          undevelopedPortion: true,
          rateForUndevelopedPortion: true,
          address: true,
          propertyLocation: true,
          valuationType: true,
          reviewedById: true,
          reviewedBy: { select: { id: true, firstName: true, lastName: true } },
          analysisDate: true,
          plotNumber: true,
          plotExtent: true,
          valuedById: true,
          valuedBy: { select: { firstName: true, lastName: true, email: true } },
          valuers: {
            select: { firstName: true, lastName: true, email: true },
          },
          storedValues: { select: { id: true, identifier: true, value: true } },
          tenants: {
            select: {
              name: true,
              termOfLease: true,
              startDate: true,
              endDate: true,
              grossMonthlyRental: true,
              escalation: true,
              areaPerClient: true,
              areaPerMarket: true,
              ratePerMarket: true,
              grossRatePerValuer: true,
              propertyType: { select: { identifier: true } },
            }
          },
          parkingRecords: {
            select: {
              id: true,
              parkingTypeId: true,
              parkingType: { select: { identifier: true } },
              unitPerClient: true,
              ratePerClient: true,
              unitPerMarket: true,
              ratePerMarket: true
            }
          },
          grcRecords: { select: { id: true, identifier: true, unit: true, size: true, rate: true, bull: true } },
          grcFeeRecords: { select: { id: true, identifier: true, perc: true } },
          grcDeprRecords: { select: { id: true, identifier: true, perc: true } },
          mvRecords: { select: { id: true, identifier: true, size: true, date: true, location: true, price: true } },
          outgoingRecords: {
            select: {
              id: true,
              identifier: true,
              itemType: true,
              unitPerClient: true,
              unitPerMarket: true,
              ratePerClient: true,
              ratePerMarket: true
            }
          },
          insuranceRecords: {
            select: {
              id: true,
              item: { select: { id: true, identifier: true } },
              roofType: { select: { id: true, identifier: true } },
              rate: true,
              area: true,
            },
          },
        },
      }
      )
      .then((plots) => {
        if (!plots) {
          return undefined;
        }
        return plots.map((rawPlot) => {
          const plot = {
            ...rawPlot,
            valuer: getValuer(rawPlot.valuedBy),
            reviewer: rawPlot.reviewedBy ? `${rawPlot.reviewedBy?.firstName} ${rawPlot.reviewedBy?.lastName}` : undefined,
            undevelopedPortion: Number(rawPlot.undevelopedPortion),
            rateForUndevelopedPortion: Number(rawPlot.rateForUndevelopedPortion),
            plotExtent: Number(rawPlot.plotExtent),
            gba: rawPlot.grcRecords.filter((el) => el.bull).reduce((acc, record) => acc + Number(record.size), 0),
            grcDeprRecords: rawPlot.grcDeprRecords.length ? rawPlot.grcDeprRecords : [{ id: '', identifier: '', perc: 0 }],
            tenants: rawPlot.tenants.map((tenant) => ({
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
            grcRecords: rawPlot.grcRecords.map((record) => ({
              ...record,
              rate: Number(record.rate),
              size: Number(record.size),
            })),
            grcFeeRecords: rawPlot.grcFeeRecords.map((record) => ({
              ...record,
              perc: Number(record.perc),
            })),
            mvRecords: rawPlot.mvRecords.map((record) => ({
              ...record,
              size: Number(record.size),
              price: Number(record.price),
            })),
            parkingRecords: rawPlot.parkingRecords.map((record) => ({
              ...record,
              ratePerClient: Number(record.ratePerClient),
              ratePerMarket: Number(record.ratePerMarket),
            })),
            outgoingRecords: rawPlot.outgoingRecords
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
          };

          const storedValues = getStoredValues(plot.storedValues, [
            StoredValueId.LandRate,
            StoredValueId.BuildRate,
            StoredValueId.Perculiar,
            StoredValueId.VacancyPercentage,
            StoredValueId.RecoveryFigure,
            StoredValueId.CapitalisationRate,
            StoredValueId.FsvAdjustment,
            StoredValueId.ProfFees,
            StoredValueId.InsuranceVat,
            StoredValueId.PreTenderEscalationAt,
            StoredValueId.PreTenderEscalationPerc,
            StoredValueId.PostTenderEscalationAt,
            StoredValueId.PostTenderEscalationPerc
          ]);

          const [landRate, buildRate, perculiar, vacancyPercentage, recoveryFigure, capitalisationRate,
            fsvAdjustment, profFee, insuranceVat, preTenderEscalationAt, preTenderEscalationPerc, postTenderEscalationAt, postTenderEscalationPerc] = storedValues;

          const subjectLandValue = getSubjectLandValue(plot.plotExtent, landRate?.value);
          const subjectBuildValue = getSubjectBuildValue(plot.grcRecords, buildRate?.value);

          // const subjectLandValue = (landRate?.value || 0) * plot.plotExtent;
          // const subjectBuildValue = plot.grcRecords.filter((el) => el.bull).reduce((acc, record) => acc + record.size, 0) * (buildRate?.value || 0);
          // const subjectBuildValue = plot.grcRecords.filter((el) => el.bull).reduce((acc, plot) => acc + plot.size, 0) * (buildRate?.value || 0);
          const projectedValue = subjectLandValue + subjectBuildValue;

          const marketValue = getMarketValue(projectedValue, perculiar?.value);
          // const marketValue = projectedValue + projectedValue * (perculiar?.value || 0);
          const sayMarket = roundDown(marketValue, -5);

          const forcedSaleValue = marketValue * 0.9;
          const sayForced = bardRound(forcedSaleValue, -5);

          const grcTotal = getGrcTotal(plot.grcRecords);
          const netTotal = getGrcAndFees(grcTotal, plot.grcFeeRecords);
          const deprTotal = getGrcLessDepr(grcTotal, netTotal, plot.grcDeprRecords);

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

          const marketValueComm = roundToDecimal(capitalisedValue + valueOfUndeveloped, 2);

          const fsv = marketValueComm - (fsvAdjustment?.value || 0) * 0.01 * marketValueComm;

          const subTotal = plot.insuranceRecords.reduce((acc, record) => {
            const result = acc + record.rate * (record.area || 0);
            // const result = acc + record.rate * totalArea;
            return Number(result.toFixed(2));
          }, 0);

          const vat = (() => {
            const result = subTotal * ((insuranceVat?.value || 0) / 100);
            return Number(result.toFixed(2));
          })();

          const comProperty = (() => {
            // const result = 0.2 * subTotal;
            // return Number(result.toFixed(2));
            return 0;
          })();
          // }, [subTotal]);

          const profFees = (() => {
            const result = (profFee?.value || 0) * 0.01 * (subTotal + vat + comProperty);
            // const result = 0.15 * (subTotal + vat + comProperty);
            // const result = 0.15 * (subTotal + vat + comProperty);
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

          const capitalValue = (() => {
            if (rawPlot.valuationType === ValuationType.Commercial) {
              return getCapitalisedValue(netAnnualRentalIncome, capitalisationRate?.value || 0);
            }
            return subjectLandValue + deprTotal;
          })();

          const improvementsValue = deprTotal;

          return {
            ...plot,
            marketValue: sayMarket,
            forcedSaleValue: sayForced,
            landValue: subjectLandValue,
            landRate,
            gla: GLA,
            capitalValue,
            netAnnualRentalIncome,
            fsv,
            vacancyPercentage,
            capitalisationRate,
            outgoingsRentalRatio,
            outgoings,
            marketValueComm: marketValueComm,
            valuationDate: plot.analysisDate,
            developmentsValue: improvementsValue,
            numStructures: plot.grcRecords.length,
            plotSize: plot.plotExtent,
            gba: plot.grcRecords.filter((el) => el.bull).reduce((acc, record) => acc + Number(record.size), 0),
          };
        });
      });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('COMMERCIAL PROPERTIES', {
      pageSetup: { paperSize: 9, orientation: 'landscape', printArea: 'A1:G20', showRowColHeaders: true, fitToWidth: 1 },
    });

    const worksheet2 = workbook.addWorksheet('RESIDENTIAL PROPERTIES', {
      pageSetup: { paperSize: 9, orientation: 'landscape', printArea: 'A1:G20', showRowColHeaders: true, fitToWidth: 1 },
    });

    worksheet.columns = [
      { header: 'Plot Number', key: 'plotNumber', width: 10 },
      { header: 'Location', key: 'location', width: 25 },
      { header: 'Extension', key: 'extension', width: 15 },
      { header: 'Valuation Date', key: 'valuationDate', width: 12 },
      { header: 'GLA m²', key: 'gla', width: 12 },
      { header: 'Land Rate', key: 'landRate', width: 10 },
      { header: 'Land Value', key: 'landValue', width: 15 },
      { header: 'Market Value', key: 'mktValue', width: 15 },
      { header: 'Force Sale Value', key: 'fsv', width: 15 },
      { header: 'Net Annual Income', key: 'netAnnualRentalIncome', width: 15 },
      { header: 'Vacancy Rate %', key: 'vacancyPercentage', width: 12 },
      { header: 'Cap Rate %', key: 'capRate', width: 12 },
      { header: 'Ratio Outgoings / Gross Income', key: 'outRentalRatio', width: 12 },
      { header: 'Outgoings per rentable m² per month', key: 'monthly', width: 10 },
      { header: 'Monthly Expenditure', key: 'outgoingMonthly', width: 15 },
      { header: 'Annual Expenditure', key: 'outgoingAnnual', width: 15 },
      { header: 'Capitalised Value', key: 'capitalValue', width: 15 },
      { header: 'Valued By', key: 'valuedBy', width: 20 },
      { header: 'Review Status', key: 'reviewStatus', width: 13 },
    ];

    worksheet2.columns = [
      { header: 'Plot Number', key: 'plotNumber', width: 10 },
      // { header: 'Property Category', key: 'propertyCategory' },
      { header: 'Location', key: 'location', width: 25 },
      { header: 'Extension', key: 'extension', width: 15 },
      { header: 'Valuation Date', key: 'valuationDate', width: 12 },
      { header: 'GBA m²', key: 'gba', width: 12 },
      { header: 'Land Rate', key: 'landRate', width: 12 },
      { header: 'Land Value', key: 'landValue', width: 12 },
      // { header: 'Market Value', key: 'marketValue', width: 12 },
      // { header: 'Forced Sale Value', key: 'forcedSaleValue', width: 12 },
      { header: 'Value of Developments', key: 'developmentsValue', width: 12 },
      { header: 'Capital Value', key: 'capitalValue', width: 12 },
      { header: 'Valued By', key: 'valuedBy', width: 20 },
      { header: 'Review Status', key: 'reviewStatus', width: 13 },
    ];

    worksheet.addRow(1); /* ADD EMPTY ROW TO INSERT HEADER */
    worksheet.getColumn('valuationDate').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    worksheet.getColumn('gla').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    worksheet.getColumn('landRate').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    worksheet.getColumn('landValue').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    worksheet.getColumn('mktValue').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    worksheet.getColumn('fsv').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    worksheet.getColumn('netAnnualRentalIncome').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    worksheet.getColumn('vacancyPercentage').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    worksheet.getColumn('capRate').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    worksheet.getColumn('outRentalRatio').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    worksheet.getColumn('monthly').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    worksheet.getColumn('outgoingMonthly').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    worksheet.getColumn('outgoingAnnual').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    worksheet.getColumn('capitalValue').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };

    worksheet2.addRow(1); /* ADD EMPTY ROW TO INSERT HEADER */
    worksheet2.getColumn('valuationDate').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    worksheet2.getColumn('gba').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    worksheet2.getColumn('landRate').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    worksheet2.getColumn('landValue').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    // worksheet2.getColumn('marketValue').alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    // worksheet2.getColumn('forcedSaleValue').alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    worksheet2.getColumn('developmentsValue').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
    worksheet2.getColumn('capitalValue').alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };


    // SET THE REPORT HEADER AND FOOTER
    const printDate = new Date();
    worksheet.headerFooter.oddHeader = "&C&KCCCCCC&\"Arial\"RealValua Report\n (Commercial Properties) \n Date: " + dayjs(printDate).format('DD/MM/YYYY') + ", Time: " + dayjs(printDate).format('HH:MM');
    worksheet.headerFooter.oddFooter = "&C&KCCCCCC&\"Arial\"Page &P of &N";

    worksheet2.headerFooter.oddHeader = "&C&KCCCCCC&\"Arial\"RealValua Report\n (Residential Properties) \n Date: " + dayjs(printDate).format('DD/MM/YYYY') + ", Time: " + dayjs(printDate).format('HH:MM');
    worksheet2.headerFooter.oddFooter = "&C&KCCCCCC&\"Arial\"Page &P of &N";

    records.forEach((record) => {
      if (record.valuationType == 'Commercial') {
        worksheet.addRow({
          plotNumber: record.plotNumber,
          location: record.address || '',
          extension: record.propertyLocation || '',
          valuationDate: record.valuationDate,
          gla: formatAmount(record.gla),
          landRate: formatAmount(record.landRate?.value || 0),
          landValue: formatAmount(record.landValue),
          mktValue: formatAmount(record.marketValueComm),
          fsv: formatAmount(record.fsv),
          marketValue: formatAmount(record.marketValue),
          netAnnualRentalIncome: formatAmount(record.netAnnualRentalIncome),
          vacancyPercentage: formatAmount(record.vacancyPercentage?.value || 0),
          capRate: formatAmount(record.capitalisationRate?.value || 0),
          outRentalRatio: formatAmount(record.outgoingsRentalRatio),
          monthly: formatAmount(record.outgoings.monthly),
          outgoingMonthly: formatAmount(record.outgoings.annual / 12),
          outgoingAnnual: formatAmount(record.outgoings.annual),
          capitalValue: formatAmount(record.capitalValue),
          valuedBy: getFullName(record.valuedBy?.firstName, record.valuedBy?.lastName) || record.valuedBy?.email || '',
          reviewStatus: record.reviewedById ? 'Reviewed' : 'Not Reviewed',
        });
      } else {
        worksheet2.addRow({
          plotNumber: record.plotNumber,
          location: record.address || '',
          extension: record.propertyLocation || '',
          valuationDate: record.valuationDate,
          gba: formatAmount(record.gba || 0),
          landRate: formatAmount(record.landRate?.value || 0),
          landValue: formatAmount(record.landValue),
          // marketValue: formatAmount(record.marketValue),
          // forcedSaleValue: formatAmount(record.forcedSaleValue),
          developmentsValue: formatAmount(record.developmentsValue),
          capitalValue: formatAmount(record.capitalValue),
          valuedBy: getFullName(record.valuedBy?.firstName, record.valuedBy?.lastName) || record.valuedBy?.email || '',
          reviewStatus: record.reviewedById ? 'Reviewed' : 'Not Reviewed',
        });
      }
    });

    let tempDir: string;
    if (Env.NODE_ENV === 'development') {
      tempDir = path.join(__dirname, `../../../../tmp/`);
    } else {
      tempDir = '/tmp/';
    }

    const filename = `${tempDir}_plots_${dayjs().format(DATE_INPUT_FORMAT)}`;
    await workbook.xlsx.writeFile(filename);
    const stream = createReadStream(filename);

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=ValuedPlots.xlsx`,
      },
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error) || 'Something went wrong exporting tenants, please try again';
    console.log('export error', errorMessage);
    throw new Response(errorMessage, { status: StatusCode.BadRequest });
  }
}
