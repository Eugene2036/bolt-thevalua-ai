import { ActionArgs, json, SerializeFrom, type LoaderArgs } from '@remix-run/node';
import { Link, useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { badRequest } from 'remix-utils';
import { twMerge } from 'tailwind-merge';
import React, { useEffect, useState } from 'react';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { Pagination } from '~/components/Pagination';
import { TableCell } from '~/components/TableCell';
import { prisma } from '~/db.server';
import { PAGE_SIZES, usePagination } from '~/hooks/usePagination';
import { bardRound, formatAmount, getGrcTotal, getSubjectBuildValue, getSubjectLandValue, getValidatedId, processBadRequest, safeJsonParse, StatusCode } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import {
  CLOUDINARY_CONFIG,
  getValuer,
  ValuationType,
} from '~/models/plots.validations';
import { StoredValueId } from '~/models/storedValuest';
import { requireUserId } from '~/session.server';
import { CustomTableHeading } from './dashboard';
import { SecondaryButton } from '~/components/SecondaryButton';
import { useUser } from '~/utils';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields, hasFormError } from '~/models/forms';
import { z } from 'zod';
import { useForm } from '~/components/ActionContextProvider';
import { InlineAlert } from '~/components/InlineAlert';
import { CardHeader } from '~/components/CardHeader';
import { Toaster, toast } from 'sonner';
import { Paperclip } from 'tabler-icons-react';
import { TabPanel, TabView } from 'primereact/tabview';
import DynamicTabs from '~/components/DynamicTabs';
import ResidentialComponent from '~/components/ResidentialComponent';
import { getValidatedConstructionItems } from '~/models/con-items';
import CommercialComponent from '~/components/CommercialComponent';
import ValuationAnalytics from '~/components/ValuationAnalytics';
import { Decimal } from '@prisma/client/runtime/library';

interface StoredValue {
  identifier: string;
  value: Decimal;
}

type ValuationHistoryWithRelations = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  plotNumber: string;
  plotExtent: number;
  titleDeedNum: string | null;
  titleDeedDate: Date;
  zoning: string;
  council: boolean;
  hasBeenZeroReviewed: boolean;
  valuer: string;
  inspectionDate: Date;
  analysisDate: Date;
  marketValue: string;
  forcedSaleValue: string;
  insuranceReplacementCost: string;
  valuationType: string;
  plotId: string;
  reportStatus: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  company: {
    CompanyName: string
  };
  plot: {
    id: string;
    reportValuedById?: string | null;
    reportReviewedById?: string | null;
    reviewedById?: string | null;
    reviewedBy?: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    reportReviewedBy?: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    reportTemplate?: {
      id: string;
      name: string;
      scopeOfWork: string | null;
      purposeOfValuation: string | null;
      // Add other ReportTemplate fields as needed
    } | null;
    sections?: {
      id: string;
      // Add ReportSection fields as needed
    }[];
  };
};

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

export async function loader({ request, params }: LoaderArgs) {
  await requireUserId(request);
  const userId = getValidatedId(params.id);
  const currentUserId = await requireUserId(request);
  const { id, tab } = params;

  console.log("Tab:", tab);

  const [user, plots] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.plot
      .findMany({
        where: { valuedById: currentUserId },
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
      .then((plots) => {
        return plots.map((plot) => {
          const constructionItems = getValidatedConstructionItems(plot.constructionItems || '');
          const result = ServicesSchema.safeParse(plot.services);
          const resultConstruction = ConstructionSchema.safeParse(plot.construction);
          const valuer = getValuer(plot.valuedBy);
          const reviewer = plot.reviewedBy ? `${plot.reviewedBy?.firstName} ${plot.reviewedBy?.lastName} ` : undefined;
          const grcData = plot.grcRecords.map((r) => {
            return {
              identifier: r.identifier,
              unit: r.unit,
              size: r.size,
            }
          });
          return {
            ...plot,
            constructionItems,
            services: result.data,
            construction: resultConstruction.data,
            valuer,
            reviewer,
            valuationType: plot.valuationType,
            grcData,
            undevelopedPortion: Number(plot.undevelopedPortion),
            rateForUndevelopedPortion: Number(plot.rateForUndevelopedPortion),
            avgPrice: plot.plotAndComparables.length
              ? plot.plotAndComparables.reduce((acc, plotAndComparable) => {
                return acc + Number(plotAndComparable.comparablePlot.price);
              }, 0) / plot.plotAndComparables.length
              : 0,
            plotExtent: Number(plot.plotExtent),
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

            gba: plot.grcRecords.filter((el) => el.bull).reduce((acc, record) => acc + Number(record.size), 0),
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
            insuranceRecords: plot.insuranceRecords.map((record) => ({
              ...record,
              rate: Number(record.rate),
              area: Number(record.area),
            })),
            grcRecords: plot.grcRecords.map((record) => ({
              ...record,
              identifier: String(record.identifier),
              unit: String(record.unit),
              rate: Number(record.rate),
              size: Number(record.size),
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

  if (!plots) {
    throw new Response('Plot record not found', {
      status: StatusCode.NotFound,
    });
  }

  const processedPlots = plots.map((plot) => {
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

    const perculiar = getStoredValue(plot.storedValues, StoredValueId.Perculiar);
    const avgPrice = plot.plotAndComparables.length
      ? plot.plotAndComparables.reduce((acc, plotAndComparable) => {
        return acc + Number(plotAndComparable.comparablePlot.price);
      }, 0) / plot.plotAndComparables.length
      : 0;

    const marketValue = avgPrice + Number(avgPrice * (perculiar?.value || 0) * 0.01);
    const sayMarket = marketValue;
    const vacancy = getStoredValue(plot.storedValues, StoredValueId.Perculiar);

    const [landRate, buildRate] = storedValues;

    const subjectLandValue = getSubjectLandValue(Number(plot.plotExtent), landRate?.value);
    const subjectBuildValue = getSubjectBuildValue(plot.grcRecords, buildRate?.value);
    const projectedValue = subjectLandValue + subjectBuildValue;
    const forcedSaleValue = marketValue * 0.9;
    const sayForced = bardRound(forcedSaleValue, -5);
    const grcTotal = getGrcTotal(plot.grcRecords);

    return {
      ...plot,
      plotExtent: Number(plot.plotExtent),
      undevelopedPortion: Number(plot.undevelopedPortion),
      rateForUndevelopedPortion: Number(plot.rateForUndevelopedPortion),
      gba: plot.grcRecords.filter((el) => el.bull).reduce((acc, record) => acc + Number(record.size), 0),
      avgPrice,
      marketValue: sayMarket,
      forcedSaleValue: sayForced,
      grcTotal,
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
      grcDeprRecords: plot.grcDeprRecords.length
        ? plot.grcDeprRecords.map((record) => ({
          ...record,
          perc: Number(record.perc),
        }))
        : [{ id: '', identifier: '', perc: 0 }],
    };
  });

  const valuationHistory = await prisma.valuationsHistory.findMany({
    where: {
      valuer: user.id,
      reportStatus: { not: 'In Review' }
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      plotNumber: true,
      plotExtent: true,
      titleDeedNum: true,
      titleDeedDate: true,
      zoning: true,
      council: true,
      hasBeenZeroReviewed: true,
      valuer: true,
      inspectionDate: true,
      analysisDate: true,
      marketValue: true,
      forcedSaleValue: true,
      insuranceReplacementCost: true,
      valuationType: true,
      plotId: true,
      reportStatus: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        }
      },
      company: { select: { CompanyName: true } },
      plot: {
        select: {
          id: true,
          reportValuedById: true,
          reportReviewedById: true,
          reviewedById: true,
          reportTemplate: true,
          sections: true,
          reviewedBy: { select: { id: true, firstName: true, lastName: true } },
          reportReviewedBy: { select: { id: true, firstName: true, lastName: true } },
        }
      },
    },
  }) as unknown as ValuationHistoryWithRelations[];

  // Compute status counts
  const statusCounts = valuationHistory.reduce((acc, record) => {
    const status = record.reportStatus;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = [
    { name: 'Draft', value: statusCounts['Draft'] || 0 },
    { name: 'In Review', value: statusCounts['In Review'] || 0 },
    { name: 'Reviewed', value: statusCounts['Reviewed'] || 0 },
    { name: 'Complete', value: statusCounts['Complete'] || 0 },
    { name: 'Closed', value: statusCounts['Closed'] || 0 },
  ].filter(item => item.value > 0);

  const transformedStatusData = statusData.map(item => ({
    status: item.name, // Map 'name' to 'status'
    count: item.value, // Map 'value' to 'count'
  }));

  console.log('transformedStatusData', transformedStatusData);


  console.log('valuationHistory', valuationHistory.map(item => ({ ...item.plot.reviewedBy, ...item.plot.reportReviewedBy })));


  const valuationReviews = await prisma.valuationsHistory.findMany({
    where: {
      reportStatus: 'In Review',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      plotNumber: true,
      plotExtent: true,
      titleDeedNum: true,
      titleDeedDate: true,
      zoning: true,
      council: true,
      hasBeenZeroReviewed: true,
      valuer: true,
      inspectionDate: true,
      analysisDate: true,
      marketValue: true,
      forcedSaleValue: true,
      insuranceReplacementCost: true,
      valuationType: true,
      plotId: true,
      reportStatus: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        }
      },
      company: { select: { CompanyName: true } },
      plot: {
        include: {
          reviewedBy: { select: { id: true, firstName: true, lastName: true } },
          reportReviewedBy: { select: { id: true, firstName: true, lastName: true } },
        }
      },
    },
  }) as unknown as ValuationHistoryWithRelations[];

  const notificationData = await prisma.notification.findMany({
    where: {
      userId: user.id,
      accepted: { not: 'Declined' }
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      noteId: true,
      createdAt: true,
      updatedAt: true,
      plotNum: true,
      firstName: true,
      lastName: true,
      telephone: true,
      email: true,
      repPhone: true,
      repEmail: true,
      companyName: true,
      message: true,
      messageBody: true,
      accepted: true,
      userId: true,
      createdById: true,
      acceptedDate: true,
      approved: true,
      approvedById: true,
      attachments: true,
      plotId: true,
      user: {
        include: {
          UserGroup: {
            include: {
              company: {
                select: {
                  CompanyName: true,
                }
              }
            }
          }
        }
      },
      plot: { select: { valuationType: true } }
    }
  });

  const tabCaptions = await prisma.plot.findMany({
    where: {
      userId: user.id,
    },
    select: {
      classification: true,
    },
    distinct: ['classification'],
  });

  const classifications = tabCaptions.map(item => item.classification);
  const allTabs = ['Valuation Analytics', ...classifications];
  const uniqueTabs = [...new Set(allTabs)];

  // Validate the tab parameter
  const validTabs = ["valuations", "instructions", "reports", "reviews"];
  const activeTab = validTabs.includes(tab || "") ? tab : "valuations";

  const activeTabResponse = { activeTab };

  return json({
    user,
    plots: processedPlots,
    userId,
    notificationData,
    uniqueTabs,
    valuationHistory,
    valuationReviews,
    activeTabResponse,
    transformedStatusData,
  });
}

interface Props {
  loggedIn: boolean;
  isSuper: boolean;
}

const Schema = z.object({
  id: z.string().min(1),
  plotId: z.string().min(1),
  formAction: z.string().min(1),
});

export async function action({ request }: ActionArgs) {
  const currentUserId = await requireUserId(request);

  const user = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    }
  })

  try {
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }

    const formAction = result.data.formAction;
    if (formAction !== 'sendForReview' && formAction !== 'Reviewed') {
      return badRequest({ formError: 'Invalid action' });
    }


    if (formAction === 'sendForReview') {

      await prisma.plot.update({
        where: { id: result.data.plotId },
        data: { valuedById: currentUserId, reportValuedById: currentUserId, valuer: currentUserId, updatedAt: new Date() }
      });

      await prisma.valuationsHistory.update({
        where: { id: result.data.id },
        data: { reportStatus: 'In Review', valuer: currentUserId, updatedAt: new Date() }
      });

    } else if (formAction === 'Reviewed') {

      await prisma.plot.update({
        where: { id: result.data.plotId },
        data: { reportReviewedById: currentUserId, hasBeenZeroReviewed: true, reviewedById: currentUserId, updatedAt: new Date() }
      });
      await prisma.valuationsHistory.update({
        where: { id: result.data.id },
        data: { reportStatus: 'Reviewed', hasBeenZeroReviewed: true, updatedAt: new Date() }
      });

    }

    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}

interface CustomRowProps {
  record: SerializeFrom<typeof loader>['valuationHistory'][number];
}
interface CustomRowReviewsProps {
  record: SerializeFrom<typeof loader>['valuationReviews'][number];
}

export default function UsersId(props: Props) {
  const { user, plots, userId, notificationData, uniqueTabs, valuationHistory, valuationReviews, activeTabResponse, transformedStatusData } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  console.log("Active Tab:", activeTabResponse);
  // At the top of the component
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    const hash = window.location.hash;
    if (activeTabResponse.activeTab === 'instructions') {
      setActiveIndex(1);
    } else if (activeTabResponse.activeTab === "valuations") {
      setActiveIndex(0);
    }
  }, [activeTabResponse.activeTab]);
  console.log("Active Tab2:", activeTabResponse);

  const [isPopupOpen, setPopupOpen] = useState(false);
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
    ['Target', user.target || 0],
    ['Progress', `${formatAmount(perc * 100)}%`],
    ['Last Action', lastAction ? dayjs(lastAction).format('DD/MM/YYYY HH:mm') : ''],
  ];

  const {
    pageSize: notificationsPageSize,
    handlePageSizeChange: handleNotificationsPageSizeChange,
    currentPage: notificationsCurrentPage,
    numPages: notificationsNumPages,
    paginatedRecords: paginatedNotifications,
    toFirstPage: toNotificationsFirstPage,
    toLastPage: toNotificationsLastPage,
    toNextPage: toNotificationsNextPage,
    toPreviousPage: toNotificationsPreviousPage,
  } = usePagination(notificationData);

  const {
    pageSize: reviewPageSize,
    handlePageSizeChange: handleReviewPageSizeChange,
    currentPage: reviewsCurrentPage,
    numPages: reviewsNumPages,
    paginatedRecords: paginatedReview,
    toFirstPage: toReviewsFirstPage,
    toLastPage: toReviewsLastPage,
    toNextPage: toReviewsNextPage,
    toPreviousPage: toReviewsPreviousPage,
  } = usePagination(valuationReviews);

  const [notifications, setNotifications] = useState(notificationData || []);

  const [reviews, setReviews] = useState(paginatedReview || []);

  useEffect(() => { }, [])

  const cloudName = CLOUDINARY_CONFIG.CLOUD_NAME;
  const getImageUrl = (imageId: string) => {
    return `https://res.cloudinary.com/${cloudName}/image/upload/${imageId}`;
  };

  function calculateAgeing(dateReceived: string): string {
    const receivedDate = dayjs(dateReceived);
    const currentDate = dayjs();
    const diffInDays = currentDate.diff(receivedDate, 'day');

    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return '1 day';
    } else if (diffInDays < 7) {
      return `${diffInDays} days`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''}`;
    } else {
      const months = Math.floor(diffInDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    }
  }

  const componentMap: Record<string, React.ReactNode> = {
    'Valuation Analytics': <ValuationAnalytics plots={plots} notificationData={notificationData.map(notification => ({
      ...notification,
      plotNumber: notification.plotNum
    }))} statusData={transformedStatusData} />,
    'Residential': <ResidentialComponent plots={plots} user={user} userId={user.id} valuationTypeFilter={ValuationType.Residential} />,
    'Commercial': <CommercialComponent plots={plots} user={user} userId={user.id} valuationTypeFilter={ValuationType.Commercial} />,
  };

  const tabData = uniqueTabs.map(tab => ({
    label: tab,
    content: componentMap[tab] || <div>No component defined for {tab}</div>
  }));

  const [filters, setFilters] = useState({
    searchTerm: '',
    valuationType: '',
    titleDeedNumber: '',
    createdOnFrom: '',
    createdOnTo: '',
  });

  const filteredRecords = valuationHistory.filter((record) => {
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

  const filteredReviews = valuationReviews.filter((record) => {
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
    <div className="grid grid-cols-3 gap-6 p-6 bg-gray-50">
      <div className="flex flex-col items-stretch gap-6 col-span-3 pt-6">
        <div className="flex flex-row items-center gap-2 border-b border-b-stone-400 pb-2">
          <div className='min-w-full'>
            <div className="rounded-md overflow-hidden shadow-lg">
              <TabView className="custom-tabview" activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
                <TabPanel header="Valuations" className="p-4" headerClassName={activeIndex === 0 ? 'active-tab' : 'default-tab'}>
                  <DynamicTabs
                    tabData={tabData}
                    animationType="fade"
                  />
                </TabPanel>
                <TabPanel header="Instructions" className="p-4" headerClassName={activeIndex === 1 ? 'active-tab' : 'default-tab'}>
                  <div className='bg-gray-50'>
                    <div className="flex flex-row items-center gap-2 p-2 bg-gray-50">
                      <h1 className='text-l font-semibold'>Instructions ({notifications.length})</h1>
                      <div className="grow" />
                      <Pagination
                        pageSizes={PAGE_SIZES}
                        pageSize={notificationsPageSize}
                        handlePageSizeChange={handleNotificationsPageSizeChange}
                        currentPage={notificationsCurrentPage}
                        numPages={notificationsNumPages}
                        toFirstPage={toNotificationsFirstPage}
                        toLastPage={toNotificationsLastPage}
                        toNextPage={toNotificationsNextPage}
                        toPreviousPage={toNotificationsPreviousPage}
                      />
                    </div>
                    <table className="min-w-full items-stretch bg-white overflow-hidden cursor-pointer" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <CustomTableHeading className="py-2 px-6 text-left">Client</CustomTableHeading>
                          <CustomTableHeading className="py-2 px-6 text-left border-r-0">Message</CustomTableHeading>
                          <CustomTableHeading className="py-2 px-6 text-left border-l-0"></CustomTableHeading>
                          <CustomTableHeading className="py-2 px-6 text-left w-14">Plot</CustomTableHeading>
                          <CustomTableHeading className="py-2 px-6 text-left w-14">Type</CustomTableHeading>
                          <CustomTableHeading className="py-2 px-6 text-right">Received</CustomTableHeading>
                          <CustomTableHeading className="py-2 px-6 text-right">Ageing</CustomTableHeading>
                        </tr>
                      </thead>
                      <tbody className='font-thin'>
                        {paginatedNotifications.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-100 transition duration-200 ease-in-out">
                            <TableCell className="py-2 px-3 text-left border-b border-gray-200 w-auto">
                              <Link to={AppLinks.EditNotifications(row.noteId)} >
                                {row.user.UserGroup?.company.CompanyName}
                              </Link>
                            </TableCell>

                            <TableCell className="grid grid-cols-2 py-2 border-r-0 px-3 border-b border-gray-200">
                              <div className="flex items-center">
                                <Link to={AppLinks.EditNotifications(row.noteId)} className="text-blue-500 hover:text-blue-700">
                                  {row.message}
                                </Link>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 px-3 border-b border-l-0 border-gray-200 w-2">
                              <Link to={AppLinks.EditNotifications(row.noteId)} >
                                <div className='flex flex-row space-x-4 w-20'>
                                  {
                                    row.accepted === "Accepted" ? (
                                      <div className='flex flex-row items-center'>
                                        <Link to={AppLinks.EditNotifications(row.noteId)} className="grid grid-col-2 text-blue-500 hover:text-blue-700">
                                          <div className='grid grid-cols-2 items-center space-x-2'>
                                            <div className='flex flex-col'>
                                              <Paperclip size="18px" />
                                            </div>
                                            <div className='flex flex-col'>
                                              <sup>{row.attachments.length}</sup>
                                            </div>
                                          </div>
                                        </Link>
                                      </div>
                                    ) : (
                                      <div className='grow'></div>
                                    )
                                  }
                                </div>
                              </Link>
                            </TableCell>
                            <TableCell className="py-2 px-3 border-b border-gray-200">
                              {
                                row.accepted === "Accepted" ? (
                                  <Link className='text-blue-500 font-semibold' to={row.plot.valuationType === 'Residential' ? AppLinks.PlotCouncilGrc(row.plotId) : AppLinks.PlotValuations(row.plotId)}>
                                    {row.plotNum}
                                  </Link>
                                ) : (
                                  row.plotNum
                                )
                              }
                            </TableCell>
                            <TableCell className="py-2 px-3 border-b border-gray-200">
                              <Link to={AppLinks.EditNotifications(row.noteId)}>
                                {row.plot.valuationType}
                              </Link>
                            </TableCell>
                            <TableCell className="py-2 px-3 border-b border-gray-200 text-right w-7">
                              <Link to={AppLinks.EditNotifications(row.noteId)} >
                                {dayjs(row.createdAt).format('DD/MM/YYYY')}
                              </Link>
                            </TableCell>
                            <TableCell className="py-2 px-3 border-b border-gray-200 text-right w-7">
                              <Link to={AppLinks.EditNotifications(row.noteId)} >
                                {calculateAgeing(row.createdAt)}
                              </Link>
                            </TableCell>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabPanel>

                <TabPanel header="Valuation Reports" className="p-4" headerClassName={activeIndex === 2 ? 'active-tab' : 'default-tab'}>
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

                    <div className="overflow-x-auto bg-white rounded-lg shadow">
                      <table className="min-w-full items-stretch bg-white overflow-hidden shadow-md border border-stone-200 mt-0" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <CustomTableHeading>Plot #</CustomTableHeading>
                            <CustomTableHeading>Company</CustomTableHeading>
                            <CustomTableHeading>Inspection Date</CustomTableHeading>
                            <CustomTableHeading>Valuation Date</CustomTableHeading>
                            <CustomTableHeading>Market Value</CustomTableHeading>
                            <CustomTableHeading>Forced Value</CustomTableHeading>
                            <CustomTableHeading>Replacement Value</CustomTableHeading>
                            <CustomTableHeading>Reviewed By</CustomTableHeading>
                            <CustomTableHeading>Valuation Type</CustomTableHeading>
                            <CustomTableHeading>Action</CustomTableHeading>
                            <CustomTableHeading>Action</CustomTableHeading>
                          </tr>
                        </thead>
                        <tbody className="font-thin">
                          {paginatedRecords.map((record) => (
                            <CustomRow key={record.id} record={record} />
                          ))}
                          {!paginatedRecords.length && (
                            <tr>
                              <TableCell colSpan={5}>No data to show</TableCell>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

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
                </TabPanel>

                {user.isSignatory && user.isSignatory === true && (
                  <TabPanel header="Reviews" className="p-4" headerClassName={activeIndex === 3 ? 'active-tab' : 'default-tab'}>
                    <div className="flex flex-col gap-4 p-0">
                      {/* Filters */}
                      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg shadow">
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
                      </div> */}

                      {/* Table */}

                      <div className="overflow-x-auto bg-white rounded-lg shadow">
                        <table className="min-w-full items-stretch bg-white overflow-hidden shadow-md border border-stone-200 mt-0" style={{ width: '100%' }}>
                          <thead>
                            <tr>
                              <CustomTableHeading>Plot #</CustomTableHeading>
                              <CustomTableHeading>Company</CustomTableHeading>
                              <CustomTableHeading>Inspection Date</CustomTableHeading>
                              <CustomTableHeading>Valuation Date</CustomTableHeading>
                              <CustomTableHeading>Market Value</CustomTableHeading>
                              <CustomTableHeading>Forced Value</CustomTableHeading>
                              <CustomTableHeading>Replacement Value</CustomTableHeading>
                              <CustomTableHeading>Valued By</CustomTableHeading>
                              <CustomTableHeading>Valuation Type</CustomTableHeading>
                              <CustomTableHeading>Action</CustomTableHeading>
                              <CustomTableHeading>Action</CustomTableHeading>
                            </tr>
                          </thead>
                          <tbody className="font-thin">
                            {paginatedReview.map((record) => (
                              <CustomRowReviews key={record.id} record={record} />
                            ))}
                            {!paginatedReview.length && (
                              <tr>
                                <TableCell colSpan={5}>No data to show</TableCell>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-gray-600">
                          Showing {paginatedReview.length} of {filteredReviews.length} records
                        </div>
                        <Pagination
                          pageSizes={PAGE_SIZES}
                          pageSize={reviewPageSize}
                          handlePageSizeChange={handleReviewPageSizeChange}
                          currentPage={reviewsCurrentPage}
                          numPages={reviewsNumPages}
                          toFirstPage={toReviewsFirstPage}
                          toLastPage={toReviewsLastPage}
                          toNextPage={toReviewsNextPage}
                          toPreviousPage={toReviewsPreviousPage}
                        />
                      </div>
                    </div>
                  </TabPanel>
                )}

              </TabView>
            </div>
            {hasFormError(fetcher.data) && (
              <div className="flex flex-col items-stretch py-4">
                <InlineAlert>{fetcher.data.formError}</InlineAlert>
              </div>
            )}
            <div className="flex flex-row items-stretch py-0">
              <CardHeader className="flex flex-row items-center gap-4 p-0 w-full">
                {/* <SecondaryButtonLink to={AppLinks.Instructions}>Manage Instructions</SecondaryButtonLink> */}
                <div className="grow" />
                <Toaster />
                <SecondaryButton type="submit" disabled={isProcessing} onClick={() => { toast.success('Saving Selected Instructions...') }}>
                </SecondaryButton>
              </CardHeader>
            </div>
          </div >
        </div>
      </div>
    </div>
  );
}


function CustomRow({ record }: CustomRowProps) {
  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  console.log('ReviewedBy:', record.plot?.reviewedBy);
  console.log('ReportReviewedBy:', record.plot?.reportReviewedBy);

  const disabled = isProcessing || !!record.hasBeenZeroReviewed;

  console.log(record.plot?.reviewedById); // Check if this exists
  console.log(record.plot?.reportReviewedById); // Check if this exists

  const reviewerName = record.plot?.reviewedBy
    ? `${record.plot.reviewedBy.firstName} ${record.plot.reviewedBy.lastName}`
    : record.plot?.reportReviewedBy
      ? `${record.plot.reportReviewedBy.firstName} ${record.plot.reportReviewedBy.lastName}`
      : '-';

  return (
    <tr key={record.id} className="hover:bg-gray-50">
      <TableCell>
        {/* <Link
          to={record.valuationType === 'Residential'
            ? AppLinks.PlotCouncilGrc(record.plotId)
            : AppLinks.PlotValuations(record.plotId)}
          className="text-blue-600 hover:underline"
        >
          {record.plotNumber}
        </Link> */}
        {record.plotNumber}
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
        {reviewerName}
      </TableCell>
      <TableCell>{record.valuationType}</TableCell>
      <TableCell>
        <div className="flex flex-col items-stretch">
          <Link
            to={AppLinks.ReportContent(record.plotId, record.plot.reportTemplate?.id!)}
            className="bg-stone-100 rounded-md px-4 py-3 text-teal-600 hover:bg-stone-200 flex flex-col justify-center items-center"
          >
            Edit
          </Link>
        </div>
      </TableCell>
      <TableCell className="text-center m-0 p-0">
        <fetcher.Form method="post" className="flex flex-col items-stretch m-1">
          <input type='hidden' {...getNameProp('id')} value={record.id} />
          <input type='hidden' {...getNameProp('plotId')} value={record.plotId} />
          <input type='hidden' {...getNameProp('formAction')} value='sendForReview' />
          <button
            type="submit"
            disabled={disabled}
            className={twMerge(
              "bg-stone-100 rounded-md px-4 py-3 text-teal-600",
              (record.hasBeenZeroReviewed || record.reportStatus === 'In Review') && 'text-stone-400'
            )}
          >
            {record.hasBeenZeroReviewed
              ? 'Already Reviewed'
              : record.reportStatus === 'In Review'
                ? 'In Review'
                : isProcessing
                  ? 'Sending...'
                  : 'Send For Review'}
          </button>
        </fetcher.Form>
      </TableCell>
    </tr>
  )
}



function CustomRowReviews({ record }: CustomRowReviewsProps) {
  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const disabled = isProcessing || !!record.plot.reportReviewedById;

  const valuerName = record.user
    ? `${record.user.firstName} ${record.user.lastName}`
    : '-';

  return (
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
        {/* {record.plotNumber} */}
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
        {valuerName}
      </TableCell>
      <TableCell>{record.valuationType}</TableCell>
      <TableCell>
        <div className="flex flex-col items-stretch">
          <Link
            to={AppLinks.ReportContent(record.plotId, record.plot.reportTemplate?.id!)}
            className="bg-stone-100 rounded-md px-4 py-3 text-teal-600 hover:bg-stone-200 flex flex-col justify-center items-center"
          >
            Edit
          </Link>
        </div>
      </TableCell>
      <TableCell className="text-center m-0 p-0">
        <fetcher.Form method="post" className="flex flex-col items-stretch m-1">
          <input type='hidden' {...getNameProp('id')} value={record.id} />
          <input type='hidden' {...getNameProp('plotId')} value={record.plotId} />
          <input type='hidden' {...getNameProp('formAction')} value='Reviewed' />
          <button
            type="submit"
            disabled={disabled}
            className={twMerge("bg-stone-100 rounded-md px-4 py-3 text-teal-600 cursor-pointer", (!!record.plot.reportReviewedById || !!record.plot.reportValuedById) && 'text-stone-400')}
          >
            {record.plot.reportReviewedBy ? 'Already Reviewed' :
              record.plot.reportValuedById ? 'Sent For Review' :
                isProcessing ? 'Sending...' :
                  'Mark as Reviewed'}
          </button>
        </fetcher.Form>
      </TableCell>
    </tr>
  )
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}