import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import '~/editor-styles.css';

import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { FormFields } from '~/models/forms';

import { json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { FormEvent, useEffect, useState } from 'react';
import { z } from 'zod';

import type { PartialBlock } from '@blocknote/core';
import { TabPanel, TabView } from 'primereact/tabview';
import { toast } from 'sonner';
import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { AddImage } from '~/components/AddImage';
import { AddMultipleImages } from '~/components/AddMultipleImages';
import { AddSectionButton } from '~/components/AddSectionButton';
import BackButton from '~/components/BackButton';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { Card } from '~/components/Card';
import { CardHeader } from '~/components/CardHeader';
import { EditConstruction } from '~/components/EditConstruction';
import { EditCustomFooter } from '~/components/EditCustomFooter';
import { EditCustomHeader } from '~/components/EditCustomHeader';
import { FormSelect } from '~/components/FormSelect';
import { FormTextField } from '~/components/FormTextField';
import { Image } from '~/components/Image';
import { InlineAlert } from '~/components/InlineAlert';
import NextButton from '~/components/NextButton';
import { ReportContextProvider } from '~/components/ReportContextProvider';
import { Services } from '~/components/Services';
import { TextField } from '~/components/TextField';
import { UpdatedSectionPanel } from '~/components/UpdatedSectionPanel';
import { prisma } from '~/db.server';
import { useSections } from '~/hooks/useSections';
import { ConstructionItemSchema, getValidatedConstructionItems } from '~/models/con-items';
import { RequiredImageIdSchema, StatusCode, badRequest, getValidatedId, processBadRequest, safeJsonParse } from '~/models/core.validations';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields, hasFieldErrors, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { getAnnualOutgoingsPerBoth, getCapitalisedValue, getGrossRental, getMonthlyOutgoings, getNetAnnualRentalIncome, getOutgoingsIncomeRatio, getTotalAreaPerBoth, getTotalParkingPerBoth, getTotalRentalPerBoth, getValuer, roundToDecimal } from '~/models/plots.validations';
import { Section } from '~/models/reports';
import { StoredValueId } from '~/models/storedValuest';
import { requireUser, requireUserId } from '~/session.server';

let landValue = 0;
let valueOfImprovements = 0;
let capValue = 0;
let sayMarket = 0;
let sayForced = 0;
let sayReplacementValue = 0;
// Commercial Data Values
let marketValueCom = 0;
let fsvCom = 0;
let totalReplacementValueCom = 0;
let capitalisedValueCom = 0;
let valueOfUndeveloped = 0;
let capitalisationRateCom = 0;

export async function loader({ request, params }: LoaderArgs) {
    console.log("SECOND PROPERTY PARAMS:", params);

    await requireUserId(request);

    const plotId = getValidatedId(params.plotId);
    const reportTemplateId = getValidatedId(params.reportTemplateId);

    const currentUser = await requireUser(request);

    const reportTemplate = await prisma.rptTemplate
        .findUnique({
            where: { id: reportTemplateId },
            select: {
                id: true,
                name: true,
                sections: {
                    select: {
                        id: true,
                        name: true,
                        subSections: {
                            select: {
                                id: true,
                                title: true,
                                content: true
                            },
                        }
                    }
                }
            },
        });

    const Plot = await prisma.plot
        .findUnique({
            where: { id: plotId },
            include: {
                sections: {
                    include: {
                        subSections: true,
                    }
                },
                clients: true,
                valuedBy: true,
                reviewedBy: true,
                images: true,
                plotAndComparables: {
                    include: {
                        comparablePlot: true
                    }
                },
                storedValues: true,
                valuers: true,
                tenants: { include: { propertyType: true } },
                parkingRecords: { include: { parkingType: true } },
                company: true,
                outgoingRecords: true,
                insuranceRecords: true,
                grcRecords: true,
                grcFeeRecords: true,
                grcDeprRecords: true,
                mvRecords: true,
                user: {
                    include: {
                        UserGroup: {
                            include: {
                                company: {
                                    select: {
                                        LogoLink: true,
                                        headerTitle: true,
                                        footerNote: true,
                                        reportTemplates: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        })
        .then((Plot) => {
            if (!Plot) {
                return undefined;
            }

            const constructionItems = getValidatedConstructionItems(Plot.constructionItems || '');

            const result = ServicesSchema.safeParse(Plot.services);
            const resultConstruction = ConstructionSchema.safeParse(Plot.construction);
            const valuer = getValuer(Plot.valuedBy);
            const reviewer = Plot.reviewedBy ? `${Plot.reviewedBy?.firstName} ${Plot.reviewedBy?.lastName} ` : undefined;
            const grcData = Plot.grcRecords.map((r) => {
                return {
                    identifier: r.identifier,
                    unit: r.unit,
                    size: r.size,
                }
            });
            return {
                ...Plot,
                constructionItems,
                services: result.data, construction: resultConstruction.data,
                valuer,
                reviewer,
                grcData,
                undevelopedPortion: Number(Plot.undevelopedPortion),
                rateForUndevelopedPortion: Number(Plot.rateForUndevelopedPortion),
                avgPrice: Plot.plotAndComparables.length
                    ? Plot.plotAndComparables.reduce((acc, plotAndComparable) => {
                        return acc + Number(plotAndComparable.comparablePlot.price);
                    }, 0) / Plot.plotAndComparables.length
                    : 0,
                plotExtent: Number(Plot.plotExtent),
                gba: Plot.grcRecords.filter((el) => el.bull).reduce((acc, record) => acc + Number(record.size), 0),
                tenants: Plot.tenants.map((tenant) => ({
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
                parkingRecords: Plot.parkingRecords.map((record) => ({
                    ...record,
                    unitPerClient: Number(record.unitPerClient),
                    unitPerMarket: Number(record.unitPerMarket),
                    ratePerClient: Number(record.ratePerClient),
                    ratePerMarket: Number(record.ratePerMarket),
                })),
                outgoingRecords: Plot.outgoingRecords
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
                insuranceRecords: Plot.insuranceRecords.map((record) => ({
                    ...record,
                    rate: Number(record.rate),
                    area: Number(record.area),
                })),
                grcRecords: Plot.grcRecords.map((record) => ({
                    ...record,
                    identifier: String(record.identifier),
                    unit: String(record.unit),
                    rate: Number(record.rate),
                    size: Number(record.size),
                })),
                grcFeeRecords: Plot.grcFeeRecords.map((record) => ({
                    ...record,
                    perc: Number(record.perc),
                })),
                mvRecords: Plot.mvRecords.map((record) => ({
                    ...record,
                    size: Number(record.size),
                    price: Number(record.price),
                })),
                grcDeprRecords: (() => {
                    const records = Plot.grcDeprRecords.map((record) => ({
                        ...record,
                        perc: Number(record.perc),
                    }));
                    if (records.length) {
                        return records;
                    }
                    return [{ id: '', identifier: '', perc: 0 }];
                })(),
            };
        })
        .then(async (plot) => {
            if (!plot) {
                return undefined;
            }
            if (!plot.valuer) {
                const { valuedBy } = await prisma.plot.update({
                    where: { id: plot.id },
                    data: { valuedById: currentUser.id },
                    include: { valuedBy: true },
                });
                const valuer = getValuer(valuedBy);
                return { ...plot, valuer };
            }
            return plot;
        });
    if (!Plot) {
        throw new Response('Plot record not found', {
            status: StatusCode.NotFound,
        });
    }

    function getStoredValue(identifier: StoredValueId) {
        if (!Plot) {
            return undefined;
        }
        const match = Plot.storedValues.find((el) => el.identifier === identifier);
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

    capitalisationRateCom = Number(capitalisationRate?.value);
    const avgPrice = Plot.avgPrice;

    const marketValue = avgPrice + Number(avgPrice * (perculiar?.value || 0) * 0.01);
    sayMarket = marketValue;

    const forcedSaleValue = marketValue * 0.9;
    sayForced = forcedSaleValue;

    const grcTotal = Plot.grcRecords.reduce((acc, record) => acc + record.rate * record.size, 0);

    sayReplacementValue = grcTotal;

    const netTotal =
        grcTotal +
        Plot.grcFeeRecords.reduce((acc, record) => {
            const rowTotal = Number((record.perc * 0.01 * grcTotal).toFixed(2));
            return acc + rowTotal;
        }, 0);

    const deprTotal =
        netTotal -
        Plot.grcDeprRecords.reduce((acc, record) => {
            const rowTotal = record.perc * 0.01 * grcTotal;
            return acc + rowTotal;
        }, 0);

    // LandRate
    const landRate = getStoredValue(StoredValueId.LandRate);

    // LandValue
    const subjectLandValue = (landRate?.value || 0) * Plot.plotExtent;
    landValue = subjectLandValue;


    // CapitalValue
    const capitalValue = subjectLandValue + deprTotal;
    capValue = capitalValue;


    // Value Of Improvements/ Developments
    const improvementsValue = deprTotal;
    valueOfImprovements = improvementsValue;

    console.log('Land Value: ', landValue)
    console.log('Value of Developments: ', valueOfImprovements)
    console.log('Capital Value: ', capValue)

    // Commercial Summary Data
    const totalArea = getTotalAreaPerBoth(Plot.tenants).client;

    const GLA = Plot.tenants.reduce((acc, tenant) => acc + tenant.areaPerClient, 0);

    const totalRental = getTotalRentalPerBoth(
        Plot.tenants.map((tenant) => ({
            ...tenant,
            grossMonthlyRental: tenant.areaPerClient * tenant.ratePerMarket,
        })),
    );

    const totalParking = getTotalParkingPerBoth(Plot.parkingRecords);

    const grossRental = getGrossRental(totalRental, totalParking);

    const outgoings = (() => {
        const annual = getAnnualOutgoingsPerBoth(Plot.outgoingRecords);
        return {
            annual,
            monthly: getMonthlyOutgoings(annual, totalArea),
        };
    })();

    const outgoingsRentalRatio = getOutgoingsIncomeRatio(outgoings.annual, grossRental.annual);

    const netAnnualRentalIncome = getNetAnnualRentalIncome(grossRental.annual, outgoings.annual, vacancyPercentage?.value || 0, recoveryFigure?.value || 0, totalArea);
    // land Value
    valueOfUndeveloped = roundToDecimal((Plot.undevelopedPortion || 0) * (Plot.rateForUndevelopedPortion || 0), 2);
    // Capital Value
    capitalisedValueCom = getCapitalisedValue(netAnnualRentalIncome, capitalisationRate?.value || 0);

    const capitalisedFigure = totalArea ? Number((capitalisedValueCom / totalArea).toFixed(2)) : 0;
    // Market Value
    marketValueCom = roundToDecimal(capitalisedValueCom + valueOfUndeveloped, 2);
    // Forced Sale Value
    fsvCom = marketValueCom - (fsvAdjustment?.value || 0) * 0.01 * marketValueCom;

    const subTotal = Plot.insuranceRecords.reduce((acc, record) => {
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

    totalReplacementValueCom = (() => {
        const result = replacementCost + preTenderEscl + postTenderEscl;
        return roundToDecimal(result, 2);
    })();

    const canEdit = (!Plot.valuedById && !Plot.reviewedById) || currentUser.isSuper;

    return json({
        Plot,
        reportTemplate,
        sayMarket,
        sayForced,
        sayReplacementValue,
        subjectLandValue,
        deprTotal,
        capitalValue,
        improvementsValue,
        netTotal,
        landValue,
        capValue,

        // Commercial Summary Data
        valueOfUndeveloped,
        fsvCom,
        GLA,
        canEdit,
        annualGross: grossRental.annual,
        netAnnualRentalIncome,
        outgoings,
        outgoingsRentalRatio,
        capitalisationRate,
        vacancyPercentage,
        capitalisedValueCom,
        capitalisedFigure,
        totalReplacementValueCom,
        marketValueCom,
    });
}

const ConstructionSchema = z.preprocess((data: unknown) => {
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch (error) {
            return undefined;
        }
    }
}, z.array(z.string()));

const ServicesSchema = z.preprocess((data: unknown) => {
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch (error) {
            return undefined;
        }
    }
}, z.array(z.string()));

const SubSectionSchema = z.object({
    title: z.string(),
    content: z.string()
});
const SectionSchema = z.object({
    name: z.string().min(1),
    subSections: z.preprocess(safeJsonParse, SubSectionSchema.array())
});
const Schema = z.object({
    headerTitle: z.string(),
    footerNote: z.string(),

    sections: z.preprocess(safeJsonParse, SectionSchema.array()),
    // construction: ConstructionSchema,
    constructionItems: z.preprocess(safeJsonParse, ConstructionItemSchema.array()),

    plotNumber: z.string().min(1),
    inspectionDate: z.coerce.date(),
    analysisDate: z.coerce.date(),
    services: ServicesSchema,
    plotExtent: z.coerce.number().positive(),
    address: z.string().min(1),
    zoning: z.string().min(1),
    numAirCon: z.coerce.number().int(),
    numParkingBays: z.coerce.number().int(),
    titleDeedNum: z.string().min(1),
    titleDeedDate: z.coerce.date(),
    usage: z.string().min(1),

    longitude: z.coerce.number(),
    latitude: z.coerce.number(),

    // marketValue: z.coerce.number(),

    summaryOfValuation: z.coerce.string(),
    opinionOfValue: z.coerce.string(),
    scopeOfWork: z.coerce.string(),
    basesOfValue: z.coerce.string(),
    scopeOfEquity: z.coerce.string(),
    propertyDetails: z.coerce.string(),
    reportTemplateId: z.coerce.string().min(1),
    tableOfContents: z.coerce.string().min(1),

    // mapLabel: z.string(),
    coverImageId: RequiredImageIdSchema,
    imageIds: z.preprocess(safeJsonParse, z.array(RequiredImageIdSchema)),
});

export const action = async ({ params, request }: ActionArgs) => {
    const currentUserId = await requireUserId(request);
    const plotId = getValidatedId(params.plotId);
    const templateId = getValidatedId(params.reportTemplateId);

    const currentUser = await requireUser(request);

    if (!currentUser) {
        return badRequest({ formError: 'User not found' });
    }
    if (!currentUserId) {
        return badRequest({ formError: 'User ID not found' });
    }
    try {
        const fields = await getRawFormFields(request);
        // console.log('Form fields:', fields);

        const result = Schema.safeParse(fields);
        if (!result.success) {
            return processBadRequest(result.error, fields);
        }

        const {
            sections,
            plotNumber,
            inspectionDate,
            analysisDate,
            services,
            // construction,
            constructionItems,
            plotExtent,
            address,
            zoning,
            numAirCon,
            numParkingBays,
            titleDeedNum,
            titleDeedDate,
            usage,
            longitude,
            latitude,
            // marketValue,
            basesOfValue,
            opinionOfValue,
            propertyDetails,
            scopeOfEquity,
            summaryOfValuation,
            scopeOfWork,
            reportTemplateId,
            tableOfContents,
            coverImageId,
            imageIds,
            headerTitle,
            footerNote,
        } = result.data;

        if (!imageIds.length) {
            return badRequest({ formError: 'Provide images of the asset' });
        }

        const plot = await prisma.plot.findUnique({
            where: { id: plotId },
        });
        if (!plot) {
            throw new Error('Plot record not found');
        }

        await prisma.$transaction(async (tx) => {
            const existingSections = await tx.reportSection.findMany({
                where: { plotId },
            });
            await tx.reportSubSection.deleteMany({
                where: { sectionId: { in: existingSections.map((section) => section.id) } },
            });
            await tx.reportSection.deleteMany({
                where: { plotId },
            });
            // await tx.reportSection.deleteMany({
            //   where: { plotId },
            // });
            const updated = await tx.plot.update({
                where: { id: plotId },
                data: {
                    sections: {
                        create: sections.map((section, index) => ({
                            refNumber: index,
                            name: section.name,
                            subSections: {
                                create: section.subSections.map((subSection) => ({
                                    title: subSection.title,
                                    content: subSection.content,
                                })),
                            },
                        })),
                    },
                    headerTitle,
                    footerNote,
                    plotNumber,
                    inspectionDate,
                    analysisDate,
                    services: JSON.stringify(services),
                    // construction: JSON.stringify(construction),
                    constructionItems: JSON.stringify(constructionItems),
                    plotExtent,
                    address,
                    zoning,
                    numAirCon,
                    numParkingBays,
                    titleDeedNum,
                    titleDeedDate,
                    usage,
                    longitude,
                    latitude,
                    // marketValue,
                    basesOfValue,
                    opinionOfValue,
                    propertyDetails,
                    scopeOfEquity,
                    summaryOfValuation,
                    scopeOfWork,
                    reportTemplateId,
                    tableOfContents,
                    coverImageId,
                },
            });

            console.log('Finished Plot Update Transaction');
            await tx.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.Plot,
                    action: EventAction.Update,
                    recordId: plotId,
                    recordData: JSON.stringify({ from: plot, to: updated }),
                },
            });

            const updatedValuationsHistory = await tx.valuationsHistory.upsert({
                where: { id: plotId },
                update: {
                    plotNumber,
                    inspectionDate,
                    analysisDate,
                    services: JSON.stringify(services),
                    // construction: JSON.stringify(construction),
                    plotExtent,
                    address,
                    zoning,
                    numAirCon,
                    numParkingBays,
                    numOfStructures: plot.numOfStructures,
                    titleDeedNum,
                    titleDeedDate,
                    usage,
                    longitude,
                    latitude,
                    basesOfValue,
                    opinionOfValue,
                    propertyDetails,
                    scopeOfEquity,
                    summaryOfValuation,
                    scopeOfWork,
                    reportTemplateId,
                    tableOfContents,

                    marketValue: Number(plot.valuationType === 'Residential' ? sayMarket : marketValueCom),
                    fairValue: Number(plot.valuationType === 'Residential' ? sayMarket : marketValueCom),
                    forcedSaleValue: Number(plot.valuationType === 'Residential' ? sayForced : fsvCom),
                    insuranceReplacementCost: Number(plot.valuationType === 'Residential' ? 0.00 : totalReplacementValueCom),
                    capRate: plot.valuationType === 'Residential' ? plot.capRate ?? 0.00 : capitalisationRateCom,
                    capitalValue: Number(plot.valuationType === 'Residential' ? capValue : capitalisedValueCom),
                    landValue: Number(plot.valuationType === 'Residential' ? landValue : valueOfUndeveloped),

                    accommodation: plot.accommodation,
                    highest: plot.highest,
                    marketCondition: plot.marketCondition,
                    propertyLocation: plot.propertyLocation,
                    Boundary: plot.Boundary,
                    Paving: plot.Paving,
                    Perimeter: plot.Perimeter,
                    SwimmingPool: plot.SwimmingPool,
                    ZoneValue: plot.ZoneValue,
                    classification: plot.classification,
                    hasBeenZeroReviewed: plot.hasBeenZeroReviewed,
                    undevelopedPortion: plot.undevelopedPortion,
                    valuationDone: plot.valuationDone,
                    valuationType: plot.valuationType,
                    valuer: plot.valuer,
                    valuerComments: plot.valuerComments,
                    companyId: plot.companyId,
                },
                create: {
                    id: plotId,
                    plotId: plotId,
                    plotNumber,
                    inspectionDate,
                    analysisDate,
                    services: JSON.stringify(services),
                    // construction: JSON.stringify(construction),
                    plotExtent,
                    address,
                    zoning,
                    numAirCon,
                    numParkingBays,
                    numOfStructures: plot.numOfStructures,
                    titleDeedNum,
                    titleDeedDate,
                    usage,
                    longitude,
                    latitude,
                    basesOfValue,
                    opinionOfValue,
                    propertyDetails,
                    scopeOfEquity,
                    summaryOfValuation,
                    scopeOfWork,
                    reportTemplateId,
                    tableOfContents,

                    marketValue: Number(plot.valuationType === 'Residential' ? sayMarket : marketValueCom),
                    fairValue: Number(plot.valuationType === 'Residential' ? sayMarket : marketValueCom),
                    forcedSaleValue: Number(plot.valuationType === 'Residential' ? sayForced : fsvCom),
                    insuranceReplacementCost: Number(plot.valuationType === 'Residential' ? 0.00 : totalReplacementValueCom),
                    capRate: plot.valuationType === 'Residential' ? plot.capRate ?? 0.00 : capitalisationRateCom,
                    capitalValue: Number(plot.valuationType === 'Residential' ? capValue : capitalisedValueCom),
                    landValue: Number(plot.valuationType === 'Residential' ? landValue : valueOfUndeveloped),

                    accommodation: plot.accommodation,
                    highest: plot.highest,
                    marketCondition: plot.marketCondition,
                    propertyLocation: plot.propertyLocation,
                    Boundary: plot.Boundary,
                    Paving: plot.Paving,
                    Perimeter: plot.Perimeter,
                    SwimmingPool: plot.SwimmingPool,
                    ZoneValue: plot.ZoneValue,
                    classification: plot.classification,
                    hasBeenZeroReviewed: plot.hasBeenZeroReviewed,
                    undevelopedPortion: plot.undevelopedPortion,
                    valuationDone: plot.valuationDone,
                    valuationType: plot.valuationType,
                    valuer: plot.valuer,
                    valuerComments: plot.valuerComments,
                    companyId: plot.companyId,
                },
            });
            console.log('Finished Valuations History Update Transaction');
            await tx.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.ValuationsHistory,
                    action: EventAction.Create,
                    recordId: plotId,
                    recordData: JSON.stringify({ from: plot, to: updatedValuationsHistory }),
                },
            });

            console.log('Created Plot Update Event');
            await tx.image.deleteMany({
                where: { plotId },
            });
            await tx.image.createMany({
                data: imageIds.map((imageId) => ({
                    imageId,
                    plotId,
                })),
            });

            const images = await tx.image.findMany({
                where: { plotId },
            });
            await tx.event.createMany({
                data: images.map((image) => ({
                    userId: currentUserId,
                    domain: EventDomain.Image,
                    action: EventAction.Create,
                    recordId: image.id,
                    recordData: JSON.stringify(image),
                })),
            });
        });

        toast.success("Updated successfully")
        return redirect(AppLinks.ReportContent(plotId, templateId));

    } catch (error) {
        if (error instanceof Error) {
            console.error("Error message: ", error.message);
            return badRequest({ formError: error.message });
        } else {
            console.error("Unexpected error: ", error);
            return badRequest({ formError: 'An unexpected error occurred' });
        }
    }
};

export default function PlotValuerDetails() {
    const { Plot, reportTemplate, sayMarket, sayForced, sayReplacementValue, fsvCom, totalReplacementValueCom, marketValueCom } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();

    const { getNameProp, isProcessing } = useForm(fetcher, Schema);

    const [coverImageId, setCoverImageId] = useState(Plot.coverImageId || '');
    const [imageIds, setImageIds] = useState<string[]>(Plot.images.map((imageId) => imageId.imageId) || []);

    const addImages = (imageIds: string[]) => setImageIds((prevState) => [...prevState, ...imageIds]);

    const removeImage = (imageId: string) => setImageIds((prevState) => prevState.filter((id) => id !== imageId));

    const defaultValues: FormFields<keyof z.infer<typeof Schema>> = {
        plotNumber: String(Plot.plotNumber),
        inspectionDate: dayjs(Plot.inspectionDate).format('YYYY-MM-DD'),
        analysisDate: dayjs(Plot.analysisDate).format('YYYY-MM-DD'),
        plotExtent: String(Plot.plotExtent),
        address: Plot.address,
        zoning: Plot.zoning,
        numAirCon: String(Plot.numAirCon),
        numParkingBays: String(Plot.numParkingBays),
        titleDeedNum: Plot.titleDeedNum || '',
        titleDeedDate: dayjs(Plot.titleDeedDate || '').format('YYYY-MM-DD'),
        usage: Plot.usage,

        longitude: Plot.longitude || '',
        latitude: Plot.latitude || '',

        summaryOfValuation: '',
        opinionOfValue: '',
        scopeOfWork: '',
        basesOfValue: '',
        scopeOfEquity: '',
        propertyDetails: '',

        tableOfContents: '',

        coverImageId: Plot.coverImageId,
        imageIds: JSON.stringify(Plot.images.map((image) => image.imageId)),
    };

    useEffect(() => {
        if (hasFormError(fetcher.data)) {
            toast.error(fetcher.data.formError);
        }
    }, [fetcher.data]);

    const coverImageError = (() => {
        if (!hasFieldErrors(fetcher.data)) {
            return undefined;
        }
        const fieldError = fetcher.data.fieldErrors[getNameProp('coverImageId').name];
        if (!fieldError) {
            return undefined;
        }
        return fieldError.join(', ');
    })();

    const imagesError = (() => {
        if (!hasFieldErrors(fetcher.data)) {
            return undefined;
        }
        const fieldError = fetcher.data.fieldErrors[getNameProp('imageIds').name];
        if (!fieldError) {
            return undefined;
        }
        return fieldError.join(', ');
    })();


    const [MarketValue] = useState(Plot.valuationType === 'Residential' ? sayMarket : marketValueCom);
    const [ForcedSaleValue] = useState(Plot.valuationType === 'Residential' ? sayForced : fsvCom);
    const [ReplacementValue] = useState(Plot.valuationType === 'Residential' ? sayReplacementValue : totalReplacementValueCom);

    //   // NAKE CERTAIN TEXT FIELDS EDITABLE BUT WITH DEFAULT VALUES
    const [address, setAddress] = useState(Plot.address);
    const [usage, setUsage] = useState(Plot.usage);

    const [InspectionDate, setInspectionDate] = useState(Plot.inspectionDate);
    const [AnalysisDate, setAnalysisDate] = useState(Plot.analysisDate);

    const [titleDeedNumber, setTitleDeedNumber] = useState(Plot.titleDeedNum);
    const [titleDeedDate, setTitleDeedDate] = useState(Plot.titleDeedDate);

    const [longitude, setLongitude] = useState(Plot.longitude);
    const [latitude, setLatitude] = useState(Plot.latitude);

    const [zoning, setZoning] = useState(Plot.zoning);

    const parsedInitialSections: Section[] = (() => {
        try {
            if (!reportTemplate) {
                return Plot.sections.map(section => {
                    const subSections = section.subSections.map(subSection => {
                        return ({
                            hasTitle: !!subSection.title,
                            title: subSection.title || '',
                            content: getParsedInitialContent(subSection.content),
                        });
                    });
                    return ({
                        name: section.name,
                        subSections,
                    });
                });
            }
            return reportTemplate.sections.map((templateSection) => {
                const subSections = templateSection.subSections.map(templateSubSection => {
                    const reportSubSections = Plot.sections.flatMap(reportSection => {
                        return reportSection.subSections;
                    });
                    const matchingReportSubSection = reportSubSections.find(rs => {
                        return rs.templateSubSectionId === templateSubSection.id;
                    });
                    const content = getParsedInitialContent(matchingReportSubSection?.content, templateSubSection.content);
                    return {
                        hasTitle: matchingReportSubSection ?
                            !!matchingReportSubSection.title :
                            !!templateSubSection.title,
                        title: templateSubSection.title || '',
                        content,
                    };
                });
                return {
                    name: templateSection.name,
                    subSections,
                }
            });
        } catch (error) {
            return [];
        }
    })();

    function getParsedInitialContent(...data: (string | undefined | null)[]) {
        for (const datum of data) {
            if (!datum) {
                continue;
            }
            try {
                return JSON.parse(datum) as PartialBlock[];
            } catch (error) {
                continue;
            }
        }
        return [];
    }

    /**************************************************************** */

    const { sections, ...sectionMethods } = useSections(parsedInitialSections);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        console.log("Handling submit...");
        const formData = new FormData(event.currentTarget);
        const sectionData = JSON.stringify(sections.current.map(s => ({
            ...s,
            subSections: JSON.stringify(s.subSections.map(ss => ({
                ...ss,
                content: JSON.stringify(ss.content),
            }))),
        })));
        // const sectionData = JSON.stringify(sections.current.map(s => {
        //     return {
        //         ...s,
        //         subSections: s.subSections.map(ss => {
        //             return {
        //                 ...ss,
        //                 content: JSON.stringify(ss.content)
        //             }
        //         }),
        //     }
        // }));
        formData.append("sections", sectionData);
        fetcher.submit(formData, { method: "post" });
    }

    /**************************************************************** */

    const [activeIndex, setActiveIndex] = useState(3);

    return (
        <fetcher.Form method="post" onSubmit={handleSubmit} className="flex flex-col items-stretch gap-6">
            <ActionContextProvider {...fetcher.data} fields={fetcher.data?.fields || defaultValues} isSubmitting={isProcessing} >

                <input type="hidden" name='MarketValue' value={MarketValue} />
                <input type="hidden" name='ForcedSaleValue' value={ForcedSaleValue} />
                <input type="hidden" name='ReplacementValue' value={ReplacementValue} />
                <input type="hidden" {...getNameProp('coverImageId')} value={coverImageId} />
                <input type="hidden" {...getNameProp('imageIds')} value={JSON.stringify(imageIds)} />
                <TabView className="custom-tabview" activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
                    <TabPanel
                        header={
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = AppLinks.ClientType(Plot.id!);
                                }}
                            >
                                Client Type
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
                                    window.location.href = AppLinks.ClientDetails(Plot.id);
                                }}
                            >
                                Client Details
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
                                    window.location.href = AppLinks.ValuerDetails(Plot.id);
                                }}
                            >
                                Valuer Details
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
                                    window.location.href = AppLinks.SecondPropertyDetails(Plot.id, reportTemplate?.id!);
                                }}
                            >
                                Asset Details
                            </span>
                        }
                        className="p-2"
                        headerClassName={`${activeIndex === 3 ? 'active-tab' : 'default-tab'}`}
                    >




                        <Card>
                            <CardHeader className="flex flex-col items-center gap-4">
                                <h2 className="text-xl font-semibold">4. Asset Details</h2>
                            </CardHeader>
                            <div className="flex flex-col items-stretch p-4">
                                <div className="grid grid-cols-3 gap-6">
                                    <TextField value={Plot.propertyId} label="Asset ID" className="font-normal" disabled required />
                                    <FormTextField {...getNameProp('plotNumber')} label="Plot Number" defaultValue={Plot.plotNumber} />
                                    <FormTextField {...getNameProp('plotExtent')} type="number" step={0.01} label="Plot Extent" defaultValue={Plot.plotExtent} />
                                    <FormTextField {...getNameProp('inspectionDate')} type="date" label="Inspection Date" defaultValue={new Date(Plot.inspectionDate).toISOString().split('T')[0]} onChange={(e) => setInspectionDate(e.target.value)} value={new Date(InspectionDate).toISOString().split('T')[0]} />
                                    <FormTextField {...getNameProp('analysisDate')} type="date" label="Valuation Date" defaultValue={new Date(Plot.analysisDate).toISOString().split('T')[0]} onChange={(e) => setAnalysisDate(e.target.value)} value={new Date(AnalysisDate).toISOString().split('T')[0]} />
                                    <FormTextField {...getNameProp('address')} label="Address" defaultValue={(Plot.address === undefined) ? (Plot.plotNumber + ',' + Plot.propertyLocation) : ''} value={address} onChange={(e) => setAddress(e.target.value)} />

                                    <input type="hidden" {...getNameProp('numParkingBays')} value="1" />
                                    <input type="hidden" {...getNameProp('numAirCon')} value="1" />

                                    <FormTextField {...getNameProp('titleDeedNum')} label="Title Deed Number" value={String(titleDeedNumber)} onChange={(e) => setTitleDeedNumber(e.target.value)} required />
                                    <FormTextField {...getNameProp('titleDeedDate')} type="date" label="Title Deed Date" defaultValue={new Date(Plot.titleDeedDate).toISOString().split('T')[0]} onChange={(e) => setTitleDeedDate(e.target.value)} value={new Date(titleDeedDate).toISOString().split('T')[0]} required />
                                    <FormTextField
                                        {...getNameProp('usage')}
                                        label="Land Use"
                                        value={usage}
                                        onChange={(e) => setUsage(e.target.value)}
                                    />
                                    <div className="col-span-2 flex flex-col items-stretch gap-3 p-2 rounded-md border border-gray-300">
                                        <span className="text-sm">
                                            GPS Coordinates of the asset:
                                        </span>
                                        {/* <FormTextField {...getNameProp('mapLabel')} label="Enter Map Label" defaultValue={String(plot.mapLabel)} value={String(maplabel)} onChange={(e) => setMapLabel(e.target.value)} /> */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <FormTextField
                                                {...getNameProp('longitude')}
                                                type="number"
                                                step={0.0000000001}
                                                label="Longitude (|)"
                                                value={Number(longitude)} onChange={(e) => setLongitude(e.target.value)}
                                            // required
                                            />
                                            <FormTextField
                                                {...getNameProp('latitude')}
                                                type="number"
                                                step={0.0000000001}
                                                label="Latitude (--)"
                                                value={Number(latitude)} onChange={(e) => setLatitude(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <FormSelect
                                        {...getNameProp('zoning')}
                                        label="Zoning"
                                        disabled={isProcessing}
                                        value={zoning}
                                        onChange={(e) => setZoning(e.target.value)}
                                    >
                                        {['Residential', 'Industrial', 'Commercial', 'Agricultural', 'Mixed Use'].map((item) => (
                                            <option key={item} value={item}>
                                                {item}
                                            </option>
                                        ))}
                                    </FormSelect>
                                    <span className="text-sm flex flex-row items-stretch font-light text-stone-600">Services</span>
                                    <div className="col-span-3 flex flex-col items-stretch">
                                        <Services services={Plot.services || []} />
                                    </div>
                                    <span className="text-sm flex flex-row items-stretch font-light text-stone-600">Construction</span>
                                    <div className="col-span-3 flex flex-col items-stretch">
                                        <EditConstruction
                                            savedItems={Plot.constructionItems}
                                            fieldName={getNameProp('constructionItems').name}
                                        />
                                        {/* <Construction construction={Plot.construction || []} /> */}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className='mt-4'>
                            <CardHeader className="flex flex-col items-center gap-4">
                                <h2 className="text-xl font-semibold">Property Images</h2>
                            </CardHeader>
                            <div className="flex flex-col items-stretch col-span-3 gap-2 p-4">
                                <span className="text-sm font-light text-stone-600">Cover Image</span>
                                <div className="grid grid-cols-4 gap-4">
                                    {!!coverImageId && <Image key={coverImageId} imageId={coverImageId} removeImage={() => setCoverImageId('')} />}
                                    {!coverImageId && (
                                        <AddImage
                                            handleUploadedImages={(imageIds) => {
                                                const newImageId = imageIds.length ? imageIds[0] : '';
                                                setCoverImageId(newImageId);
                                            }}
                                            singleUpload
                                        />
                                    )}
                                </div>
                                {!!coverImageError && <InlineAlert>{coverImageError}</InlineAlert>}
                            </div>
                            <div className="flex flex-col items-stretch col-span-3 gap-2 p-4">
                                <span className="text-sm font-light text-stone-600">Multiple File attachments (<span className='text-red-600'>Maximum 8 images</span>)</span>
                                <div className="grid grid-cols-4 gap-4">
                                    {imageIds.map((imageId) => (
                                        <Image key={imageId} imageId={imageId} removeImage={() => removeImage(imageId)} />
                                    ))}
                                    {/* <AddImage key="internal" handleUploadedImages={addImages} /> */}
                                    <AddMultipleImages handleUploadedImages={addImages} />
                                </div>
                                {!!imagesError && <InlineAlert>{imagesError}</InlineAlert>}
                            </div>
                        </Card>

                        <Card className='hidden'>
                            <CardHeader className="flex flex-col justify-center items-center">
                                <h2 className="text-xl font-semibold">Report Content</h2>
                            </CardHeader>
                            <div className="hidden flex-col items-stretch p-4 pt-6">
                                <EditCustomHeader
                                    currentTitle={Plot.user.UserGroup?.company.headerTitle || ''}
                                    fieldName={getNameProp('headerTitle').name}
                                    logoPublicId={Plot.user.UserGroup?.company.LogoLink}
                                />
                            </div>
                            <div className="hidden flex-col items-stretch p-4 pt-6">
                                <EditCustomFooter
                                    currentTitle={Plot.user.UserGroup?.company.footerNote || ''}
                                    fieldName={getNameProp('footerNote').name}
                                />
                            </div>
                            <ReportContextProvider sections={[]} {...sectionMethods}>
                                <div className="flex flex-col gap-4 p-4">
                                    {sections.current.map((section, index) => (
                                        <UpdatedSectionPanel
                                            index={index}
                                            key={index}
                                            editable={true}
                                            section={section}
                                        />
                                    ))}
                                    <div className="flex flex-col items-start">
                                        <AddSectionButton fn={sectionMethods.addSection}>
                                            Add Section
                                        </AddSectionButton>
                                    </div>
                                </div>
                            </ReportContextProvider>
                        </Card>



                    </TabPanel>

                    <TabPanel
                        header={
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = AppLinks.ReportContent(Plot.id, reportTemplate?.id!);
                                }}
                            >
                                Report Content
                            </span>
                        }
                        className="p-2"
                        headerClassName={`${activeIndex === 4 ? 'active-tab' : 'default-tab'}`}
                    >


                    </TabPanel>

                    <TabPanel
                        header={
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = AppLinks.SecondValuationReport(Plot.id);
                                }}
                            >
                                Report Preview
                            </span>
                        }
                        className="p-2"
                        headerClassName={`${activeIndex === 5 ? 'active-tab' : 'default-tab'}`}
                    >



                    </TabPanel>

                </TabView>

                {hasFormError(fetcher.data) && <InlineAlert>{fetcher.data.formError}</InlineAlert>}
                <div className="flex flex-row items-center gap-4 mt-4">
                    <BackButton />
                    <div className="grow" />
                    <NextButton type="submit" isProcessing={isProcessing} />
                </div>
            </ActionContextProvider>
        </fetcher.Form>
    );
}

export function ErrorBoundary() {
    return <RouteErrorBoundary />;
}