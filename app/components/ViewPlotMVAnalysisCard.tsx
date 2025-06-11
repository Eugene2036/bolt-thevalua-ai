import React from "react";

interface Comparable {
    plotNumber: string;
    plotExtent: number;
    propertyType: string;
    suburb: string;
    price: number;
    transactionDate: string;
}

interface Props {
    data: {
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
    };
}

export function ViewPlotMVAnalysisCard({ data }: { data: Props["data"] }) {
    if (!data) return null;

    return (
        <div className="flex flex-col border rounded p-4 mb-4 bg-white">
            <h3 className="font-bold text-lg mb-2">Market Value Analysis</h3>
            <div className="mb-2">Plot: <b>{data.plotNumber}</b> — {data.plotDesc}</div>
            <div className="font-semibold mb-1">Comparables:</div>
            <table className="table-auto w-full text-xs mb-2 border">
                <thead>
                    <tr>
                        <th className="border px-2">Plot Number</th>
                        <th className="border px-2">Type</th>
                        <th className="border px-2">Suburb</th>
                        <th className="border px-2">Extent (m²)</th>
                        <th className="border px-2">Price</th>
                        <th className="border px-2">Date</th>
                    </tr>
                </thead>
                <tbody>
                    {data.comparables.map((c, i) => (
                        <tr key={i}>
                            <td className="border px-2">{c.plotNumber}</td>
                            <td className="border px-2">{c.propertyType}</td>
                            <td className="border px-2">{c.suburb}</td>
                            <td className="border px-2">{c.plotExtent}</td>
                            <td className="border px-2">P {c.price.toLocaleString()}</td>
                            <td className="border px-2">{c.transactionDate}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="mb-2">
                <b>Average Price:</b> P {data.avgPrice.toLocaleString()}<br />
                <b>Land Rate:</b> {data.landRate ?? '-'} | <b>Build Rate:</b> {data.buildRate ?? '-'}<br />
                <b>Perculiar Adjustment:</b> {data.perculiar ?? '-'}%<br />
                <b>Market Value:</b> P {data.marketValue.toLocaleString()}<br />
                <b>Forced Sale Value:</b> P {data.forcedSaleValue.toLocaleString()}
            </div>
            <div>
                <b>Valuer's Comments:</b>
                <div className="text-xs">{data.valuerComments}</div>
                {data.aiAnalysis && (
                    <>
                        <div className="font-semibold mt-2">AI Analysis:</div>
                        <div className="text-xs">{data.aiAnalysis}</div>
                    </>
                )}
            </div>
        </div>
    );
}