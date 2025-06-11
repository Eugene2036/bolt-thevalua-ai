import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { createPropGetter, getPropsFromObj } from '~/models/core.validations';
import { GRAPH_BLUE, GRAPH_GREEN, GRAPH_RED } from '~/models/graphs';

import { EmptyList } from './EmptyList';
import GraphTitle from './GraphTitle';
import { GraphToolTip } from './GraphToolTip';

interface Props {
  actual: number;
  target: number;
}
export default function ActualVsTarget(props: Props) {
  const data = [
    { name: 'Target', Valuations: props.target },
    { name: 'Actual', Valuations: props.actual },
  ];

  const { getProp, props: dataProps } = createPropGetter(data[0]);

  if (!props.actual && !props.target) {
    return (
      <div className="flex flex-col items-center gap-6">
        <GraphTitle>Actual Vs Target</GraphTitle>
        <div className="flex flex-col justify-center items-center grow">
          <EmptyList>No data to show</EmptyList>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-4">
      <GraphTitle>Actual Vs Target</GraphTitle>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart width={500} height={300} data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={getProp('name')} label={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const fields = getPropsFromObj(payload[0].payload, dataProps, '-');
                const color = (() => {
                  if (fields.name !== 'Actual') {
                    return GRAPH_BLUE;
                  }
                  return props.actual >= props.target ? GRAPH_GREEN : GRAPH_RED;
                })();
                return (
                  <GraphToolTip>
                    <span style={{ color: GRAPH_BLUE }}>{fields.name}</span>
                    <span style={{ color }}>{fields['Valuations']} Valuations</span>
                  </GraphToolTip>
                );
              }
              return null;
            }}
          />
          {/* <Legend /> */}
          <Bar dataKey={getProp('Valuations')}>
            <LabelList dataKey={getProp('Valuations')} position="top" color="#fff" fontSize={10} />
            {data.map((item, index) => {
              const color = (() => {
                if (item.name !== 'Actual') {
                  return GRAPH_BLUE;
                }
                return props.actual >= props.target ? GRAPH_GREEN : GRAPH_RED;
              })();
              return <Cell key={`cell-${index}`} fill={color} fontSize={10} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
