import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { createPropGetter, getPropsFromObj } from '~/models/core.validations';
import { GRAPH_BLUE, GRAPH_RED } from '~/models/graphs';

import { EmptyList } from './EmptyList';
import GraphTitle from './GraphTitle';
import { GraphToolTip } from './GraphToolTip';

interface Props {
  locations: { name: string; numPlots: number }[];
}
export default function NeighbourhoodChart(props: Props) {
  const { locations } = props;

  const data = locations.map((location) => ({
    Name: location.name,
    'Number of Plots': location.numPlots,
    pv: 0,
  }));

  const { getProp, props: dataProps } = createPropGetter(data[0]);

  if (!locations.length) {
    return (
      <div className="flex flex-col items-center gap-6">
        <GraphTitle>Valuations By Neighbourhood</GraphTitle>
        <div className="flex flex-col justify-center items-center grow">
          <EmptyList>No data to show</EmptyList>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-4">
      <GraphTitle>Valuations By Neighbourhood</GraphTitle>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart layout="vertical" width={600} height={500} data={data} barSize={40} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey={getProp('Name')} tick={{ fontSize: 10 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const fields = getPropsFromObj(payload[0].payload, dataProps, '-');
                return (
                  <GraphToolTip>
                    <span style={{ color: GRAPH_BLUE }}>{fields.Name}</span>
                    <span style={{ color: GRAPH_BLUE }}>Plots Valued: {fields['Number of Plots']}</span>
                  </GraphToolTip>
                );
              }
              return null;
            }}
          />
          <Bar dataKey={getProp('pv')} stackId="a" fill="#fff" />
          <Bar dataKey={getProp('Number of Plots')} stackId="a" fill={GRAPH_BLUE}>
            {data.map((item, index) => (
              <Cell key={`cell-${index}`} fill={item['Number of Plots'] > item.pv ? GRAPH_BLUE : GRAPH_RED} />
            ))}
            <LabelList dataKey={getProp('Number of Plots')} position="right" color="#000" fontSize={10} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
