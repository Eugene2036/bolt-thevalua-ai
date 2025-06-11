import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { Response, json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { z } from 'zod';
import { useForm } from '~/components/ActionContextProvider';
import { ToWords } from 'to-words';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { prisma } from '~/db.server';
import { StatusCode, badRequest, formatAmount, getQueryParams, getValidatedId, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { getValuer } from '~/models/plots.validations';
import { StoredValueId } from '~/models/storedValuest';
import { requireUser, requireUserId } from '~/session.server';
// import ValuationReport from '~/components/ValuationReport';
import CompanyPartners from '~/components/CompanyPartners';

var landValue = 0;
var valueOfImprovements = 0;
var capValue = 0;



export async function loader({ request, params }: LoaderArgs) {
    console.log("Action called with params:", params);
    const currentUser = await requireUser(request);

    // const reportTemplateId = getValidatedId(params.reportTemplateId);
    const plotId = getValidatedId(params.plotId);
    const queryParams = getQueryParams(request.url, ['redirectTo']);
    const redirectTo = queryParams.redirectTo || '';

    console.log('Current User Id: ', currentUser.id)

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
    })

    const Plot = await prisma.plot
        .findUnique({
            where: { id: plotId },
            include: {
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
            const valuer = getValuer(Plot.valuedBy);
            const reviewer = Plot.reviewedBy ? `${Plot.reviewedBy?.firstName} ${Plot.reviewedBy?.lastName}` : undefined;
            const grcRecordsHtml = (() => {
                let tableHtml = `
                                <table className={19} border='0px' cellSpacing={0} cellPadding={0} width='100%' style={{ borderCollapse: 'collapse', border: 'none' }}>
                                <thead>
                                    <tr>
                                    <th>Identifier</th>
                                    <th>Unit</th>
                                    <th>Size</th>
                                    </tr>
                                </thead>
                                <tbody>
                            `;

                Plot.grcRecords.forEach(grcRecord => {
                    tableHtml += `
                                <tr>
                                    <td>${grcRecord.identifier}</td>
                                    <td>${grcRecord.unit}</td>
                                    <td>${grcRecord.size}</td>
                                </tr>
                                `;
                });

                tableHtml += `
                                </tbody>
                                </table>
                            `;

                return tableHtml;
            })();
            return {
                ...Plot,
                valuer,
                reviewer,
                templateData,
                grcRecordsHtml,
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

    // const landValue = getStoredValue(StoredValueId.LandValue);

    // const valueOfDevelopments = getStoredValue(StoredValueId.ValueOfDevelopments);

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
    capValue = capitalValue;

    const improvementsValue = deprTotal;
    valueOfImprovements = improvementsValue;

    const canEdit = (!Plot.valuedById && !Plot.reviewedById) || currentUser.isSuper;
    return json({
        redirectTo,
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


function ValuationReportIndexPage() {

    useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();

    const { isProcessing } = useForm(fetcher, Schema);

    return (
        <div className="flex flex-col items-center justify-start h-full gap-6 py-8">
            <div className="flex flex-col items-stretch min-w-[100%] gap-4">

            </div>
        </div>
    );
}

export default ValuationReportIndexPage;

