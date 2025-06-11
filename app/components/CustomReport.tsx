import { Document, Link, Page, Text, View } from '@react-pdf/renderer';
import { ComponentProps, useContext, useMemo } from 'react';
import { createTw } from "react-pdf-tailwind";
import { twMerge } from 'tailwind-merge';
import { ConstructionItem } from '~/models/con-items';
import { Section } from '~/models/reports';
import PdfCompanyLogo from './PdfCompanyLogo';
import PdfCompanyPartners from './PdfCompanyPartners';
import { PdfFooter } from './PdfFooter';
import { PdfHeader } from './PdfHeader';
import { PdfSectionHeading } from './PdfSectionHeading';
import { PdfSectionPanel } from './PdfSectionPanel';
import { PdfValuationsImageGallery } from './PdfValuationsImageGallery';
import { PlinthAreas } from './PlinthAreas';
import { TableOfContentsContext } from './TableOfContentsProvider';
import ValuationReportCoverImage from './ValuationReportCoverImage';
import { PdfQRcode } from './PdfQRcode'; // Ensure this is imported
import { ViewPlotMVAnalysisCard } from './ViewPlotMVAnalysisCard';

const tw = createTw({
  theme: {},
});

interface CustomBase64 {
  src: string;
  mimeType: string;
}
export interface Base64Images {
  companyLogo: CustomBase64;
  coverImage: CustomBase64;
  companyPartners: CustomBase64[];
  imageGallery: CustomBase64[];
}
interface ValuationProps {
  mapBase64: string;
  qrCodeBase64: string;

  images: Base64Images;

  sections: Section[];
  ImageGalleryIds: string[];
  headerTitle: string;
  footerNote: string;

  compName: string;
  compLocation: string;
  compPostal: string;
  compPhone: string;
  compMobile: string;
  compEmail: string;
  compWebsite: string;

  LogoLink: string;
  PlotId: string;
  CompanyName: string;
  CompanyPhysicalAddress: string;
  CompanyPostalAddress: string;
  CompanyEmail: string;
  CompanyTel: string;

  ClientFullname: string;
  ClientPhysicalAddress: string;
  ClientPostalAddress: string;
  ClientPhone: string;
  ClientEmail: string;
  ClientPosition: string;

  PlotNumber: string;
  PlotAddress: string;

  MarketValue: string;
  MarketValueInWords: string;

  ForcedValue: string;
  ForcedValueInWords: string;

  ReplacementCost: string;
  ReplacementCostInWords: string;

  ValuerFullname: string;
  ValuerQualification: string;
  ValuerPhysicalAddress: string;
  ValuerPostalAddress: string;
  ValuerTel: string;
  ValuerEmail: string;

  SummaryOfValuation: string;
  ScopeOfWork: string;
  BasesOfValue: string;
  PropertyDetails: string;
  ScopeOfEquity: string;
  OpinionOfVale: string;
  TableOfContents: string;

  Construction: string;
  Services: string;

  PlotExtent: string;
  PlotExtentInWords: string
  TitleDeedNumber: string;
  TitleDeedDate: string;
  DateOfValuation: string;

  Longitude: number;
  Latitude: number;
  mapLabel: string;

  CoverImageId: string;

  grcRecords: ComponentProps<typeof PlinthAreas>['records'];
  plotMVAnalysisRecords: ComponentProps<typeof ViewPlotMVAnalysisCard>['data'];
  items?: ConstructionItem[];
}
export function CustomReport(props: ValuationProps) {
  const { images, CoverImageId, sections, headerTitle, footerNote } = props;

  const { tableOfContents, updateToc, tocDone } = useContext(TableOfContentsContext);

  const Header = useMemo(() => {
    return <PdfHeader headerTitle={headerTitle} logoPublicId={props.LogoLink} />
  }, [headerTitle, props.LogoLink]);

  const Footer = useMemo(() => {
    return <PdfFooter footerNote={footerNote} />
  }, [footerNote]);

  const CoverPage = useMemo(() => {
    const styles = {
      page: tw('flex flex-col justify-center items-stretch text-xs border border-stone-200 p-1 w-[794px]'),
      outerContainer: tw("h-full flex flex-col items-stretch"),
      contentWrapper: tw("flex flex-col items-stretch p-10 grow shrink"),
      logoContainer: tw("flex flex-col justify-center items-center py-4"),
      imageContainer: tw("flex flex-col items-center justify-center h-2/5"),
      spacerGrow: tw('grow'),
      titleContainer: tw("flex flex-col justify-center items-start"),
      titleText: tw("w-full text-center text-xl text-black leading-loose"),
      boldText: tw('font-bold'),
      partnerContainer: tw("flex flex-row flex-wrap border-t border-t-stone-400 pt-10"),
      footerBar: tw("h-[48px] bg-red-600 shrink-0"),
    };
    return (
      <Page size="A4" wrap={false} style={styles.page}>
        <View style={styles.outerContainer}>
          <View style={styles.contentWrapper}>
            <View style={styles.logoContainer}>
              <PdfCompanyLogo base64={images.companyLogo} publicId={props.LogoLink} />
            </View>
            <View style={styles.imageContainer}>
              <ValuationReportCoverImage base64={images.coverImage} className="h-full" publicId={CoverImageId} />
            </View>
            <View style={styles.spacerGrow} />
            <View style={styles.titleContainer}>
              <Text style={styles.titleText}>
                PROPERTY VALUATION REPORT IN RESPECT OF&nbsp;{"\n"}
                <Text style={styles.boldText}>Plot &nbsp;{props.PlotAddress}</Text>
              </Text>
            </View>
            <View style={styles.spacerGrow} />
            <View style={styles.partnerContainer}>
              <PdfCompanyPartners images={images.companyPartners} />
            </View>
          </View>
          <View style={styles.footerBar} />
        </View>
      </Page>
    );
  }, [CoverImageId, images.companyLogo, images.companyPartners, images.coverImage, props.LogoLink]);


  const linkBaseStyle = 'no-underline text-black text-[10pt] font-semibold tracking-wide';
  const lineStyle = tw('grow flex flex-col items-stretch pb-[1pt] border-b border-dashed border-b-stone-600');
  const rowStyle = tw('flex flex-row items-end gap-2');
  const TocContainerStyle = tw('flex flex-col items-stretch gap-4 pt-6');
  const pageNumberStyle = tw('text-[10pt] font-light tracking-wide');
  const Toc = useMemo(() => {
    return <View style={TocContainerStyle}>
      {tableOfContents
        .map(({ title, pageNumber, level, customIndex }) => {
          const refinedTitle = title.replace(/\s+/g, '_');
          const src = level === 2 ?
            `#SubSection_${refinedTitle}_${customIndex}` :
            `#Section_${refinedTitle}_${customIndex}`;
          return (
            <View key={customIndex} style={rowStyle}>
              <Link
                src={src}
                style={tw(twMerge(linkBaseStyle, level === 2 && 'ml-[10pt] font-light'))}
              >
                {title}
              </Link>
              <View style={lineStyle} />
              <Text style={pageNumberStyle}>{pageNumber}</Text>
            </View >
          )
        })
      }
    </View>
  }, [TocContainerStyle, lineStyle, pageNumberStyle, rowStyle, tableOfContents]);

  const TocPageStyle = tw("flex flex-col items-stretch border border-stone-200 px-[40pt] py-[80pt]");
  const TocPage = useMemo(() => {
    return (
      <Page wrap size="A4" style={TocPageStyle}>
        {Header}
        {Footer}
        <PdfSectionHeading index={0}>Table of Contents</PdfSectionHeading>
        {Toc}
      </Page>
    )
  }, [Header, Footer, Toc, TocPageStyle]);

  const BodyPageStyle = tw("flex flex-col items-stretch border border-stone-200 px-[40pt] py-[75pt]");
  const Body = useMemo(() => {
    return <>
      {sections.map((section, index) => (
        <Page wrap size="A4" style={BodyPageStyle}>
          {Header}
          {Footer}
          <PdfSectionPanel
            mapBase64={props.mapBase64}
            // qrCodeBase64={props.qrCodeBase64} // Pass the QR Code base64
            key={index}
            index={index}
            editable={false}
            section={section}
            updateSection={() => { }}
            removeSection={() => { }}

            cood={{ lat: props.Latitude, long: props.Longitude, label: props.mapLabel }}
            grcRecords={props.grcRecords}
            plotMVAnalysisRecords={props.plotMVAnalysisRecords}
            items={props.items}
          />
          {/* Render the QR Code */}
          {/* <PdfQRcode base64={props.qrCodeBase64} /> */}
        </Page>
      ))}
    </>
  }, [BodyPageStyle, Footer, Header, props.mapBase64, props.qrCodeBase64, props.Latitude, props.Longitude, props.grcRecords, props.items, props.mapLabel, sections]);

  const ImagesPageStyle = tw("flex flex-col items-stretch border border-stone-200 py-[75pt] px-[40pt] gap-8");
  const ImagesPage = useMemo(() => {
    return (
      <Page size="A4" style={ImagesPageStyle}>
        {Header}
        {Footer}
        <PdfSectionHeading index={sections.length + 1} tocDone={tocDone} updateToc={updateToc}>Images</PdfSectionHeading>
        <PdfValuationsImageGallery images={images.imageGallery} />
        <PdfQRcode base64={props.qrCodeBase64} />
      </Page>
    )
  }, [ImagesPageStyle, Header, Footer, sections.length, tocDone, updateToc, images.imageGallery]);

  return (
    <Document>
      {CoverPage}
      {TocPage}
      {Body}
      {ImagesPage}
    </Document>
  )
}