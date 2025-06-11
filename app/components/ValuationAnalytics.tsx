import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    AreaChart,
    Area,
    ScatterChart,
    Scatter,
    ComposedChart,
    ReferenceArea,
} from 'recharts';

type PlotValuation = {
    id: string;
    plotNumber: string;
    plotExtent: number;
    marketValue: number;
    forcedSaleValue: number;
    avgPrice: number;
    gba: number;
    valuationType: string;
    classification: string;
    tenants?: Array<{
        grossMonthlyRental: number;
        areaPerMarket: number;
        remMonths: number;
    }>;
    grcRecords?: Array<{
        identifier: string;
        size: number;
        rate: number;
    }>;
};

type Notification = {
    noteId: string;
    plotNumber: string;
    accepted: string;
    createdAt: string;
    updatedAt: string;
};

type ValuationAnalyticsProps = {
    plots: PlotValuation[];
    notificationData: Notification[];
    statusData?: { status: string; count: number }[];
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// const ValuationAnalytics: React.FC<ValuationAnalyticsProps> = ({ plots, notificationData, statusData = [] }) => {

const ValuationAnalytics: React.FC<ValuationAnalyticsProps> = (props) => {
    const { plots, notificationData, statusData = [] } = props;
    // Prepare data for charts
    const valuationData = plots.map(plot => ({
        name: plot.plotNumber || `Plot ${plot.id.slice(0, 5)}`,
        marketValue: plot.marketValue,
        forcedSaleValue: plot.forcedSaleValue,
        avgPrice: plot.avgPrice,
        plotExtent: plot.plotExtent,
        gba: plot.gba,
        valuationType: plot.valuationType,
        classification: plot.classification
    }));

    // Group by valuation type
    const valuationTypeData = plots.reduce((acc, plot) => {
        const type = plot.valuationType || 'Unknown';
        if (!acc[type]) {
            acc[type] = { count: 0, totalValue: 0 };
        }
        acc[type].count += 1;
        acc[type].totalValue += plot.marketValue || 0;
        return acc;
    }, {} as Record<string, { count: number; totalValue: number }>);

    const valuationTypeChartData = Object.entries(valuationTypeData).map(([type, data]) => ({
        name: type,
        count: data.count,
        averageValue: data.totalValue / data.count
    }));

    // Prepare notification data
    const notificationStatusData = notificationData.reduce((acc, notification) => {
        const status = notification.accepted || 'Pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const notificationChartData = Object.entries(notificationStatusData).map(([status, count]) => ({
        name: status,
        value: count
    }));

    // Prepare tenant data if available
    const tenantData = plots.flatMap(plot =>
        plot.tenants?.map(tenant => ({
            plot: plot.plotNumber,
            grossMonthlyRental: tenant.grossMonthlyRental,
            areaPerMarket: tenant.areaPerMarket,
            remMonths: tenant.remMonths
        })) || []
    );

    // Prepare GRC data if available
    const grcData = plots.flatMap(plot =>
        plot.grcRecords?.map(record => ({
            plot: plot.plotNumber,
            identifier: record.identifier,
            size: record.size,
            rate: record.rate
        })) || []
    );

    // Updated helper functions for regression analysis
    const calculateRegressionLine = (data: { areaPerMarket: number, grossMonthlyRental: number }[]) => {
        if (data.length < 2) return [];

        // Filter out invalid data points
        const validData = data.filter(d =>
            !isNaN(d.areaPerMarket) &&
            !isNaN(d.grossMonthlyRental) &&
            d.areaPerMarket > 0 &&
            d.grossMonthlyRental > 0
        );

        if (validData.length < 2) return [];

        const n = validData.length;
        const xSum = validData.reduce((sum, d) => sum + d.areaPerMarket, 0);
        const ySum = validData.reduce((sum, d) => sum + d.grossMonthlyRental, 0);
        const xySum = validData.reduce((sum, d) => sum + (d.areaPerMarket * d.grossMonthlyRental), 0);
        const x2Sum = validData.reduce((sum, d) => sum + (d.areaPerMarket * d.areaPerMarket), 0);

        const denominator = (n * x2Sum - xSum * xSum);
        if (Math.abs(denominator) < 0.0001) return []; // Handle very small denominators

        const slope = (n * xySum - xSum * ySum) / denominator;
        const intercept = (ySum - slope * xSum) / n;

        const minX = Math.min(...validData.map(d => d.areaPerMarket));
        const maxX = Math.max(...validData.map(d => d.areaPerMarket));

        return [
            { areaPerMarket: minX, grossMonthlyRental: slope * minX + intercept },
            { areaPerMarket: maxX, grossMonthlyRental: slope * maxX + intercept }
        ];
    };

    const calculateRSquared = (data: { areaPerMarket: number, grossMonthlyRental: number }[]) => {
        if (data.length < 2) return 0;

        // Filter out invalid data points
        const validData = data.filter(d =>
            !isNaN(d.areaPerMarket) &&
            !isNaN(d.grossMonthlyRental) &&
            d.areaPerMarket > 0 &&
            d.grossMonthlyRental > 0
        );

        if (validData.length < 2) return 0;

        const n = validData.length;
        const xSum = validData.reduce((sum, d) => sum + d.areaPerMarket, 0);
        const ySum = validData.reduce((sum, d) => sum + d.grossMonthlyRental, 0);
        const xySum = validData.reduce((sum, d) => sum + (d.areaPerMarket * d.grossMonthlyRental), 0);
        const x2Sum = validData.reduce((sum, d) => sum + (d.areaPerMarket * d.areaPerMarket), 0);
        const y2Sum = validData.reduce((sum, d) => sum + (d.grossMonthlyRental * d.grossMonthlyRental), 0);

        const numerator = (n * xySum - xSum * ySum);
        const denominator = Math.sqrt((n * x2Sum - xSum * xSum) * (n * y2Sum - ySum * ySum));

        if (Math.abs(denominator) < 0.0001) return 0;

        const r = numerator / denominator;
        return r * r;
    };

    const calculateRegressionEquation = (data: { areaPerMarket: number, grossMonthlyRental: number }[]) => {
        if (data.length < 2) return "Not enough data points";

        // Filter out invalid data points
        const validData = data.filter(d =>
            !isNaN(d.areaPerMarket) &&
            !isNaN(d.grossMonthlyRental) &&
            d.areaPerMarket > 0 &&
            d.grossMonthlyRental > 0
        );

        if (validData.length < 2) return "Not enough valid data points";

        const n = validData.length;
        const xSum = validData.reduce((sum, d) => sum + d.areaPerMarket, 0);
        const ySum = validData.reduce((sum, d) => sum + d.grossMonthlyRental, 0);
        const xySum = validData.reduce((sum, d) => sum + (d.areaPerMarket * d.grossMonthlyRental), 0);
        const x2Sum = validData.reduce((sum, d) => sum + (d.areaPerMarket * d.areaPerMarket), 0);

        const denominator = (n * x2Sum - xSum * xSum);
        if (Math.abs(denominator) < 0.0001) return "Data points are too similar";

        const slope = (n * xySum - xSum * ySum) / denominator;
        const intercept = (ySum - slope * xSum) / n;

        // Format the equation nicely
        const slopeStr = Math.abs(slope) < 0.01 ? slope.toExponential(2) : slope.toFixed(2);
        const interceptStr = Math.abs(intercept) < 0.01 ? intercept.toExponential(2) : intercept.toFixed(2);

        return `${slopeStr}x ${intercept >= 0 ? '+' : '-'} ${interceptStr}`;
    };

    interface ScatterPointProps {
        cx: number;
        cy: number;
        payload: {
            remMonths?: number;
            areaPerMarket?: number;
            grossMonthlyRental?: number;
            plot?: string;
        };
    }

    return (
        <div className="valuation-analytics">
            <h2>Property Valuation Analytics</h2>

            <div className="chart-grid">

                {/* Status Bar Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3>Valuation Status</h3>
                    <div className="h-64">
                        {statusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={statusData.map(item => ({
                                            name: item.status,
                                            value: item.count
                                        }))}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        nameKey="name"
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {statusData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number, name: string, props: any) => [
                                            value,
                                            `${name}: ${(props.payload.percent * 100).toFixed(1)}%`
                                        ]}
                                        contentStyle={{
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #dddddd',
                                            borderRadius: '4px',
                                            padding: '8px 12px'
                                        }}
                                        itemStyle={{
                                            color: '#333333',
                                            fontSize: '14px',
                                            fontWeight: 'normal'
                                        }}
                                        labelStyle={{
                                            fontWeight: 'bold',
                                            color: '#333333'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center py-8 text-gray-500">No data available</div>
                        )}
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                        {statusData.map((item) => (
                            <div key={item.status} className="text-sm">
                                <span className="font-medium">{item.status}: </span>
                                <span>{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Valuation Type Comparison */}
                <div className="chart-container">
                    <h3>Valuation Type Comparison</h3>
                    {valuationTypeChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart data={valuationTypeChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#555' }}
                                    axisLine={{ stroke: '#888' }}
                                />
                                <YAxis
                                    yAxisId="left"
                                    orientation="left"
                                    tick={{ fill: '#555' }}
                                    axisLine={{ stroke: '#888' }}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    tick={{ fill: '#555' }}
                                    axisLine={{ stroke: '#888' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '8px',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                        padding: '12px'
                                    }}
                                    itemStyle={{
                                        color: '#333',
                                        fontSize: '14px'
                                    }}
                                />
                                <Bar
                                    yAxisId="left"
                                    dataKey="count"
                                    name="Count"
                                    radius={[4, 4, 0, 0]}
                                >
                                    {valuationTypeChartData.map((entry, index) => (
                                        <Cell
                                            key={`bar-cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                            stroke="#fff"
                                            strokeWidth={1}
                                        />
                                    ))}
                                </Bar>
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="averageValue"
                                    name="Avg Value"
                                    stroke={COLORS[3]}
                                    strokeWidth={2}
                                    dot={{
                                        fill: COLORS[3],
                                        stroke: '#fff',
                                        strokeWidth: 2,
                                        r: 5
                                    }}
                                    activeDot={{
                                        r: 7,
                                        fill: COLORS[3],
                                        stroke: '#fff',
                                        strokeWidth: 2
                                    }}
                                />
                                {/* <Legend
                                    wrapperStyle={{
                                        paddingTop: '20px'
                                    }}
                                /> */}
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center py-8 text-gray-500">No data available</div>
                    )}
                </div>

                {/* Notification Status */}
                <div className="chart-container">
                    <h3>Notification Status</h3>
                    {notificationChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={notificationChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    innerRadius={40}
                                    dataKey="value"
                                    nameKey="name"
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                >
                                    {notificationChartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                            stroke="#fff"
                                            strokeWidth={1}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value, name, props) => [
                                        value,
                                        `${name}: ${((props.payload.percent || 0) * 100).toFixed(1)}%`
                                    ]}
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '8px',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                        padding: '12px'
                                    }}
                                    itemStyle={{
                                        color: '#333',
                                        fontSize: '14px'
                                    }}
                                />
                                {/* <Legend
                                    wrapperStyle={{
                                        paddingTop: '20px'
                                    }}
                                /> */}
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center py-8 text-gray-500">No data available</div>
                    )}
                </div>

                {/* Property Type Distribution */}
                <div className="chart-container">
                    <h3>Property Type Distribution</h3>
                    {valuationTypeChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={valuationTypeChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    innerRadius={40}
                                    dataKey="count"
                                    nameKey="name"
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                >
                                    {valuationTypeChartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                            stroke="#fff"
                                            strokeWidth={1}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value, name, props) => [
                                        value,
                                        `${name}: ${((props.payload.percent || 0) * 100).toFixed(1)}%`
                                    ]}
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '8px',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                        padding: '12px'
                                    }}
                                    itemStyle={{
                                        color: '#333',
                                        fontSize: '14px'
                                    }}
                                />
                                <Legend
                                    wrapperStyle={{
                                        paddingTop: '20px'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center py-8 text-gray-500">No data available</div>
                    )}
                </div>

                {/* Average Price vs Plot Extent */}
                <div className="chart-container">
                    <h3>Average Price vs Plot Extent</h3>
                    {valuationData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <ScatterChart
                                margin={{ top: 20, right: 20, bottom: 20, left: 40 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    type="number"
                                    dataKey="plotExtent"
                                    name="Plot Extent"
                                    unit=" sqm"
                                    tick={{ fill: '#555' }}
                                    axisLine={{ stroke: '#888' }}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="avgPrice"
                                    name="Average Price"
                                    tick={{ fill: '#555' }}
                                    axisLine={{ stroke: '#888' }}
                                />
                                <Tooltip
                                    cursor={{ strokeDasharray: '3 3', stroke: COLORS[2] }}
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '8px',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                        padding: '12px'
                                    }}
                                    itemStyle={{
                                        color: '#333',
                                        fontSize: '14px'
                                    }}
                                    labelStyle={{
                                        fontWeight: 'bold',
                                        color: '#222',
                                        marginBottom: '8px'
                                    }}
                                />
                                <Scatter
                                    name="Plots"
                                    data={valuationData}
                                    fill={COLORS[0]}
                                    shape={<circle r={8} />}
                                >
                                    {valuationData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                            stroke="#fff"
                                            strokeWidth={1}
                                        />
                                    ))}
                                </Scatter>
                                {/* <Legend
                                    wrapperStyle={{
                                        paddingTop: '20px'
                                    }}
                                /> */}
                            </ScatterChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center py-8 text-gray-500">No data available</div>
                    )}
                </div>

                {/* Tenant Rental Analysis */}
                {tenantData.length > 0 && (
                    <div className="chart-container">
                        <h3>Tenant Rental Analysis</h3>
                        {tenantData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart
                                    data={tenantData}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="plot" />
                                    <YAxis />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="grossMonthlyRental" stackId="1" stroke={COLORS[4]} fill={COLORS[4]} name="Gross Rent" />
                                    <Area type="monotone" dataKey="areaPerMarket" stackId="2" stroke={COLORS[5]} fill={COLORS[5]} name="Area (sqm)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center py-8 text-gray-500">No data available</div>
                        )}
                    </div>
                )}

                {/* Rental Price vs Area Analysis */}
                {tenantData.length > 0 && (
                    <div className="chart-container col-span-3">
                        <h3>Rental Price vs Area Analysis</h3>
                        {tenantData.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={400}>
                                    <ScatterChart
                                        margin={{ top: 20, right: 20, bottom: 80, left: 80 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis
                                            type="number"
                                            dataKey="areaPerMarket"
                                            name="Area"
                                            unit=" sqm"
                                            domain={['dataMin - 10', 'dataMax + 10']}
                                            tick={{ fill: '#555' }}
                                            axisLine={{ stroke: '#888' }}
                                            label={{
                                                value: 'Area (sqm)',
                                                position: 'insideBottom',
                                                offset: -50,
                                                style: { fontSize: '14px', fontWeight: 'bold' }
                                            }}
                                        />
                                        <YAxis
                                            type="number"
                                            dataKey="grossMonthlyRental"
                                            name="Monthly Rental"
                                            tickFormatter={(value) => `$${value.toLocaleString()}`}
                                            tick={{ fill: '#555' }}
                                            axisLine={{ stroke: '#888' }}
                                            label={{
                                                value: 'Monthly Rental ($)',
                                                angle: -90,
                                                position: 'insideLeft',
                                                offset: -50,
                                                style: { fontSize: '14px', fontWeight: 'bold' }
                                            }}
                                        />
                                        <Tooltip
                                            cursor={{ strokeDasharray: '3 3', stroke: COLORS[2] }}
                                            contentStyle={{
                                                backgroundColor: '#ffffff',
                                                border: '1px solid #e0e0e0',
                                                borderRadius: '8px',
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                                padding: '12px'
                                            }}
                                            formatter={(value, name, props) => [
                                                `P${Number(value).toLocaleString()}`,
                                                `Area: ${props.payload.areaPerMarket} sqm`,
                                                `Plot: ${props.payload.plot}`,
                                                `Remaining Lease: ${props.payload.remMonths || 'N/A'} months`,
                                                `Price per sqm: P${(props.payload.grossMonthlyRental / props.payload.areaPerMarket).toFixed(2)}`
                                            ]}
                                        />
                                        <Scatter
                                            name="Tenant Data Points"
                                            data={tenantData}
                                            fill="#8884d8"
                                            shape={(props) => {
                                                const { cx, cy, payload } = props as ScatterPointProps; // Cast props to ScatterPointProps
                                                const radius = Math.min(20, Math.max(8, (payload?.grossMonthlyRental || 0) / 1000)); // Handle undefined grossMonthlyRental
                                                return (
                                                    <g>
                                                        <circle
                                                            cx={cx}
                                                            cy={cy}
                                                            r={radius}
                                                            fill={COLORS[
                                                                (payload?.remMonths ?? 0) > 24 // Use nullish coalescing to handle undefined
                                                                    ? 0
                                                                    : (payload?.remMonths ?? 0) > 12
                                                                        ? 1
                                                                        : (payload?.remMonths ?? 0) > 6
                                                                            ? 2
                                                                            : 4
                                                            ]}
                                                            stroke="#fff"
                                                            strokeWidth={1.5}
                                                            opacity={0.8}
                                                        />
                                                        {payload?.remMonths !== undefined && ( // Check if remMonths is defined
                                                            <text
                                                                x={cx}
                                                                y={cy}
                                                                dy={4}
                                                                textAnchor="middle"
                                                                fill="#fff"
                                                                fontSize={radius > 12 ? 10 : 8}
                                                                fontWeight="bold"
                                                            >
                                                                {payload.remMonths}
                                                            </text>
                                                        )}
                                                    </g>
                                                );
                                            }}
                                        />
                                        {/* Regression Line */}
                                        {tenantData.length > 1 && (
                                            <Line
                                                type="monotone"
                                                dataKey="grossMonthlyRental"
                                                data={calculateRegressionLine(tenantData)}
                                                stroke={COLORS[3]}
                                                strokeWidth={2.5}
                                                strokeDasharray="5 5"
                                                dot={false}
                                                activeDot={false}
                                                name="Trend Line"
                                                legendType="plainline"
                                            />
                                        )}
                                        <Legend
                                            layout="horizontal"
                                            verticalAlign="bottom"
                                            align="center"
                                            wrapperStyle={{
                                                paddingTop: '20px',
                                                bottom: 10,
                                                left: 0,
                                                right: 0,
                                                textAlign: 'center'
                                            }}
                                            formatter={(value, entry, index) => {
                                                if (value === 'Tenant Data Points') {
                                                    return (
                                                        <span>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                width: '12px',
                                                                height: '12px',
                                                                backgroundColor: COLORS[0],
                                                                marginRight: '5px',
                                                                borderRadius: '50%'
                                                            }}></span>
                                                            Long-term ({'>'}24mo)
                                                            <span style={{
                                                                display: 'inline-block',
                                                                width: '12px',
                                                                height: '12px',
                                                                backgroundColor: COLORS[1],
                                                                margin: '0 5px 0 15px',
                                                                borderRadius: '50%'
                                                            }}></span>
                                                            Medium-term (12-24mo)
                                                            <span style={{
                                                                display: 'inline-block',
                                                                width: '12px',
                                                                height: '12px',
                                                                backgroundColor: COLORS[2],
                                                                margin: '0 5px 0 15px',
                                                                borderRadius: '50%'
                                                            }}></span>
                                                            Short-term (6-12mo)
                                                            <span style={{
                                                                display: 'inline-block',
                                                                width: '12px',
                                                                height: '12px',
                                                                backgroundColor: COLORS[4],
                                                                margin: '0 5px 0 15px',
                                                                borderRadius: '50%'
                                                            }}></span>
                                                            Very short-term ({'<'}6mo)
                                                        </span>
                                                    );
                                                }
                                                return value;
                                            }}
                                        />
                                        <ReferenceArea
                                            x1={0}
                                            x2={Math.max(...tenantData.map(d => d.areaPerMarket))}
                                            y1={0}
                                            y2={0}
                                            stroke="#ccc"
                                            strokeWidth={1}
                                        />
                                    </ScatterChart>
                                </ResponsiveContainer>
                                {tenantData.length > 1 && (
                                    <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                            <div className="text-center">
                                                <p className="font-medium">Correlation Strength</p>
                                                <p className="text-2xl font-bold" style={{
                                                    color: calculateRSquared(tenantData) > 0.7 ? '#10B981' :
                                                        calculateRSquared(tenantData) > 0.4 ? '#F59E0B' : '#EF4444'
                                                }}>
                                                    {calculateRSquared(tenantData).toFixed(3)}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {calculateRSquared(tenantData) > 0.7 ? 'Strong relationship' :
                                                        calculateRSquared(tenantData) > 0.4 ? 'Moderate relationship' : 'Weak relationship'}
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-medium">Trend Line Equation</p>
                                                <p className="text-xl font-mono font-bold text-gray-700">
                                                    y = {calculateRegressionEquation(tenantData)}
                                                </p>
                                                <p className="text-xs text-gray-500">Monthly rent = (slope × area) + base</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-medium">Average Price/sqm</p>
                                                <p className="text-2xl font-bold text-gray-700">
                                                    P{(tenantData.reduce((sum, d) => sum + (d.grossMonthlyRental / d.areaPerMarket), 0) / tenantData.length).toFixed(2)}
                                                </p>
                                                <p className="text-xs text-gray-500">Across all properties</p>
                                            </div>
                                        </div>
                                        <p className="mt-3 text-xs text-gray-600 text-center">
                                            Bubble size represents rental amount • Numbers show remaining lease months
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-8 text-gray-500">No data available</div>
                        )}
                    </div>
                )}

            </div>

            <style jsx>{`
                .valuation-analytics {
                    padding: 5px;
                    background: #f5f5f5;
                    border-radius: 8px;
                }
                .chart-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 20px;
                    margin-top: 20px;
                } 
                .chart-container {
                    background: white;
                    padding: 15px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                h3 {
                    margin-top: 0;
                    color: #333;
                    font-size: 16px;
                }
            `}</style>
        </div>
    );
};

export default ValuationAnalytics;