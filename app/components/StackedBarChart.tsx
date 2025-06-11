import dayjs from 'dayjs';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { createPropGetter, getPropsFromObj } from '~/models/core.validations';
import { GRAPH_BLUE, GRAPH_GREEN, GRAPH_RED } from '~/models/graphs';

import { EmptyList } from './EmptyList';
import GraphTitle from './GraphTitle';
import { GraphToolTip } from './GraphToolTip';

interface Props {
  dates: {
    date: Date;
    numPlots: number;
  }[];
}
export default function StackedBarChart(props: Props) {
  const { dates } = props;

  const data = dates.map((m, index) => {
    const prevMonthPlots = index === 0 ? 0 : dates[index - 1].numPlots;
    const dateString = dayjs(m.date).format('DD');
    const delta = m.numPlots - prevMonthPlots;
    const color = delta > 0 ? GRAPH_GREEN : GRAPH_RED;
    const residual = delta > 0 ? m.numPlots - delta : m.numPlots;
    return {
      Name: dateString,
      color,
      'Change From Last Month': Math.abs(delta),
      Residual: residual,
      Total: m.numPlots,
    };
  });

  const { getProp, props: dataProps } = createPropGetter(data[0]);

  if (!dates.length) {
    return (
      <div className="flex flex-col items-center gap-6">
        <GraphTitle>Daily Valuation Tracker</GraphTitle>
        <div className="flex flex-col justify-center items-center grow">
          <EmptyList>No data to show</EmptyList>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-4">
      <GraphTitle>Daily Valuation Tracker</GraphTitle>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart width={500} height={300} data={data} barSize={40} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={getProp('Name')} tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const fields = getPropsFromObj(payload[0].payload, dataProps, '-');
                return (
                  <GraphToolTip>
                    <span>Total: {fields.Total}</span>
                    <span style={{ color: fields.color }}>Delta: {fields['Change From Last Month']}</span>
                  </GraphToolTip>
                );
              }

              return null;
            }}
          />
          <Bar dataKey={getProp('Residual')} stackId="a" fill={GRAPH_BLUE} />
          <Bar
            dataKey={getProp('Change From Last Month')}
            stackId="a"
            // fill={GRAPH_GREEN}
          >
            {data.map((item, index) => (
              <Cell key={`cell-${index}`} fill={item.color} fontSize={10} />
            ))}
            {/* {data.map((item, index) => (
              <Label key={`cell-${index}`} color="purple" fontSize={10}>
                {item.Total}
              </Label>
            ))} */}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
