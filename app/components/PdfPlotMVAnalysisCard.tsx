import { View, Text } from "@react-pdf/renderer";
import { createTw } from "react-pdf-tailwind";
import { PdfTable } from "./PdfTable";
const tw = createTw({});

interface Comparable {
    plotNumber: string;
    plotExtent: number;
    propertyType: string;
    suburb: string;
    price: number;
    transactionDate: string;
}

interface Props {
    plotNumber: string;
    plotDesc: string;
    comparables: Comparable[];
    avgPrice: number;
    landRate?: number;
    buildRate?: number;
    perculiar?: number;
    marketValue: number;
    forcedSaleValue: number;
    valuerComments: string;
    aiAnalysis?: string;
}

export function PdfPlotMVAnalysisCard(props: Props) {
    const {
        plotNumber,
        plotDesc,
        comparables,
        avgPrice,
        landRate,
        buildRate,
        perculiar,
        marketValue,
        forcedSaleValue,
        valuerComments,
        aiAnalysis,
    } = props;

    return (
        <View style={tw("border-b border-gray-300")}>
            <Text style={tw("font-semibold text-sm mb-2")}>Market Comparables</Text>
            <PdfTable
                headers={['Plot #', 'Type', 'Suburb', 'Extent (m²)', 'Price', 'Date']}
                data={comparables.map(c => [
                    c.plotNumber,
                    c.propertyType,
                    c.suburb,
                    String(c.plotExtent),
                    `P ${c.price.toLocaleString()}`,
                    c.transactionDate,
                ])}
            />
            <View style={tw("mt-2 mb-2 text-sm")}>
                <Text>Land Rate: {landRate !== undefined ? landRate.toLocaleString() : '-'}</Text>
                <Text>Build Rate: {buildRate !== undefined ? buildRate.toLocaleString() : '-'}</Text>
                <Text>Perculiar Adjustment: {perculiar !== undefined ? perculiar.toLocaleString() : '-'}%</Text>
                <Text>Market Value: P {marketValue.toLocaleString()}</Text>
                <Text>Forced Sale Value: P {forcedSaleValue.toLocaleString()}</Text>
            </View>
            <Text style={tw("font-semibold text-sm mt-2 mb-1")}>Valuer's Comments:</Text>
            <Text style={tw("text-sm mb-2")}>{valuerComments}</Text>
            <Text style={tw("text-sm mb-1")}>{aiAnalysis}</Text>
        </View>
    );
}