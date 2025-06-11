import { ComponentProps, Fragment } from 'react';
import { useTocSections } from '~/hooks/useTocSections';
import { ConstructionItem } from '~/models/con-items';
import { Section } from '~/models/reports';
import BackButton from './BackButton';
import { Card } from './Card';
import CompanyLogo from './CompanyLogo';
import CompanyPartners from './CompanyPartners';
import { PlinthAreas } from './PlinthAreas';
import { PrimaryButton } from './PrimaryButton';
import { SectionHeading } from './SectionHeading';
import { SectionPanel } from './SectionPanel';
import { TocItem } from './TocItem';
import ValuationReportCoverImage from './ValuationReportCoverImage';
import { ValuationsImageGallery } from './ValuationsImageGallery';
import printToCloudinary from '~/print-to-cloudinary';
import { ViewPlotMVAnalysisCard } from './ViewPlotMVAnalysisCard';

interface ValuationProps {
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
    CompanyPartnerIds: ComponentProps<typeof CompanyPartners>['images'];

    grcRecords: ComponentProps<typeof PlinthAreas>['records'];
    plotMVAnalysisRecords: ComponentProps<typeof ViewPlotMVAnalysisCard>['data'];
    items?: ConstructionItem[];
}
export function SecondValuationReport(props: ValuationProps) {
    const { PlotId, PlotNumber, CoverImageId, CompanyPartnerIds, sections, headerTitle, footerNote, compName, plotMVAnalysisRecords } = props;

    const tocSections = useTocSections(sections);

    function printPage() {
        if (window) {
            window.print();
        }
    }




    return (
        <div className="flex flex-col items-stretch gap-6">
            <Card id="printSection" className='flex flex-col justify-center items-stretch text-xs shadow-none relative w-[794px]'>
                <div className="h-[1124px] flex flex-col items-stretch print:absolute print:top-0 bg-white print:w-full print:z-50 overflow-hidden">
                    <div className="flex flex-col items-stretch p-10 grow shrink">
                        <div className="flex flex-col justify-center items-center py-3">
                            <CompanyLogo publicId={props.LogoLink} />
                        </div>
                        <div className="flex flex-col items-center justify-center h-2/5">
                            <ValuationReportCoverImage className="h-full" publicId={CoverImageId} />
                        </div>
                        <div className='grow' />
                        <div className="flex flex-col justify-center items-start">
                            <h1 className="w-full text-center text-xl text-black leading-loose">
                                PROPERTY VALUATION REPORT IN RESPECT OF <br />
                                <b>PLOT &nbsp;{props.mapLabel}</b>
                            </h1>
                        </div>
                        <div className='grow' />
                        <div className="flex flex-col items-stretch border-t border-t-stone-400 pt-10">
                            <CompanyPartners images={CompanyPartnerIds} />
                        </div>
                    </div>
                    <div id="red_thing" className="h-[48px] bg-red-600 shrink-0" />
                </div>

                <div className="hidden print:flex flex-col items-stretch h-screen" />

                <div className="page-header bg-white/80 print:z-10 flex flex-col justify-center items-stretch px-10 pt-4 pb-6 shrink-0">
                    <div className="flex flex-row items-center border-b border-b-stone-600 py-1">
                        <span className="text-red-600 text-lg font-light">{headerTitle}</span>
                        <div className='grow' />
                        <div className="flex flex-col justify-end items-center px-4">
                            <CompanyLogo publicId={props.LogoLink} className="max-h-[56px]" />
                        </div>
                    </div>
                </div>

                <div className="page-footer bg-white/10 print:z-10 flex flex-col justify-center items-stretch px-10 pb-4 pt-6 shrink-0">
                    <div className="flex flex-row items-end border-t border-t-stone-600 py-4 gap-4 tracking-wider">
                        <span className="text-red-600 text-sm font-light">Page ||</span>
                        <span className="text-stone-600 text-sm font-light">Private and Confidential</span>
                        <div className='grow' />
                        <span className="text-stone-600 text-sm font-light">||</span>
                        <div className='grow' />
                        <div className="flex flex-col justify-center items-center px-4">
                            <span className="text-stone-700 text-sm font-light">{footerNote}</span>
                        </div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <td style={{ border: 0 }}>
                                {/* <!--place holder for the fixed-position header--> */}
                                <div className="page-header-space"></div>
                            </td>
                        </tr>
                    </thead>

                    <tbody>
                        <tr>
                            <td style={{ border: 0 }}>
                                <div className="flex flex-col items-stretch">
                                    <div className="a4-multiple flex flex-col items-stretch overflow-hidden">
                                        <div className="inner-of-a4 flex flex-col items-stretch w-full gap-6 px-10 pb-6">
                                            <SectionHeading>Table of Contents</SectionHeading>
                                            <div className="flex flex-col items-stretch gap-2">
                                                {tocSections.map((section, index) => (
                                                    <Fragment key={index}>
                                                        <TocItem title={section.name} pageNumber={section.pageNumber} />
                                                        {section.subSections.filter(s => s.hasTitle).map((subSection, index) => (
                                                            <TocItem key={index} title={subSection.title} pageNumber={subSection.pageNumber} isSubSection />
                                                        ))}
                                                    </Fragment>
                                                ))}
                                            </div>
                                        </div>
                                        <div className='grow' />
                                    </div>
                                    <div className="flex flex-col items-stretch gap-8 px-10">
                                        {sections.map((section, index) => (
                                            <SectionPanel
                                                key={index}
                                                editable={false}
                                                section={section}
                                                updateSection={() => { }}
                                                removeSection={() => { }}

                                                cood={{ lat: props.Latitude, long: props.Longitude, label: props.mapLabel }}
                                                grcRecords={props.grcRecords}
                                                items={props.items}
                                                plotMVAnalysisRecords={props.plotMVAnalysisRecords}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex flex-col items-stretch gap-8 px-10 py-10">
                                        {/* <SectionHeading>Images</SectionHeading> */}
                                        <ValuationsImageGallery images={props.ImageGalleryIds} />
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>

                    <tfoot>
                        <tr>
                            <td style={{ border: 0 }}>
                                {/* <!--place holder for the fixed-position footer--> */}
                                <div className="page-footer-space"></div>
                            </td>
                        </tr>
                    </tfoot>

                </table>
            </Card >
            <div className="flex flex-row items-center gap-4 print:hidden">
                <BackButton />
                <div className="grow" />
                <PrimaryButton onClick={() => printToCloudinary({ PlotId: props.PlotId, PlotNumber: PlotNumber, valuerCompany: compName, headerTitle: headerTitle, footerNote: footerNote })} className='p-2'>
                    Save Report
                </PrimaryButton>
                <div className="grow" />
                <PrimaryButton onClick={printPage} className='p-2'>
                    Print Report
                </PrimaryButton>
            </div>
        </div>
    );
}