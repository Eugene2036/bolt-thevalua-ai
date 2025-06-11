import React from 'react';
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface BankerAnalyticsProps {
    valuationInstructionsData: Array<{
        accepted: string | null;
        location?: string;
        plot: {
            valuationType?: string | null;
            propertyLocation?: string | null;
            company?: {
                CompanyName?: string;
            };
        };
        clientType?: string;
        neighbourhood?: string;
        createdAt: string;
    }>;
    valuationHistory: Array<{
        createdAt: string;
    }>;
}

const BankerAnalytics: React.FC<BankerAnalyticsProps> = ({ valuationInstructionsData, valuationHistory }) => {
    // Helper function to count occurrences by property
    const countByProperty = (data: Array<Record<string, any>>, property: string) => {
        return data.reduce((acc, item) => {
            const key = item[property] || 'Unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    };

    // Calculate acceptance counts
    const sentCount = valuationInstructionsData.filter(n => n.accepted === 'Unread').length;
    const acceptedCount = valuationInstructionsData.filter(n => n.accepted === 'Accepted').length;
    const declinedCount = valuationInstructionsData.filter(n => n.accepted === 'Declined').length;
    const totalInstructions = valuationInstructionsData.length;

    // Analysis by propertyLocation
    const locationCounts = countByProperty(valuationInstructionsData, 'location');
    const locationData = Object.entries(locationCounts).map(([name, value]) => ({ name, value }));

    // Analysis by valuationType
    const valuationTypeCounts = valuationInstructionsData.reduce((acc, instruction) => {
        const valuationType = instruction.plot?.valuationType || 'Unknown';
        acc[valuationType] = (acc[valuationType] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const valuationTypeData = Object.entries(valuationTypeCounts).map(([name, value]) => ({ name, value }));

    // Analysis by neighbourhood
    const neighbourhoodCounts = countByProperty(valuationInstructionsData, 'neighbourhood');
    const neighbourhoodData = Object.entries(neighbourhoodCounts).map(([name, value]) => ({ name, value }));

    // Valuation history timeline
    const historyTimeline = valuationHistory.reduce((acc: Record<string, number>, history) => {
        const date = new Date(history.createdAt).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const timelineData = Object.entries(historyTimeline).map(([date, count]) => ({
        date,
        count
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Analysis by CompanyName
    const companyCounts = valuationInstructionsData.reduce((acc, instruction) => {
        const companyName = instruction.plot.company?.CompanyName || 'Unknown';
        acc[companyName] = (acc[companyName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const companyData = Object.entries(companyCounts).map(([name, value]) => ({ name, value }));

    // Age analysis of valuation instructions
    const ageAnalysis = valuationInstructionsData.reduce((acc, instruction) => {
        const createdAt = new Date(instruction?.acceptedDate);
        const now = new Date();
        const ageInDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        let ageGroup;
        if (ageInDays <= 1) ageGroup = '0-1 days';
        else if (ageInDays <= 3) ageGroup = '2-3 days';
        else if (ageInDays <= 7) ageGroup = '4-7 days';
        else if (ageInDays <= 14) ageGroup = '8-14 days';
        else if (ageInDays <= 30) ageGroup = '15-30 days';
        else ageGroup = '30+ days';

        acc[ageGroup] = (acc[ageGroup] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const ageAnalysisData = [
        { name: '0-1 days', value: ageAnalysis['0-1 days'] || 0 },
        { name: '2-3 days', value: ageAnalysis['2-3 days'] || 0 },
        { name: '4-7 days', value: ageAnalysis['4-7 days'] || 0 },
        { name: '8-14 days', value: ageAnalysis['8-14 days'] || 0 },
        { name: '15-30 days', value: ageAnalysis['15-30 days'] || 0 },
        { name: '30+ days', value: ageAnalysis['30+ days'] || 0 },
    ];

    // Custom legend renderer for pie charts
    const renderColorfulLegendText = (value: string, entry: any) => {
        const { color } = entry;
        return (
            <span style={{ color, padding: '0 5px' }}>
                {value}
            </span>
        );
    };

    return (
        <div className="banker-analytics">
            {/* Acceptance Summary Cards */}
            <div className="summary-cards">
                <div className="grid grid-cols-3 summary-card sent">
                    <h3>Unread</h3>
                    <div className="count">{sentCount}</div>
                    <div className="percentage">{totalInstructions > 0 ? ((sentCount / totalInstructions) * 100).toFixed(1) : 0}%</div>
                </div>

                <div className="grid grid-cols-3 summary-card accepted">
                    <h3>Accepted</h3>
                    <div className="count">{acceptedCount}</div>
                    <div className="percentage">{totalInstructions > 0 ? ((acceptedCount / totalInstructions) * 100).toFixed(1) : 0}%</div>
                </div>

                <div className="grid grid-cols-3 summary-card declined">
                    <h3>Declined</h3>
                    <div className="count">{declinedCount}</div>
                    <div className="percentage">{totalInstructions > 0 ? ((declinedCount / totalInstructions) * 100).toFixed(1) : 0}%</div>
                </div>

                <div className="grid grid-cols-3 summary-card total">
                    <h3>Total</h3>
                    <div className="count">{totalInstructions}</div>
                    <div className="percentage">100%</div>
                </div>
            </div>

            <div className="analytics-grid">

                {/* Company Distribution Pie Chart */}
                <div className="chart-container">
                    <h3>Company Distribution</h3>
                    <div className="chart-with-key">
                        {companyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={companyData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={false}
                                    >
                                        {companyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number, name: string, props: any) => [
                                            value,
                                            `${name} (${((value / totalInstructions) * 100).toFixed(1)}%)`
                                        ]}
                                    />
                                    <Legend
                                        layout="horizontal"
                                        verticalAlign="bottom"
                                        align="center"
                                        formatter={renderColorfulLegendText}
                                        wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center py-8 text-gray-500">No data available</div>
                        )}
                    </div>
                </div>

                {/* Age Analysis Line Chart */}
                <div className="chart-container">
                    <h3>Instruction Age Analysis</h3>
                    {ageAnalysisData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={ageAnalysisData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                {/* <Legend formatter={renderColorfulLegendText} /> */}
                                <Line type="monotone" dataKey="value" stroke="#FF8042" name="Instructions" />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center py-8 text-gray-500">No data available</div>
                    )}
                </div>

                {/* Valuation History Timeline */}
                <div className="chart-container">
                    <h3>Valuation Reports Timeline</h3>
                    {timelineData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={timelineData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                {/* <Legend formatter={renderColorfulLegendText} /> */}
                                <Line type="monotone" dataKey="count" stroke="#0088FE" name="Valuations" />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center py-8 text-gray-500">No data available</div>
                    )}
                </div>

                {/* Property Locations Bar Chart */}
                <div className="chart-container">
                    <h3>Property Locations</h3>
                    <div className="chart-with-key">
                        {locationData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={locationData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    {/* <Legend formatter={renderColorfulLegendText} /> */}
                                    <Bar dataKey="value" fill="#82CA9D" name="Count" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center py-8 text-gray-500">No data available</div>
                        )}
                    </div>
                </div>

                {/* Neighbourhood Distribution */}
                <div className="chart-container">
                    <h3>Neighbourhood Distribution</h3>
                    <div className="chart-with-key">
                        {neighbourhoodData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={neighbourhoodData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    {/* <Legend formatter={renderColorfulLegendText} /> */}
                                    <Bar dataKey="value" fill="#FF8042" name="Count" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center py-8 text-gray-500">No data available</div>
                        )}
                    </div>
                </div>

                {/* Valuation Types Bar Chart */}
                <div className="chart-container">
                    <h3>Valuation Types</h3>
                    {valuationTypeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={valuationTypeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                {/* <Legend formatter={renderColorfulLegendText} /> */}
                                <Bar dataKey="value" name="Count">
                                    {valuationTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center py-8 text-gray-500">No data available</div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .banker-analytics {
                    padding: 0px;
                    padding-top: 0;
                    font-family: Arial, sans-serif;
                }
                h2 {
                    color: #333;
                    margin-bottom: 30px;
                }
                h3 {
                    color: #555;
                    text-align: center;
                    margin-bottom: 10px;
                }
                .chart-subtitle {
                    text-align: center;
                    margin-bottom: 15px;
                    color: #666;
                    font-size: 14px;
                }
                .summary-cards {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .summary-card {
                    background: white;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    text-align: center;
                }
                .summary-card.sent {
                    border-top: 4px solid #0088FE;
                }
                .summary-card.accepted {
                    border-top: 4px solid #00C49F;
                }
                .summary-card.declined {
                    border-top: 4px solid #FF8042;
                }
                .summary-card.total {
                    border-top: 4px solid #8884D8;
                }
                .summary-card .count {
                    font-size: 28px;
                    font-weight: bold;
                    margin-top; 0;
                }
                .summary-card .percentage {
                    font-size: 16px;
                    color: #666;
                }
                .analytics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 10px;
                }
                .chart-container {
                    background: white;
                    border-radius: 8px;
                    padding: 15px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .chart-with-key {
                    display: flex;
                    flex-direction: column;
                }
                .recharts-legend-item-text {
                    color: #333 !important;
                }
                .recharts-legend-item {
                    display: inline-block;
                    white-space: nowrap;
                    margin-right: 10px;
                }
            `}</style>
        </div>
    );
};

export default BankerAnalytics;