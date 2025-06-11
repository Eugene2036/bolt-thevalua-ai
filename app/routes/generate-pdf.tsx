import '~/print-pages.css';

import { PartialBlock } from '@blocknote/core';
import { Cloudinary } from '@cloudinary/url-gen/index';
import { renderToStream } from '@react-pdf/renderer';
import type { LoaderArgs } from '@remix-run/node';
import dayjs from 'dayjs';
import QRCode from 'qrcode';
import { ToWords } from 'to-words';
import { z } from 'zod';
import { CloudinaryContextProvider } from '~/components/CloudinaryContextProvider';
import { Base64Images } from '~/components/CustomReport';
import { FullReport } from '~/components/FullReport';
import { TocEntry, UpdateTocProps } from '~/components/TableOfContentsProvider';
import { prisma } from '~/db.server';
import { getValidatedConstructionItems } from '~/models/con-items';
import { formatAmount, getFullName, getQueryParams, StatusCode } from '~/models/core.validations';
import { Env } from '~/models/environment';
import { fetchMapImageAsBase64 } from '~/models/google-maps';
import { getAnnualOutgoingsPerBoth, getCapitalisedValue, getGrossRental, getMonthlyOutgoings, getNetAnnualRentalIncome, getOutgoingsIncomeRatio, getTotalAreaPerBoth, getTotalParkingPerBoth, getTotalRentalPerBoth, getValuer } from '~/models/plots.validations';
import { reportContentReplacer, SubSection } from '~/models/reports';
import { StoredValueId } from '~/models/storedValuest';
import { requireUser } from '~/session.server';
import { getMVAnalysisData } from '~/models/mv-analysis.server';

// const tw = createTw({
//   theme: {},
// });

export async function loader({ request }: LoaderArgs) {
  const currentUser = await requireUser(request);

  // const plotId = getValidatedId(params.plotId);
  const { plotId } = getQueryParams(request.url, ['plotId']);

  const mvAnalysisData = plotId ? await getMVAnalysisData(plotId) : null;

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
        try {
          if (!Plot.services) {
            return '';
          }
          const result = z.string().array().parse(JSON.parse(Plot.services));
          return result.length ? result.join(", ") : '';
        } catch (err) {
          return '';
        }
      })();
      return {
        ...Plot,
        latitude: Plot.latitude ? Number(Plot.latitude) : null,
        longitude: Plot.longitude ? Number(Plot.longitude) : null,
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
  const profFee = getStoredValue(StoredValueId.ProfFees);
  const recoveryFigure = getStoredValue(StoredValueId.RecoveryFigure);
  const capitalisationRate = getStoredValue(StoredValueId.CapitalisationRate);
  const insuranceVat = getStoredValue(StoredValueId.InsuranceVat);

  const avgPrice = Plot.avgPrice;

  const marketValue = avgPrice + Number(avgPrice * (perculiar?.value || 0) * 0.01);
  const sayMarket = marketValue;

  const forcedSaleValue = marketValue * 0.9;
  const sayForced = forcedSaleValue;

  const grcTotal = Plot.grcRecords.reduce((acc, record) => acc + record.rate * record.size, 0);

  const netTotal =
    grcTotal +
    Plot.grcFeeRecords.reduce((acc, record) => {
      const rowTotal = Number((record.perc * 0.01 * grcTotal).toFixed(2));
      return acc + rowTotal;
    }, 0);

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

  const annualGross = grossRental.annual;

  function getParsedInitialContent(plot: NonNullable<typeof Plot>, ...data: (string | undefined | null)[]) {
    const Plot = plot;
    for (const datum of data) {
      if (!datum) {
        continue;
      }
      const format = 'DD-MM-YYYY';
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
          ['instructionDate', String(dayjs(Plot.inspectionDate).format(format))],
          ['inspectionDate', String(dayjs(Plot.inspectionDate).format(format))],
          ['valuationDate', String(dayjs(Plot.analysisDate).format(format))],
          ['titleDeedDate', String(dayjs(Plot.titleDeedDate).format(format))],
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

  const parsedSections = (() => {
    try {
      return Plot.sections.map((section) => {
        return {
          name: section.name,
          subSections: section.subSections.map(s => {
            return {
              hasTitle: !!s.title,
              title: s.title || '',
              content: getParsedInitialContent(Plot, s.content),
            }
          })
        }
      });
    } catch (error) {
      return [];
    }
  })();

  async function firstRender(plot: NonNullable<typeof Plot>, images: Base64Images, mapBase64: string, qrCodeBase64: string) {
    const toc = initToc(parsedSections);
    await renderDoc(plot, toc, images, mapBase64, qrCodeBase64);
    return toc;
  }
  async function finalRender(plot: NonNullable<typeof Plot>, toc: TocEntry[], images: Base64Images, mapBase64: string, qrCodeBase64: string) {
    return await renderDoc(plot, toc, images, mapBase64, qrCodeBase64);
  }

  function updateToc(toc: TocEntry[], props: UpdateTocProps) {
    for (const item of toc) {
      const index = toc.indexOf(item);
      if (props.customIndex === item.customIndex) {
        toc[index] = {
          ...item,
          pageNumber: props.pageNumber
        }
      }
    }
  }

  interface InitTocProps {
    name: string;
    subSections: SubSection[];
  }
  function initToc(sections: InitTocProps[]) {
    const tableOfContents: TocEntry[] = [];
    for (const section of sections) {
      const outIndex = sections.indexOf(section);
      tableOfContents.push({
        title: section.name,
        pageNumber: 0,
        level: 1,
        customIndex: outIndex + 1,
      });
      for (const ss of section.subSections.filter(ss => ss.hasTitle)) {
        tableOfContents.push({
          title: ss.title,
          pageNumber: 0,
          level: 2,
          customIndex: Number(String(outIndex + 1) + String(section.subSections.indexOf(ss))),
        });
      }
    }
    tableOfContents.push({
      title: 'Images',
      pageNumber: 0,
      level: 1,
      customIndex: sections.length + 1,
    });
    return tableOfContents;
  }

  async function renderDoc(plot: NonNullable<typeof Plot>, tableOfContents: TocEntry[], images: Base64Images, mapBase64: string, qrCodeBase64: string) {
    const Plot = plot;

    const CloudinaryUtil = new Cloudinary({ cloud: { cloudName: Env.CLOUDINARY_CLOUD_NAME } });

    return await renderToStream(
      <CloudinaryContextProvider
        CLOUDINARY_CLOUD_NAME={Env.CLOUDINARY_CLOUD_NAME}
        CLOUDINARY_UPLOAD_RESET={Env.CLOUDINARY_UPLOAD_RESET}
        CloudinaryUtil={CloudinaryUtil}
      >
        <FullReport
          mapBase64={mapBase64}
          qrCodeBase64={qrCodeBase64}
          images={images}
          tableOfContents={tableOfContents}
          updateToc={(props) => updateToc(tableOfContents, props)}

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
          PlotAddress={String(Plot.address)}

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



          grcRecords={Plot.grcRecords}
          items={Plot.constructionItems}
          plotMVAnalysisRecords={
            mvAnalysisData
              ? {
                plotNumber: mvAnalysisData.plot.plotNumber,
                plotDesc: mvAnalysisData.plot.plotDesc ?? '',
                comparables: mvAnalysisData.comparables ?? [],
                avgPrice: mvAnalysisData.avgPrice ?? 0,
                landRate: typeof mvAnalysisData.storedValues?.landRate?.value === 'number'
                  ? mvAnalysisData.storedValues.landRate.value
                  : undefined,
                buildRate: typeof mvAnalysisData.storedValues?.buildRate?.value === 'number'
                  ? mvAnalysisData.storedValues.buildRate.value
                  : undefined,
                perculiar: typeof mvAnalysisData.storedValues?.perculiar?.value === 'number'
                  ? mvAnalysisData.storedValues.perculiar.value
                  : undefined,
                marketValue:
                  mvAnalysisData.avgPrice +
                  Number(
                    mvAnalysisData.avgPrice *
                    ((mvAnalysisData.storedValues?.perculiar?.value ?? 0) * 0.01)
                  ),
                forcedSaleValue:
                  (mvAnalysisData.avgPrice +
                    Number(
                      mvAnalysisData.avgPrice *
                      ((mvAnalysisData.storedValues?.perculiar?.value ?? 0) * 0.01)
                    )) * 0.9,
                valuerComments: mvAnalysisData.plot.valuerComments ?? '',
                // aiAnalysis: mvAnalysisData?.plotAiAnalysisData?.[0]?.analysis ?? '',
                aiAnalysis: (() => {
                  const raw = mvAnalysisData?.plotAiAnalysisData?.[0]?.analysis;
                  if (!raw) return '';
                  try {
                    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    // Type guard: check if parsed is an object and has 'analysis'
                    if (
                      parsed &&
                      typeof parsed === 'object' &&
                      'analysis' in parsed &&
                      parsed.analysis &&
                      typeof parsed.analysis === 'object' &&
                      'explanation' in parsed.analysis
                    ) {
                      return parsed.analysis.explanation ?? '';
                    }
                    // fallback: if explanation is at the top level
                    if (parsed && typeof parsed === 'object' && 'explanation' in parsed) {
                      return (parsed as { explanation?: string }).explanation ?? '';
                    }
                    return '';
                  } catch {
                    return '';
                  }
                })(),
              }
              : undefined
          }
        />
      </CloudinaryContextProvider>
    );
  }

  const [images, mapBase64, qrCodeBase64] = await Promise.all([
    fetchImages({
      companyLogo: Plot.user.UserGroup?.company.LogoLink || '',
      coverImage: Plot.coverImageId,
      companyPartners: companyPartners.map((i) => i.imageId),
      imageGallery: Plot.images.map((i) => i.imageId),
    }, Env.CLOUDINARY_CLOUD_NAME),
    (() => {
      if (!Plot.latitude || !Plot.longitude) {
        return '' as string;
      }
      return fetchMapImageAsBase64({
        lat: Plot.latitude,
        lng: Plot.longitude,
        // lat: -17.8292,
        // lng: 31.0522,
        apiKey: 'AIzaSyCaedTiS5L1Y3Qx1p_yKAyGSZ_1h28yL50',
      });
    })(),
    (async () => {
      // Generate QR Code
      const qrData = JSON.stringify({
        "Company": company?.UserGroup?.company.CompanyName || '',
        "Valuer": getFullName(Plot.valuedBy?.firstName, Plot.valuedBy?.lastName) || '',
        "Plot Number": Plot.plotNumber || '',
        "Website": Env.INSTANCE_URL,
      });
      const qrCodeOptions = {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.3,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      };
      const qrCodeBuffer = await QRCode.toBuffer(qrData, qrCodeOptions);
      const qrCodeBase64 = qrCodeBuffer.toString('base64');
      // console.log('Generated QR Code successfully:', qrCodeBase64);
      return qrCodeBase64;
    })(),
  ]);

  const toc = await firstRender(Plot, images, mapBase64, qrCodeBase64);
  const stream = await finalRender(Plot, toc, images, mapBase64, qrCodeBase64);
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk))
      stream.on("end", () => controller.close())
      stream.on("error", (err) => controller.error(err))
    },
  })
  const fileName = `Plot ${Plot.plotNumber}.pdf`;
  const disposition =
    `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;

  return new Response(webStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': disposition,
      // 'Content-Disposition': `attachment; filename="Plot ${Plot.plotNumber}.pdf"`,
      // 'Content-Disposition': `inline; filename="Plot ${Plot.plotNumber}.pdf"; filename*=UTF-8\'\'Plot ${Plot.plotNumber}.pdf`,
      // 'Content-Disposition': `inline; filename="Plot ${Plot.plotNumber}.pdf"; filename*=UTF-8\'\'Plot ${Plot.plotNumber}.pdf`,
    },
  });
}

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

interface ImageIdProps {
  companyLogo: string;
  coverImage: string;
  companyPartners: string[];
  imageGallery: string[];
}
async function fetchImages(props: ImageIdProps, cloudName: string) {
  const result = await Promise.all([
    fetchImageAsBase64(props.companyLogo, cloudName),
    fetchImageAsBase64(props.coverImage, cloudName),
    ...props.companyPartners.map((id) => fetchImageAsBase64(id, cloudName)),
    ...props.imageGallery.map((id) => fetchImageAsBase64(id, cloudName)),
  ]);
  return {
    companyLogo: result[0],
    coverImage: result[1],
    companyPartners: result.slice(2, 2 + props.companyPartners.length),
    imageGallery: result.slice(2 + props.companyPartners.length),
  };
}

async function fetchImageAsBase64(publicId: string, cloudName: string) {
  if (!publicId) {
    console.log("No public id provided");
    return { src: '', mimeType: '' };
  }
  console.log("Fetching image id", publicId, '...');
  const imageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`;
  const response = await fetch(imageUrl);
  if (!response.ok) {
    console.log("Failed to fetch image with id", publicId, ':', response.statusText);
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const contentType = response.headers.get("content-type") || "image/jpeg";
  console.log("Fetched image id", publicId, "successfully, image type", contentType);
  return { src: base64, mimeType: contentType };
}