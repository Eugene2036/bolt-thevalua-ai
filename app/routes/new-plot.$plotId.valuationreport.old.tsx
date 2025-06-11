import '~/print-pages.css';

import { PartialBlock } from '@blocknote/core';
import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { IconArrowUp } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';
import { ToWords } from 'to-words';
import { z } from 'zod';
import { useForm } from '~/components/ActionContextProvider';
import { SecondValuationReport } from '~/components/SecondValuationReport';
import { prisma } from '~/db.server';
import { getValidatedConstructionItems } from '~/models/con-items';
import { StatusCode, badRequest, formatAmount, getFullName, getQueryParams, getValidatedId, hasSuccess, processBadRequest } from '~/models/core.validations';
import { DATE_INPUT_FORMAT } from '~/models/dates';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { getAnnualOutgoingsPerBoth, getCapitalisedValue, getGrossRental, getMonthlyOutgoings, getNetAnnualRentalIncome, getOutgoingsIncomeRatio, getTotalAreaPerBoth, getTotalParkingPerBoth, getTotalRentalPerBoth, getValuer, roundToDecimal } from '~/models/plots.validations';
import { ReportCommentSchema } from '~/models/report-comments';
import { reportContentReplacer } from '~/models/reports';
import { StoredValueId } from '~/models/storedValuest';
import { action as commentAction } from "~/routes/record-report-comment";
import { requireUser, requireUserId } from '~/session.server';
import { useUser } from '~/utils';
import { getMVAnalysisData } from '~/models/mv-analysis.server';

let landValue = 0;

export async function loader({ request, params }: LoaderArgs) {
    const currentUser = await requireUser(request);

    const plotId = getValidatedId(params.plotId);

    const queryParams = getQueryParams(request.url, ['redirectTo']);
    const redirectTo = queryParams.redirectTo || '';

    const company = await prisma.user.findUnique({
        where: { id: currentUser.id },
        include: {
            UserGroup: {
                include: {
                    company: {
                        include: {
                            CompanyImage: true,
                        }
                    }
                },
            },
        },
    });
    const templateData = await prisma.reportTemplate.findFirst({ where: { companyId: company?.UserGroup?.company.id } });

    const companyPartners = await prisma.companyImage.findMany({
        where: {
            companyId: company?.UserGroup?.company.id
        }
    });

    const Plot = await prisma.plot
        .findUnique({
            where: { id: plotId },
            include: {
                sections: {
                    include: { subSections: true }
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
                parkingRecords: true,
                insuranceRecords: true,
                outgoingRecords: true,
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
                                        reportTemplates: true,
                                    },
                                    // include: {
                                    //     reportTemplates: true,
                                    // },
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

            const valuer = getValuer(Plot.valuedBy);
            const reviewer = Plot.reviewedBy ? `${Plot.reviewedBy?.firstName} ${Plot.reviewedBy?.lastName}` : undefined;
            const services = (() => {
                console.log("Proc", Plot.services);
                try {
                    if (!Plot.services) {
                        return '';
                    }
                    const result = z.string().array().parse(JSON.parse(Plot.services));
                    console.log("Services", result);
                    return result.length ? result.join(", ") : '';
                } catch (err) {
                    console.log("Err", err);
                    return '';
                }
            })();
            return {
                ...Plot,
                constructionItems,
                services,
                valuer,
                reviewer,
                templateData,
                avgPrice: Plot.plotAndComparables.length
                    ? Plot.plotAndComparables.reduce((acc, plotAndComparable) => {
                        return acc + Number(plotAndComparable.comparablePlot.price);
                    }, 0) / Plot.plotAndComparables.length
                    : 0,
                plotExtent: Number(Plot.plotExtent),
                gba: Plot.grcRecords.filter((el) => el.bull).reduce((acc, record) => acc + Number(record.size), 0),
                parkingRecords: Plot.parkingRecords.map((record) => ({
                    ...record,
                    unitPerClient: Number(record.unitPerClient),
                    ratePerClient: Number(record.ratePerClient),
                    ratePerMarket: Number(record.ratePerMarket),
                })),
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
                insuranceRecords: Plot.insuranceRecords.map((record) => ({
                    ...record,
                    rate: Number(record.rate),
                    area: Number(record.area),
                })),
                outgoingRecords: Plot.outgoingRecords.map((record) => ({
                    ...record,
                    itemType: record.itemType || undefined,
                    unitPerClient: Number(record.unitPerClient),
                    ratePerClient: Number(record.ratePerClient),
                    ratePerMarket: Number(record.ratePerMarket),
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
    // const fsvAdjustment = getStoredValue(StoredValueId.FsvAdjustment);
    const profFee = getStoredValue(StoredValueId.ProfFees);
    const recoveryFigure = getStoredValue(StoredValueId.RecoveryFigure);
    const capitalisationRate = getStoredValue(StoredValueId.CapitalisationRate);
    const insuranceVat = getStoredValue(StoredValueId.InsuranceVat);
    const preTenderEscalationAt = getStoredValue(StoredValueId.PreTenderEscalationAt);
    const preTenderEscalationPerc = getStoredValue(StoredValueId.PreTenderEscalationPerc);
    const postTenderEscalationAt = getStoredValue(StoredValueId.PostTenderEscalationAt);
    const postTenderEscalationPerc = getStoredValue(StoredValueId.PostTenderEscalationPerc);

    const avgPrice = Plot.avgPrice;

    const marketValue = avgPrice + Number(avgPrice * (perculiar?.value || 0) * 0.01);
    const sayMarket = marketValue;

    const forcedSaleValue = marketValue * 0.9;
    const sayForced = forcedSaleValue;

    const grcTotal = Plot.grcRecords.reduce((acc, record) => acc + record.rate * record.size, 0);

    const sayReplacementValue = grcTotal;

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

    // Value Of Improvements/ Developments
    const improvementsValue = deprTotal;

    const GLA = Plot.tenants.reduce((acc, tenant) => acc + tenant.areaPerClient, 0);
    const GBA = Plot.grcRecords.filter((el) => el.bull).reduce((acc, record) => acc + Number(record.size), 0);

    // const plot = Plot;

    const totalArea = getTotalAreaPerBoth(Plot.tenants).client;

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

    const netAnnualRentalIncome = getNetAnnualRentalIncome(grossRental.annual, outgoings.annual, vacancyPercentage?.value || 0, recoveryFigure?.value || 0, totalArea);

    const capitalisedValue = getCapitalisedValue(netAnnualRentalIncome, capitalisationRate?.value || 0);

    const capitalisedFigure = totalArea ? Number((capitalisedValue / totalArea).toFixed(2)) : 0;

    const outgoingsRentalRatio = getOutgoingsIncomeRatio(outgoings.annual, grossRental.annual);

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

    const canEdit = (!Plot.valuedById && !Plot.reviewedById) || currentUser.isSuper;

    console.log(Plot.latitude, Plot.longitude, Plot.mapLabel);

    const myMVAnalysisData = await getMVAnalysisData(Plot.id);

    return json({
        GLA,
        GBA,
        annualGross: grossRental.annual,
        netAnnualRentalIncome,
        outgoings,
        redirectTo,
        outgoingsRentalRatio,
        capitalisationRate,
        vacancyPercentage,
        capitalisedValue,
        capitalisedFigure,
        totalReplacementValue,
        replacementCost,
        canEdit,
        currentUser,
        Plot,
        sayMarket,
        sayForced,
        sayReplacementValue,
        subjectLandValue,
        deprTotal,
        capitalValue,
        improvementsValue,
        netTotal,
        templateData,
        company,
        companyPartners,
        myMVAnalysisData,
    });
}

const Schema = z.object({
    redirectTo: z.string(),
});
export const action = async ({ params, request }: ActionArgs) => {
    const currentUserId = await requireUserId(request);

    try {
        const id = getValidatedId(params.plotId);
        const fields = await getRawFormFields(request);
        const result = Schema.safeParse(fields);
        if (!result.success) {
            return processBadRequest(result.error, fields);
        }
        const { redirectTo } = result.data;

        const plot = await prisma.plot.findUnique({
            where: { id },
            select: {
                valuedById: true,
                reviewedById: true,
                plotNumber: true,
                plotExtent: true,
                id: true,
            },
        });
        if (!plot) {
            throw new Error('Plot not found');
        }

        if (plot.valuedById) {
            if (plot.valuedById === currentUserId) {
                // throw new Error("Can't review what you valued");
            } else {
                await prisma.$transaction(async (tx) => {
                    const updated = await tx.plot.update({
                        where: { id },
                        data: { reviewedById: currentUserId },
                    });
                    await tx.event.create({
                        data: {
                            userId: currentUserId,
                            domain: EventDomain.Plot,
                            action: EventAction.Update,
                            recordId: updated.id,
                            recordData: JSON.stringify(updated),
                        },
                    });
                });
            }
        } else if (plot.valuedById === currentUserId) {
            // Upsert Land Value
            await prisma.$transaction(async (tx) => {
                const updated = await tx.storedValue.upsert({
                    where: { id },
                    update: { identifier: StoredValueId.LandValue, value: landValue },
                    create: { identifier: StoredValueId.LandValue, value: landValue },
                });
                await tx.event.create({
                    data: {
                        userId: currentUserId,
                        domain: EventDomain.StoredValue,
                        action: EventAction.Update,
                        recordId: updated.id,
                        recordData: JSON.stringify(updated),
                    },
                });
            });

        } else {
            await prisma.$transaction(async (tx) => {
                const updated = await tx.plot.update({
                    where: { id },
                    data: { valuedById: currentUserId },
                });
                await tx.event.create({
                    data: {
                        userId: currentUserId,
                        domain: EventDomain.Plot,
                        action: EventAction.Update,
                        recordId: updated.id,
                        recordData: JSON.stringify(updated),
                    },
                });
            });
        }

        if (redirectTo) {
            return redirect(redirectTo.split('_').join('/'));
        }
        return redirect(AppLinks.CouncilValuationType);
        // return redirect(AppLinks.SearchCouncilPlot(ValuationType.Residential));
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
};

function numberToWords(num: number): string {
    if (num > 5000000000) {
        throw new Error("Number exceeds the maximum limit of 5,000,000,000.");
    }

    const roundedNum = Math.round(num * 100) / 100;
    const [integerPart, decimalPart] = roundedNum.toString().split(".");

    // const toWords = new ToWords();
    const toWords = new ToWords({
        localeCode: 'en-US',
    });

    const integerToWords = (n: number): string => {
        return toWords.convert(n);
    };

    const decimalToWords = (n: string): string => {
        if (!n) return "";
        return toWords.convert(Number(n));
    };

    return `${integerToWords(parseInt(integerPart))}${decimalPart ? " and " + decimalToWords(decimalPart) : ""
        }`;
}

function ValuationReportIndexPage() {
    const currentUser = useUser();
    const {
        GLA,
        GBA,
        company,
        companyPartners,
        Plot,
        sayMarket,
        sayForced,
        netTotal,
        annualGross,
        netAnnualRentalIncome,
        outgoings,
        outgoingsRentalRatio,
        capitalisationRate,
        vacancyPercentage,
        capitalisedFigure,
        replacementCost,
        myMVAnalysisData,
    } = useLoaderData<typeof loader>();

    const parsedSections = (() => {
        try {
            return Plot.sections.map((section) => {
                return {
                    name: section.name,
                    subSections: section.subSections.map(s => {
                        if (s.title?.includes('Plinth')) {
                            console.log("---", s.content);
                        }
                        return {
                            hasTitle: !!s.title,
                            title: s.title || '',
                            content: getParsedInitialContent(s.content),
                        }
                    })
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
                const replacedContent = reportContentReplacer(datum, [
                    ['plotNumber', String(Plot.plotNumber)],
                    ['plotExtent', String(Plot.plotExtent)],
                    ['plotExtentHectares', String(Plot.plotExtent / 10_000)],
                    ['plotExtentInWords', String(numberToWords(Plot.plotExtent))],
                    ['marketValue', String(formatAmount(sayMarket))],
                    ['marketValueInWords', String(numberToWords(sayMarket))],
                    ['forcedValue', String(formatAmount(sayForced))],
                    ['forcedValueInWords', String(numberToWords(sayForced))],
                    ['replacementCost', String(formatAmount(netTotal))],
                    ['replacementCostInWords', String(numberToWords(netTotal))],
                    ['instructionDate', String(dayjs(Plot.inspectionDate).format(DATE_INPUT_FORMAT))],
                    ['inspectionDate', String(dayjs(Plot.inspectionDate).format(DATE_INPUT_FORMAT))],
                    ['valuationDate', String(dayjs(Plot.analysisDate).format(DATE_INPUT_FORMAT))],
                    ['titleDeedDate', String(dayjs(Plot.titleDeedDate).format(DATE_INPUT_FORMAT))],
                    ['titleDeedNumber', String(Plot.titleDeedNum)],
                    ['clientCompanyName', String(Plot.clients[0].companyName)],
                    ['clientFullName', String(Plot.clients[0].firstName + ' ' + Plot.clients[0].lastName)],
                    ['services', String(Plot.services)],
                    ['companyName', String(company?.UserGroup?.company.CompanyName)],
                    ['companyEmail', String(company?.UserGroup?.company.Email)],
                    ['companyTel', String(company?.UserGroup?.company.Phone)],

                    ['plotDesc', Plot.plotDesc || ''],
                    ['LocationAddress', Plot.address],
                    ['zoning', Plot.zoning],
                    ['classification', Plot.classification],
                    ['usage', Plot.usage],
                    ['glaTotal', String(GLA)],
                    ['gbaTotal', String(GBA)],
                    ['grossAnnualIncome', formatAmount(annualGross)],
                    ['netAnnualIncome', formatAmount(netAnnualRentalIncome)],
                    ['annualExpenditure', formatAmount(outgoings.annual)],
                    ['annualExpenditureAsPerc', `${formatAmount(outgoingsRentalRatio)}%`],
                    ['operatingCosts', formatAmount(outgoings.monthly)],
                    ['capRate', `${formatAmount(capitalisationRate?.value || 0)}%`],
                    ['vacancyRate', `${formatAmount(vacancyPercentage?.value || 0)}%`],
                    ['ratePerSqmGLA', formatAmount(capitalisedFigure)],
                    ['ratePerSqmPlotExtent', formatAmount(capitalisedFigure)],
                    ['replacementCostPerSqm', formatAmount(replacementCost)],

                    ['valuerFullName', getFullName(Plot.valuedBy?.firstName, Plot.valuedBy?.lastName)],
                    ['valuerQualification', ''],
                ]);
                return JSON.parse(replacedContent) as PartialBlock[];
            } catch (error) {
                continue;
            }
        }
        return [];
    }

    const [error, setError] = useState('');
    const [comments, setComments] = useState<z.infer<typeof ReportCommentSchema>[]>([]);
    const [loading, setLoading] = useState(false);
    const [comment, setComment] = useState('');
    const [folded, setFolded] = useState(false);

    const fetchComments = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/fetch-report-comments/${Plot.id}`).then(r => r.json());
            const Schema = z.object({
                comments: ReportCommentSchema.array()
            });
            const result = Schema.safeParse(response);
            console.log("999", response);
            if (!result.success) {
                console.log(">>>", result.error);
                throw new Error("Failed to fetch comments");
            }
            console.log("111", result.data.comments);
            setComments(result.data.comments);
        } catch (error) {
            setError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [Plot.id]);

    useEffect(() => {
        fetchComments();
    }, [Plot.id, fetchComments]);

    return (
        <div className="flex flex-col items-center justify-start h-full">
            <div className="fixed bottom-4 left-4 flex flex-col items-stretch gap-2 text-xs print:hidden">
                <div className="rounded-lg shadow-md z-10 bg-white flex flex-col items-stretch border border-stone-200">
                    {!folded && (
                        <div className="flex flex-col items-stretch p-2">
                            <div className="flex flex-col items-stretch gap-4 py-2">
                                {loading && <p>Loading comments...</p>}
                                {error && <p className="text-red-500">{error}</p>}
                                {!loading && !error && !comments.length && (
                                    <div className="flex flex-col justify-center items-start">
                                        <span className="text-stone-400">No comments yet</span>
                                    </div>
                                )}
                                {!loading && !error && comments.map((comment, index) => (
                                    <div key={index} className={`flex flex-col items-start`}>
                                        <p className="font-bold">{comment.fullName}</p>
                                        <p>{comment.comment}</p>
                                        <p className="text-xs font-light text-stone-400">{dayjs(comment.date).format(DATE_INPUT_FORMAT)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className={twMerge("flex flex-row items-center gap-2 p-2", !folded && 'border-t border-dashed border-stone-400')}>
                        <span className="font-semibold">Comments</span>
                        <div className='grow' />
                        <button
                            type="button"
                            onClick={() => setFolded(prev => !prev)}
                            className="bg-stone-200 rounded-full p-2 hover:bg-stone-300 transition-colors duration-200 flex flex-col justify-center items-center"
                        >
                            {folded && <ChevronUp className="text-stone-800" size={16} />}
                            {!folded && <ChevronDown className="text-stone-800" size={16} />}
                        </button>
                    </div>
                </div>
                <AddComment
                    comment={comment}
                    setComment={setComment}
                    onAdd={fetchComments}

                    userId={currentUser.id}
                    fullName={getFullName(currentUser.firstName, currentUser.lastName)}
                    plotId={Plot.id}
                />
            </div>
            <div className="flex flex-col items-stretch w-full md:w-[70%] lg:w-[60%] print:w-full gap-6">
                <SecondValuationReport
                    headerTitle={Plot.headerTitle || ''}
                    footerNote={Plot.footerNote || ''}
                    sections={parsedSections}
                    ImageGalleryIds={Plot.images.map(i => i.imageId)}

                    compName={String(company?.UserGroup?.company.CompanyName)}
                    compLocation={String(company?.UserGroup?.company.LocationAddress)}
                    compPostal={String(company?.UserGroup?.company.PostalAddress)}
                    compPhone={String(company?.UserGroup?.company.Phone)}
                    compMobile={String(company?.UserGroup?.company.Mobile)}
                    compEmail={String(company?.UserGroup?.company.Email)}
                    compWebsite={String(company?.UserGroup?.company.Website)}

                    LogoLink={String(Plot.user.UserGroup?.company.LogoLink)}
                    PlotId={String(Plot.id)}
                    CompanyName={String(Plot.clients[0].companyName)}
                    CompanyPhysicalAddress={String(Plot.clients[0].phyAddress)}
                    CompanyPostalAddress={String(Plot.clients[0].postalAddress)}
                    CompanyEmail={String(Plot.clients[0].email)}
                    CompanyTel={String(Plot.clients[0].telephone)}

                    ClientFullname={String(Plot.clients[0].firstName + ' ' + Plot.clients[0].lastName)}
                    ClientPhysicalAddress={String(Plot.clients[0].phyAddress)}
                    ClientPostalAddress={String(Plot.clients[0].postalAddress)}
                    ClientPhone={String(Plot.clients[0].telephone)}
                    ClientEmail={String(Plot.clients[0].repEmail)}
                    ClientPosition={String(Plot.clients[0].position)}

                    PlotNumber={String(Plot.plotNumber)}

                    MarketValue={String(formatAmount(sayMarket))}
                    MarketValueInWords={String(numberToWords(sayMarket))}

                    ForcedValue={String(formatAmount(sayForced))}
                    ForcedValueInWords={String(numberToWords(sayForced))}

                    ReplacementCost={String(formatAmount(netTotal))}
                    ReplacementCostInWords={String(numberToWords(netTotal))}

                    ValuerFullname={String(Plot.valuers[0].firstName + ' ' + Plot.valuers[0].lastName)}
                    ValuerQualification={String(Plot.valuers[0].practicingCertificate)}
                    ValuerPhysicalAddress={String(Plot.valuers[0].physicalAddress)}
                    ValuerPostalAddress={String(Plot.valuers[0].postalAddress)}
                    ValuerTel={String(Plot.valuers[0].telephone)}
                    ValuerEmail={String(Plot.valuers[0].email)}

                    SummaryOfValuation={String(Plot.summaryOfValuation)}
                    ScopeOfWork={String(Plot.scopeOfWork)}
                    BasesOfValue={String(Plot.basesOfValue)}
                    PropertyDetails={String(Plot.propertyDetails)}
                    ScopeOfEquity={String(Plot.scopeOfEquity)}
                    OpinionOfVale={String(Plot.opinionOfValue)}
                    TableOfContents={String(Plot.tableOfContents)}

                    Construction={String(Plot.construction)}
                    Services={String(Plot.services)}

                    PlotExtent={String(Plot.plotExtent)}
                    PlotExtentInWords={String(numberToWords(Plot.plotExtent))}
                    TitleDeedNumber={String(Plot.titleDeedNum)}
                    TitleDeedDate={String(String(Plot.titleDeedDate))}
                    DateOfValuation={String(String(Plot.createdAt))}

                    Longitude={Number(Plot.longitude)}
                    Latitude={Number(Plot.latitude)}
                    mapLabel={String(Plot.address)}

                    CoverImageId={Plot.coverImageId}
                    CompanyPartnerIds={companyPartners}

                    grcRecords={Plot.grcRecords}
                    items={Plot.constructionItems}
                />
            </div>
        </div>
    );
}

export default ValuationReportIndexPage;

interface AddCommentProps {
    comment: string;
    setComment: (newVal: string) => void;
    onAdd: () => void;

    userId: string;
    fullName: string;
    plotId: string;
}
function AddComment(props: AddCommentProps) {
    const { comment, setComment, onAdd, userId, fullName, plotId, } = props;

    const fetcher = useFetcher<typeof commentAction>();
    const { isProcessing } = useForm(fetcher, Schema);

    useEffect(() => {
        if (hasSuccess(fetcher.data)) {
            setComment('');
            toast.success('Comment added successfully');
            onAdd();
        }
    }, [fetcher.data, onAdd, setComment]);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('fullName', fullName);
        formData.append('comment', comment);
        formData.append('plotId', plotId);
        formData.append('date', new Date().toString());
        return fetcher.submit(
            formData,
            { method: 'post', action: '/record-report-comment', }
        );
    }

    return (
        <div className="flex flex-col items-stretch gap-2">
            <fetcher.Form method="post" onSubmit={handleSubmit} className="flex flex-row items-center gap-2 bg-stone-200 rounded-full px-4 py-3">
                <div className="flex flex-col items-stretch grow">
                    <input
                        type='text'
                        value={comment}
                        placeholder="Add Comment..."
                        className="px-1 py-1 text-stone-600 bg-transparent outline-none ring-none text-xs"
                        onChange={(e) => setComment(e.target.value)} disabled={isProcessing}
                    />
                </div>
                <button
                    type="submit"
                    className="flex flex-col justify-center items-center bg-black/10 rounded-full p-1"
                    disabled={isProcessing}
                >
                    <IconArrowUp className="text-stone-800" size={20} />
                </button>
            </fetcher.Form>
        </div>
    )
}