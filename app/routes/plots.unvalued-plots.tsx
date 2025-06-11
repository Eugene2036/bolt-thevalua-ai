import type { Decimal } from '@prisma/client/runtime';

import { createReadStream } from 'fs';
import path from 'path';
import { useLoaderData } from '@remix-run/react';
import { Response, redirect, type LoaderArgs } from '@remix-run/node';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';

import { prisma } from '~/db.server';
import {
  StatusCode,
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
  getTotalAreaPerBoth,
  getTotalParkingPerBoth,
  getTotalRentalPerBoth,
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
        where: { council: true, valuedById: null },
        // where: { council: true, valuedById: { not: null } },
        select: {
          undevelopedPortion: true,
          rateForUndevelopedPortion: true,
          address: true,
          propertyLocation: true,
          valuationType: true,
          valuedBy: { select: { firstName: true, lastName: true, email: true } },
          reviewedById: true,
          analysisDate: true,
          plotNumber: true,
          plotExtent: true,
          storedValues: { select: { id: true, identifier: true, value: true } },
          tenants: { select: { startDate: true, endDate: true, grossMonthlyRental: true, escalation: true, areaPerClient: true, areaPerMarket: true, ratePerMarket: true } },
          parkingRecords: { select: { unitPerClient: true, ratePerClient: true, ratePerMarket: true } },
          grcRecords: { select: { id: true, identifier: true, unit: true, size: true, rate: true, bull: true } },
          grcFeeRecords: { select: { id: true, identifier: true, perc: true } },
          grcDeprRecords: { select: { id: true, identifier: true, perc: true } },
          mvRecords: { select: { id: true, identifier: true, size: true, date: true, location: true, price: true } },
          outgoingRecords: { select: { itemType: true, unitPerClient: true, unitPerMarket: true, ratePerClient: true, ratePerMarket: true } },
        },
      })
      .then((plots) => {
        return plots.map((rawPlot) => {
          const plot = {
            ...rawPlot,
            undevelopedPortion: Number(rawPlot.undevelopedPortion),
            rateForUndevelopedPortion: Number(rawPlot.rateForUndevelopedPortion),
            plotExtent: Number(rawPlot.plotExtent),
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
          ]);
          const [landRate, buildRate, perculiar, vacancyPercentage, recoveryFigure, capitalisationRate] = storedValues;

          const subjectLandValue = getSubjectLandValue(plot.plotExtent, landRate?.value);
          const subjectBuildValue = getSubjectBuildValue(plot.grcRecords, buildRate?.value);
          const projectedValue = subjectLandValue + subjectBuildValue;

          const marketValue = getMarketValue(projectedValue, perculiar?.value);
          const sayMarket = roundDown(marketValue, -5);

          const grcTotal = getGrcTotal(plot.grcRecords);
          const netTotal = getGrcAndFees(grcTotal, plot.grcFeeRecords);
          const deprTotal = getGrcLessDepr(grcTotal, netTotal, plot.grcDeprRecords);

          const totalArea = getTotalAreaPerBoth(plot.tenants).client;

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

          const netAnnualRentalIncome = getNetAnnualRentalIncome(grossRental.annual, outgoings.annual, vacancyPercentage?.value || 0, recoveryFigure?.value || 0, totalArea);

          // const capitalisedValue = getCapitalisedValue(netAnnualRentalIncome, capitalisationRate?.value || 0);
          // const capitalValue = subjectLandValue + deprTotal;
          // const capitalValue = capitalisedValue;
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
            landValue: subjectLandValue,
            landRate,
            capitalValue,
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
      // { header: 'Property Category', key: 'propertyCategory' },
      { header: 'Location', key: 'location', width: 25 },
      { header: 'Extension', key: 'extension', width: 15 },
      { header: 'Valuation Date', key: 'valuationDate', width: 12 },
      { header: 'Land Rate', key: 'landRate', width: 12 },
      { header: 'Land Value', key: 'landValue', width: 12 },
      { header: 'Value of Developments', key: 'developmentsValue', width: 12 },
      { header: 'Capital Value', key: 'capitalValue', width: 12 },
      { header: 'Valued By', key: 'valuedBy', width: 20 },
      { header: 'Review Status', key: 'reviewStatus', width: 13 },
    ];

    worksheet2.columns = [
      { header: 'Plot Number', key: 'plotNumber', width: 10 },
      // { header: 'Property Category', key: 'propertyCategory' },
      { header: 'Location', key: 'location', width: 25 },
      { header: 'Extension', key: 'extension', width: 15 },
      { header: 'Valuation Date', key: 'valuationDate', width: 12 },
      { header: 'Land Rate', key: 'landRate', width: 12 },
      { header: 'Land Value', key: 'landValue', width: 12 },
      { header: 'Value of Developments', key: 'developmentsValue', width: 12 },
      { header: 'Capital Value', key: 'capitalValue', width: 12 },
      { header: 'Valued By', key: 'valuedBy', width: 20 },
      { header: 'Review Status', key: 'reviewStatus', width: 13 },
    ];

    worksheet.addRow(1); /* ADD EMPTY ROW TO INSERT HEADER */
    worksheet.getColumn(5).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    worksheet.getColumn(6).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    worksheet.getColumn(7).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    worksheet.getColumn(8).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };

    worksheet2.addRow(1); /* ADD EMPTY ROW TO INSERT HEADER */
    worksheet2.getColumn(5).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    worksheet2.getColumn(6).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    worksheet2.getColumn(7).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    worksheet2.getColumn(8).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };

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
          landRate: formatAmount(record.landRate?.value || 0),
          landValue: formatAmount(record.landValue),
          developmentsValue: formatAmount(record.developmentsValue),
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
          landRate: formatAmount(record.landRate?.value || 0),
          landValue: formatAmount(record.landValue),
          developmentsValue: formatAmount(record.developmentsValue),
          capitalValue: formatAmount(record.capitalValue),
          valuedBy: getFullName(record.valuedBy?.firstName, record.valuedBy?.lastName) || record.valuedBy?.email || '',
          reviewStatus: record.reviewedById ? 'Reviewed' : 'Not Reviewed',
        });
      }
      // worksheet.addRow({
      //   plotNumber: record.plotNumber,
      //   location: record.address || '',
      //   extension: record.propertyLocation || '',
      //   valuationDate: record.valuationDate,
      //   landRate: formatAmount(record.landRate?.value || 0),
      //   landValue: formatAmount(record.landValue),
      //   developmentsValue: formatAmount(record.developmentsValue),
      //   capitalValue: formatAmount(record.capitalValue),
      //   valuedBy: getFullName(record.valuedBy?.firstName, record.valuedBy?.lastName) || record.valuedBy?.email || '',
      //   reviewStatus: record.reviewedById ? 'Reviewed' : 'Not Reviewed',
      // });
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
        'Content-Disposition': `attachment; filename=UnvaluedPlots.xlsx`,
      },
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error) || 'Something went wrong exporting tenants, please try again';
    console.log('export error', errorMessage);
    throw new Response(errorMessage, { status: StatusCode.BadRequest });
  }
}






// import type { Decimal } from '@prisma/client/runtime';

// import { createReadStream } from 'fs';
// import path from 'path';

// import { Response, redirect, type LoaderArgs } from '@remix-run/node';
// import { useLoaderData } from '@remix-run/react';
// import dayjs from 'dayjs';
// import ExcelJS from 'exceljs';

// import { prisma } from '~/db.server';
// import {
//   StatusCode,
//   formatAmount,
//   getGrcAndFees,
//   getGrcLessDepr,
//   getGrcTotal,
//   getMarketValue,
//   getSubjectBuildValue,
//   getSubjectLandValue,
//   roundDown,
// } from '~/models/core.validations';
// import { DATE_INPUT_FORMAT } from '~/models/dates';
// import { Env } from '~/models/environment';
// import { getErrorMessage } from '~/models/errors';
// import { AppLinks } from '~/models/links';
// import {
//   ValuationType,
//   getAnnualOutgoingsPerBoth,
//   getCapitalisedValue,
//   getGrossRental,
//   getMonthlyOutgoings,
//   getNetAnnualRentalIncome,
//   getTotalAreaPerBoth,
//   getTotalParkingPerBoth,
//   getTotalRentalPerBoth,
// } from '~/models/plots.validations';
// import { StoredValueId } from '~/models/storedValuest';
// import { requireUser } from '~/session.server';

// interface StoredValue {
//   identifier: string;
//   value: Decimal;
// }
// function getStoredValue(storedValues: StoredValue[], identifier: StoredValueId) {
//   if (!storedValues) {
//     return undefined;
//   }
//   const match = storedValues.find((el) => el.identifier === identifier);
//   if (!match) {
//     return undefined;
//   }
//   return { ...match, value: Number(match.value) };
// }
// function getStoredValues(storedValues: StoredValue[], ids: StoredValueId[]) {
//   return ids.map((id) => getStoredValue(storedValues, id));
// }

// export async function loader({ request }: LoaderArgs) {
//   const currentUser = await requireUser(request);

//   if (!currentUser.isSuper) {
//     return redirect(AppLinks.Home);
//   }

//   try {
//     const records = await prisma.plot
//       .findMany({
//         where: { council: true, valuedById: null },
//         select: {
//           undevelopedPortion: true,
//           rateForUndevelopedPortion: true,
//           address: true,
//           propertyLocation: true,
//           valuationType: true,
//           analysisDate: true,
//           plotNumber: true,
//           plotExtent: true,
//           storedValues: { select: { id: true, identifier: true, value: true } },
//           tenants: { select: { startDate: true, endDate: true, grossMonthlyRental: true, escalation: true, areaPerClient: true, areaPerMarket: true, ratePerMarket: true } },
//           parkingRecords: { select: { unitPerClient: true, ratePerClient: true, ratePerMarket: true } },
//           grcRecords: { select: { id: true, identifier: true, unit: true, size: true, rate: true, bull: true } },
//           grcFeeRecords: { select: { id: true, identifier: true, perc: true } },
//           grcDeprRecords: { select: { id: true, identifier: true, perc: true } },
//           mvRecords: { select: { id: true, identifier: true, size: true, date: true, location: true, price: true } },
//           outgoingRecords: { select: { itemType: true, unitPerClient: true, unitPerMarket: true, ratePerClient: true, ratePerMarket: true } },
//         },
//       })
//       .then((plots) => {
//         return plots.map((rawPlot) => {
//           const plot = {
//             ...rawPlot,
//             undevelopedPortion: Number(rawPlot.undevelopedPortion),
//             rateForUndevelopedPortion: Number(rawPlot.rateForUndevelopedPortion),
//             plotExtent: Number(rawPlot.plotExtent),
//             grcDeprRecords: rawPlot.grcDeprRecords.length ? rawPlot.grcDeprRecords : [{ id: '', identifier: '', perc: 0 }],
//             tenants: rawPlot.tenants.map((tenant) => ({
//               ...tenant,
//               startDate: dayjs(tenant.startDate).format('YYYY-MM-DD'),
//               endDate: dayjs(tenant.endDate).format('YYYY-MM-DD'),
//               remMonths: dayjs(tenant.endDate).diff(dayjs(), 'month'),
//               grossMonthlyRental: Number(tenant.grossMonthlyRental),
//               escalation: Number(tenant.escalation),
//               areaPerClient: Number(tenant.areaPerClient),
//               areaPerMarket: Number(tenant.areaPerMarket),
//               ratePerMarket: Number(tenant.ratePerMarket),
//             })),
//             parkingRecords: rawPlot.parkingRecords.map((record) => ({
//               ...record,
//               ratePerClient: Number(record.ratePerClient),
//               ratePerMarket: Number(record.ratePerMarket),
//             })),
//             outgoingRecords: rawPlot.outgoingRecords
//               .sort((a, b) => {
//                 const sortOrder: Record<string, number> = {
//                   '12': 1,
//                   '1': 2,
//                   '%': 3,
//                 } as const;
//                 return sortOrder[a.itemType || '12'] - sortOrder[b.itemType || '12'];
//               })
//               .map((record) => ({
//                 ...record,
//                 itemType: record.itemType || undefined,
//                 unitPerClient: Number(record.unitPerClient),
//                 ratePerClient: Number(record.ratePerClient),
//                 ratePerMarket: Number(record.ratePerMarket),
//               })),
//           };
//           const storedValues = getStoredValues(plot.storedValues, [
//             StoredValueId.LandRate,
//             StoredValueId.BuildRate,
//             StoredValueId.Perculiar,
//             StoredValueId.VacancyPercentage,
//             StoredValueId.RecoveryFigure,
//             StoredValueId.CapitalisationRate,
//           ]);
//           const [landRate, buildRate, perculiar, vacancyPercentage, recoveryFigure, capitalisationRate] = storedValues;

//           const subjectLandValue = getSubjectLandValue(plot.plotExtent, landRate?.value);
//           const subjectBuildValue = getSubjectBuildValue(plot.grcRecords, buildRate?.value);
//           const projectedValue = subjectLandValue + subjectBuildValue;

//           const marketValue = getMarketValue(projectedValue, perculiar?.value);
//           const sayMarket = roundDown(marketValue, -5);

//           const grcTotal = getGrcTotal(plot.grcRecords);
//           const netTotal = getGrcAndFees(grcTotal, plot.grcFeeRecords);
//           const deprTotal = getGrcLessDepr(grcTotal, netTotal, plot.grcDeprRecords);

//           const totalArea = getTotalAreaPerBoth(plot.tenants).client;

//           const totalRental = getTotalRentalPerBoth(
//             plot.tenants.map((tenant) => ({
//               ...tenant,
//               grossMonthlyRental: tenant.areaPerClient * tenant.ratePerMarket,
//             })),
//           );

//           const totalParking = getTotalParkingPerBoth(plot.parkingRecords);

//           const grossRental = getGrossRental(totalRental, totalParking);

//           const outgoings = (() => {
//             const annual = getAnnualOutgoingsPerBoth(plot.outgoingRecords);
//             return {
//               annual,
//               monthly: getMonthlyOutgoings(annual, totalArea),
//             };
//           })();

//           const netAnnualRentalIncome = getNetAnnualRentalIncome(grossRental.annual, outgoings.annual, vacancyPercentage?.value || 0, recoveryFigure?.value || 0, totalArea);

//           // const capitalisedValue = getCapitalisedValue(netAnnualRentalIncome, capitalisationRate?.value || 0);
//           // const capitalValue = subjectLandValue + deprTotal;
//           // const capitalValue = capitalisedValue;
//           const capitalValue = (() => {
//             if (rawPlot.valuationType === ValuationType.Commercial) {
//               return getCapitalisedValue(netAnnualRentalIncome, capitalisationRate?.value || 0);
//             }
//             return subjectLandValue + deprTotal;
//           })();

//           const improvementsValue = deprTotal;

//           return {
//             ...plot,
//             marketValue: sayMarket,
//             landValue: subjectLandValue,
//             landRate,
//             capitalValue,
//             valuationDate: plot.analysisDate,
//             developmentsValue: improvementsValue,
//             numStructures: plot.grcRecords.length,
//             plotSize: plot.plotExtent,
//             gba: plot.grcRecords.filter((el) => el.bull).reduce((acc, record) => acc + Number(record.size), 0),
//           };
//         });
//       });

//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('Tenants');

//     worksheet.columns = [
//       { header: 'Plot Number', key: 'plotNumber' },
//       { header: 'Location', key: 'location' },
//       { header: 'Valuation Date', key: 'valuationDate' },
//       { header: 'Land Rate', key: 'landRate' },
//       { header: 'Land Value', key: 'landValue' },
//       { header: 'Value of Developments', key: 'developmentsValue' },
//       { header: 'Capital Value', key: 'capitalValue' },
//     ];

//     records.forEach((record) => {
//       worksheet.addRow({
//         plotNumber: record.plotNumber,
//         location: record.address + ' ' + (record.propertyLocation || ''),
//         valuationDate: record.valuationDate,
//         landRate: formatAmount(record.landRate?.value || 0),
//         landValue: formatAmount(record.landValue),
//         developmentsValue: formatAmount(record.developmentsValue),
//         capitalValue: formatAmount(record.capitalValue),
//       });
//     });

//     let tempDir: string;
//     if (Env.NODE_ENV === 'development') {
//       tempDir = path.join(__dirname, `../../../../tmp/`);
//     } else {
//       tempDir = '/tmp/';
//     }

//     const filename = `${tempDir}_plots_${dayjs().format(DATE_INPUT_FORMAT)}`;
//     await workbook.xlsx.writeFile(filename);
//     const stream = createReadStream(filename);

//     return new Response(stream, {
//       status: 200,
//       headers: {
//         'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//         'Content-Disposition': `attachment; filename=plots.xlsx`,
//       },
//     });
//   } catch (error) {
//     const errorMessage = getErrorMessage(error) || 'Something went wrong exporting tenants, please try again';
//     console.log('export error', errorMessage);
//     throw new Response(errorMessage, { status: StatusCode.BadRequest });
//   }
// }

// export default function PlotsUnvaluedPlots() {
//   useLoaderData();

//   return (
//     <div>
//       <h1>Unknown Route</h1>
//     </div>
//   );
// }
