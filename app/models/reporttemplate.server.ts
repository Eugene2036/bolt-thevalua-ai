import type { Company, Password, User } from '@prisma/client';

import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

import { prisma } from '~/db.server';

import { EventAction, EventDomain } from './events';

export type { User } from '@prisma/client';

export async function getUserById(id: User['id']) {
    return prisma.user.findUnique({ where: { id } });
}

export async function getCompanyById(id: Company['id']) {
    return prisma.company.findUnique({ where: { id } });
}

export async function getUserByEmail(email: User['email']) {
    return prisma.user.findUnique({ where: { email } });
}

export async function getCompanyByEmail(Email: Company['Email']) {
    return prisma.company.findUnique({ where: { Email } });
}

export function createHashedPassword(password: string) {
    return bcrypt.hash(password, 10);
}


const Introduction = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>This valuation assessment exercise arises from the client's written instructions
    to inspect and value the asset in question to establish its <b>Market Value</b>,
    determine a <b>Forced Sale Value</b> and its <b>Gross Replacement Cost</b>.
    </span></p>`;

const PurposeOfValuation = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>For statutory annual financial reporting, in line with acceptable IFRS and IVS
    standards.</span></p>`;

const PropertyDescription = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>A <b>(leasehold)</b> interest on Plot<b> {plotNumber} </b>together with the developments
    thereon. The developments being a <b>(hotel, casino conference facility)</b> and the supporting developments
    thereon.</p>`;

const Relevance = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>This report and any reference to it cannot be published in any form, including
    documents, circulars, or statements, without the consent of the valuer. The
    valuer must approve the manner and context in which the report is presented,
    subject to the parties' pre-existing agreement.</p>`;

const FairValueNum = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>P{marketValue} ({marketValueInWords} Pula)</p>`;
const ForcedSaleValueNum = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>P{forcedValue} ({forcedValueInWords} Pula)</p>`;
const InsuranceReplacementCostNum = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>P{replacementCost} ({replacementCostInWords} Pula)</p>`;

const Instruction = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>This valuation assessment exercise arises from the client's written instructions
    to inspect and value the asset in question to establish its <b><span>Market Value</b>,
    determine a <b>Forced Sale Value</b> and its <b>Gross Replacement Cost</b>.
</p>`;

const Intent = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>This report is intended solely for the use of <b>Botswana Hotel Development Company (BHDC)</b>
    and its advisors and should not be relied on by anyone else or for any purpose other than that stated.</p>`;

const InterestBeingValued = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>A leasehold interest on Plot <b>{plotNumber}</b> together with the developments thereon.The developments being a hotel, casino conference facility and the supporting developments thereon.</p>`;

const Purpose = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>The valuation is intended for statutory annual financial reporting, in line with acceptable IFRS and IVS standards.</p>`;

const BasisOfValue = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>To establish the fair value, forced sale value and gross replacement cost of the subject asset.</p>`;

const ValuationStandard = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>This valuation has been produced in accordance with the guidelines set by the <b>Royal Institute of Chartered
        Surveyors (RICS)</b> and <b>International
        Valuation Standards Committee (IVSC)</b> and adheres to the standards
    of <b>International Financial Reporting Standards (IFRS)</b>.</p>`;

const LandUse = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>This report and any reference to it cannot be published in any form, including documents, circulars, or 
    statements, without the consent of the valuer.</p> <p>The valuer must approve the manner and context in which the report is presented, 
    subject to the parties' pre-existing agreement.</p>`;

const LimitationLiability = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>No claim arising out of or in connection with this valuation report may be brought against 
    any member, employee, partner, director or consultant of {companyName}.Those individuals will not have personal duty of 
    care to any party and any claim for losses must be brought against the valuer.</p>`;

const PecularityInterest = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>We confirm that we do not have any pecuniary interest that would conflict with the proper 
    valuation of the subject property.</p>`;

const Condition = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>While we were not instructed to conduct a structural survey or provide a full assessment of the properties' 
    condition, a visual inspection suggests that they were constructed in accordance with building requirements. However, we 
    recommend seeking further advice or inspection from relevant stakeholders.</p>`;

const Environment = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>We have no information regarding past mining, contaminated land, radon or other
    gases, or hazardous materials on the property or adjacent land. Environmental
    investigations or a site audit were beyond the scope of this report. Should
    concerns arise, appropriate specialists should be consulted for a
    comprehensive report.</p>
<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>Our report assumes that all necessary licences, permits, consents, and approvals
    have been obtained, and that the properties comply with relevant
    environmental and statutory requirements.</p>`;

const Disclaimer = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>Whilst we have attempted to confirm the veracity of information supplied, the scope of work did not extend to verification of all information supplied or due diligence.Our valuation and report has been prepared on the assumption the instructions and information supplied has been provided in good faith and contains a full disclosure of all information that is relevant.</p> <p>The valuer and valuation firm does not accept any responsibility or liability whatsoever in the event the valuer has been provided with insufficient, false or misleading information.</p>`;

const MarketValue = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>The estimated amount for which an asset or liability should be exchanged on the valuation date between a willing buyer and a willing seller in an arm’s length transaction, after proper marketing and where the parties had each acted knowledgeably, prudently and without compulsion.</p>`;

const ForcedSaleValue = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>The term “Forced Sale” is often used in circumstances where a seller is under
    compulsion to sell and that, as a consequence, a proper marketing period is
    not possible and buyers may not be able to undertake adequate due diligence.
    The price that could be obtained in these circumstances will depend upon the
    nature of the pressure on the seller and the reasons why proper marketing
    cannot be undertaken.</p>
<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>It may also reflect the consequences for the seller of failing to sell within the
    period available. Unless the nature of, and the reason for, the constraints
    on the seller are known, the price obtainable in a forced sale cannot be
    realistically estimated. The price that a seller will accept in a forced sale
    will reflect its particular circumstances, rather than those of the
    hypothetical willing seller in the market value definition. A “Forced Sale”
    is a description of the situation under which the exchange takes place, not a
    distinct basis of value.</p>`;

const InsuranceReplacementCost = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>The estimated cost of erecting or constructing a modern substitute building of the same gross internal area and ancillary works together with relevant professional fees and other associated expenses directly related to the construction of the property and site works.</p>`;

const PropDescription = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>A detailed description of the property...</p>`;

const Location = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>Description of property location...</p>`;

const PlotSize = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>This property sits on a land size of <b>{plotExtent}</b> sqm.</p>`

const Construction = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>Listed below are the construction elements for the property:</p>`;

const Accommodation = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>A description of accommodation facilities availeble...</p>`;

const ConditionAndRepair = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>The property appears to be in good condition having regard to its age and use.The external elevations appear to be in sound repair, and the internal areas are clean and well maintained.</p>`;

const Services = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>The following services are connected:</p> {services}`;

// const Tenure = `The property is currently held under a Deed of Fixed Period State Grant, registered at the Deeds Office of Gaborone under title deed no. {titleDeedNumber} dated {titleDeedDate} in favour of {clientCompanyName}. It is assumed that there are no covenants or encumbrances of a restrictive or onerous nature.                                                                                                                                                   ";

const Tenure = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>The property is currently held under a <b>Deed of Fixed Period State Grant</b>,
    registered at the Deeds Office of Gaborone under title deed no. <b>{titleDeedNumber} </b>dated
    <b>{titleDeedDate}</b> in favour of <b>{clientCompanyName}</b>. It is assumed
    that there are no covenants or encumbrances of a restrictive or onerous nature.
</p>`;

const HighestBestUse = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>The subject property is a resort that includes a hotel, casino, and convention centre.It is fully developed with internal infrastructure and features a nature reserve, among other amenities.</p>`;

// const InspectionAndValuation = `We advise that we have been instructed to value the property as of the { instructionDate }. The Property was inspected on the { inspectionDate } and our valuation reflects the valuer's view of the market as of the {valuationDate} and does not purport to predict the future. The valuer assumes that the property has not changed in any significant or material way between the date of inspection and the date of valuation. If there have been any substantial changes during that period, the valuer reserves the right to review the valuation at its sole discretion.                                                                                                                                                   ";

const InspectionAndValuation = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>We advise that we have been instructed to value the property as of the <b>{instructionDate}</b>.
    The Property was inspected on the <b>{inspectionDate}</b>and our valuation reflects the valuer's view of the market
    as of the <b>{valuationDate}</b>
    and does not purport to predict the future. </p>
<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>The valuer assumes that the property has not changed in any significant or
    material way between the date of inspection and the date of valuation. If
    there have been any substantial changes during that period, the valuer
    reserves the right to review the valuation at its sole discretion.</p>`;

const ExtentOfInvestigations = `
<p>
The valuer has carried out an internal inspection on the property. No limitations
    or restrictions were encountered during the inspection process.
</p>
<p>This valuation includes all the fixed equipment, fixtures, fittings and equipment
    owned by the Landlord and essential in the running or management of the
    property. Any items, furnishings, equipment, improvements, plants or fixtures
    owned by the tenant do not form part of this valuation.
</p>
<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>No consideration of any natural hazards such as ground instability, mining or
    mineral extraction, radon gas, risk of flooding from all mechanisms,
    including pluvial and fluvial sources or non-natural hazards such as
    contamination where substances are in, on or under the ground resulting from
    current or historic uses, which is beyond the scope of this exercise.
</p>
<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>The valuer, in preparing this valuation, includes due Diligence checks by the
    review of the legal titles of the property.
</p>`;

const NatureSourceOfInfo = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>
    The data used in the compilation of this report has been obtained from a variety
    of sources. Sales data sourced from the Deeds Office over the past five years
    in addition to Real Asset's own proprietary transaction database and third
    party brokers.
</p>
<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>
    Market Data has been sourced using primary research tools supported by data from the
    Statistics Botswana, Deeds Registry, DSM among others. </p>
<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>Supplementary
    data and general market information was compiled from a number of public
    domain sources and reports in addition to our own surveys and data mining
    efforts. </p>
<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>
    Since
    the valuation will be based on a number of assumptions that have been
    compiled by Real Assets on a best effort basis according to current knowledge
    of market dynamics and available information, actual market conditions may
    differ from stated assumptions. </p>
<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>All valuations are backwards looking and thus based on past
    evidence and not future predictions. As such the valuation is most accurate
    at the date of valuation and loses considerable accuracy over time. It is
    estimated that stated valuations are accurate for a period of no more than 12
    months from the date of valuation. </p>
<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>The valuer has further relied on the following documents:</p>
<ol>
    <li>Agreements between client and tenant</li>
    <li>Title deed, and</li>
    <li>Property Floor Plans</li>
</ol>`;

const Assumptions = `<ol start=1 type=1>
    <li>The property is entirely free of encumbrances, restrictions, easements and
        restrictive covenants.</li>
    <li>No hazardous materials are used in the construction of the property</li>
    <li>There are no current plans by authorities that would impact the value of the property.</li>
    <li>There are no plans to change laws and regulations surrounding property ownership and use.</li>
    <li>Data (financial or otherwise) provided by the <b>Client</b> will be assumed true without Due Diligence.</li>
    <li>The property is not subject of any environment related risks</li>
    <li>The buildings are structurally sound, and there are no structural, latent or
        other material defects, including rot and inherently dangerous or
        unsuitable materials or construction techniques, whether in parts of the
        building we have inspected or not.</li>
    <li>The buildings have been constructed and are used in accordance with all
        statutory and by-law requirements, and that there are no breaches of
        planning control. Likewise, that any future construction or use will be
        lawful.</li>
    <li>The property is connected, or capable of being connected without undue
        expense, to the public services of gas, electricity, water, telephones
        and sewerage.</li>
</ol>`;

const SpecialAssumptions = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>When valuing investment properties, some special assumptions that we have considered  include the following:</p>
<ol start=1 type=1>
    <li>The expected rental  income over a certain period.</li>
    <li>The potential for changes in demand or supply factors that may affect the valuation of the property.</li>
    <li>The impact of inflation on the property, including expenses such as maintenance costs.</li>
    <li>The potential financial risks associated with the investment.</li>
    <li>The tax implications of owning the property.</li>
</ol>`;

const EnableCapRate = true;

const CommentsOnCapRates = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>Classified as income-producing assets, hotels are mainly valued based on their recurrent
    income-generating potential. Similar to other forms of commercial real
    estate, one fundamental indicator of their percentage profit is the
    capitalisation rate (cap rate).</p>
<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>Hotels typically have the highest capitalization rates of any asset class, with most
    cap rates ranging between 6% to 10.5%, depending on the type of asset and
    market factors. It is to be noted that using a cap rate does not predict the
    future profitability of the asset, since it is using historical data to
    determine the value.</p>`;

const ValuationMethodology = `<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>To establish the appropriate valuation method for the subject property, the fact
        that it generates income was taken into consideration. After careful review,
        the Income Capitalisation Method using <b>Discounted Cash Flow (DCF)</b>
        approach was deemed the most suitable. </p>
<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>This is a comprehensive valuation technique primarily used for income-producing
        properties. This method estimates the present value of future cash flows
        generated by the property, taking into account the time value of money.</p>`;

const Market = `<h2>Market Overview</h2>
<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>The hotel investment property market is currently stable, with improved occupancy
    rates observed across the sector over the last year. However, investors
    remain cautious, particularly regarding lower-tier (B or C grade) properties with lower occupancy rates.</p>
<p><b>Supply Dynamics</b></>
<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>Greater Gaborone faces a shortage of high-quality hotels. In the past decade, only a
    few developments have materialised, including Room52 and the renovated Oasis
    Hotel in Tlokweng. This limited supply growth highlights potential opportunities
    in the market.</p>
<p><b>Demand Trends</b></p>
<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>Well-situated commercial accommodations in the greater Gaborone area continue to experience
    robust demand. This trend underscores the potential for strategically located
    hotel investments.</p>
<p><b>Investment Outlook</b></p>
<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>Despite the general adequacy of quality hotels in greater Gaborone, sellers of prime
    properties may expect relatively quick transactions due to the ongoing
    demand-supply imbalance in the high-end segment.</p>
<p><b>Future Projections</b></p>
<p style={{ marginTop: '15px' , marginBottom: '15px' , marginLeft: '10px' , marginRight: '10px' }}>Considering the sustained growth in the hospitality sector within greater Gaborone, it is
    anticipated that future property values will align with broader market
    trends. This suggests a potentially favourable long-term outlook for
    well-positioned hotel investments in the area.</p>`;

const ValuationCurrency = `This valuation has been prepared with all monetary figures in <b>Botswana Pula (BWP)</b>.`;




export async function CreateReportTemplate(
    props: {
        name: string;
        companyId: string;
    },
    currentUserId: string,
) {


    const { name,
        companyId,
    } = props;

    const verToken = faker.string.uuid();

    const numDupl = await prisma.reportTemplate.count({
        where: { name: name },
    });
    if (numDupl) {
        throw new Error('A template with that name already exists');
    }

    const result = await prisma.$transaction(async (tx) => {
        try {
            const names = [props.name];
            const headerTitles = ['Summary Of Valuation', 'Opinion Of Value', 'Scope Of Work', 'Bases Of Value', 'Property Details', 'Scope Of Equity'];

            // Combine all sub-header titles into a single array of arrays
            const subHeaderTitles = [
                ['Scope of Work', 'Purpose of Valuation', 'Property Description', 'Relevance', 'Valuation Currency'], // Summary of Valuation
                ['Fair Value.', 'Forced Sale Value.', 'Insurance Replacement Cost.'], // Opinion of Value
                ['Instruction', 'Intent', 'Interest Being Valued', 'Purpose', 'Basis of Value', 'Valuation Standards', 'Current Use', 'Limitation and Liability', 'Pecuniary Interest', 'Condition', 'Environment', 'Disclaimer'], // Scope of Work
                ['Market Value', 'Forced Sale Value', 'Insurance Replacement Cost'], // Bases of Value
                ['Description', 'Location', 'Plot Size', 'Construction', 'Accommodation', 'Condition and Repairs', 'Services', 'Tenure', 'Highest and Best Use'], // Property Details
                ['Inspection and Valuation', 'Extent of investigations', 'Nature and Source of Information', 'Assumptions', 'Special Assumptions', 'Comments on CAP Rates', 'Valuation Methodology', 'Market'], // Scope of Equity
            ];

            // Combine all body content into a single array of arrays
            const bodyContentInfos = [
                [Introduction, PurposeOfValuation, PropertyDescription, Relevance, ValuationCurrency], // Summary of Valuation
                [FairValueNum, ForcedSaleValueNum, InsuranceReplacementCostNum], // Opinion of Value
                [Instruction, Intent, InterestBeingValued, Purpose, BasisOfValue, ValuationStandard, LandUse, LimitationLiability, PecularityInterest, Condition, Environment, Disclaimer], // Scope of Work
                [MarketValue, ForcedSaleValue, InsuranceReplacementCost], // Bases of Value
                [PropDescription, Location, PlotSize, Construction, Accommodation, ConditionAndRepair, Services, Tenure, HighestBestUse], // Property Details
                [InspectionAndValuation, ExtentOfInvestigations, NatureSourceOfInfo, Assumptions, SpecialAssumptions, CommentsOnCapRates, ValuationMethodology, Market], // Scope of Equity
            ];

            // Step 1: Create ReportTemplate records
            const reportTemplates = await Promise.all(
                names.map((name) =>
                    prisma.reportTemplate.create({
                        data: {
                            name,
                            companyId: props.companyId,
                        },
                    })
                )
            );
            console.log("Report Templates Created:", reportTemplates);

            // Step 2: Create ReportHeader records
            const reportHeaders = await Promise.all(
                reportTemplates.flatMap((template) =>
                    headerTitles.map((headerTitle) =>
                        prisma.reportHeader.create({
                            data: {
                                headerTitle,
                                reportTemplateId: template.id,
                            },
                        })
                    )
                )
            );
            console.log("Report Headers Created:", reportHeaders);

            // Step 3: Create ReportSubHeader records
            const reportSubHeaders = await Promise.all(
                reportHeaders.flatMap((header, headerIndex) =>
                    subHeaderTitles[headerIndex].map((subHeaderTitle) =>
                        prisma.reportSubHeader.create({
                            data: {
                                subHeaderTitle,
                                reportHeaderId: header.id,
                            },
                        })
                    )
                )
            );
            console.log("Report Sub Headers Created:", reportSubHeaders);

            // Step 4: Create ReportBodyContent records
            const reportBodyContents = await Promise.all(
                reportSubHeaders.flatMap((subHeader, subHeaderIndex) => {
                    // Find the corresponding header index
                    const headerIndex = reportHeaders.findIndex(header => header.id === subHeader.reportHeaderId);
                    // Find the corresponding sub-header index within the header
                    const subHeaderInHeaderIndex = subHeaderTitles[headerIndex].indexOf(subHeader.subHeaderTitle);
                    // Get the corresponding body content
                    const bodyContentInfo = bodyContentInfos[headerIndex][subHeaderInHeaderIndex];

                    return prisma.reportBodyContent.create({
                        data: {
                            bodyContentInfo,
                            subHeaderId: subHeader.id,
                        },
                    });
                })
            );

            // const reportBodyContents = await Promise.all(
            //     reportSubHeaders.flatMap((subHeader, subHeaderIndex) => {
            //         // Find the corresponding body content for this sub-header
            //         const headerIndex = reportHeaders.findIndex(header => header.id === subHeader.reportHeaderId);
            //         const bodyContentInfo = bodyContentInfos[headerIndex][subHeaderIndex];

            //         return prisma.reportBodyContent.create({
            //             data: {
            //                 bodyContentInfo,
            //                 subHeaderId: subHeader.id,
            //             },
            //         });
            //     })
            // );


            console.log("Report Body Contents Created:", reportBodyContents);


            await prisma.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.ReportTemplate,
                    action: EventAction.Create,
                    recordId: '',
                    recordData: JSON.stringify(reportTemplates),
                },
            });

            // Log the results
            console.log("Report Templates:", reportTemplates);
            console.log("Report Headers:", reportHeaders);
            console.log("Report SubHeaders:", reportSubHeaders);
            console.log("Report Body Contents:", reportBodyContents);

            return reportBodyContents;
        } catch (error) {
            console.error('Error creating report template:', error);
        }
    }
    );

    if (result instanceof Error) {
        throw result;
    }
    return result;
}

export async function deleteUserByEmail(email: User['email']) {
    return prisma.user.delete({ where: { email } });
}

export async function deleteCompanyByEmail(Email: Company['Email']) {
    return prisma.company.delete({ where: { Email } });
}

export async function deleteCompanyById(id: Company['id']) {
    return prisma.company.delete({ where: { id } });
}

export async function verifyLogin(email: User['email'], password: Password['hash']) {
    const userWithPassword = await prisma.user.findUnique({
        where: { email },
        include: { password: true },
    });

    if (!userWithPassword || !userWithPassword.password) {
        return null;
    }
    if (userWithPassword.isSuspended || !userWithPassword.isVerified) {
        return null;
    }

    const isValid = await bcrypt.compare(password, userWithPassword.password.hash);

    if (!isValid) {
        return null;
    }

    const { password: _password, ...userWithoutPassword } = userWithPassword;

    return userWithoutPassword;
}
