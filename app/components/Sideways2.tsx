import React from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { createPropGetter, getPropsFromObj } from '~/models/core.validations';
import { GRAPH_BLUE } from '~/models/graphs';

import { EmptyList } from './EmptyList';
import GraphTitle from './GraphTitle';
import { GraphToolTip } from './GraphToolTip';

interface Props {
  users: { name: string; numPlots: number }[];
}
const HorizontalBarChart: React.FC<Props> = ({ users }) => {
  if (!users.length) {
    return (
      <div className="flex flex-col items-center gap-6">
        <GraphTitle>Valuations By User</GraphTitle>
        <div className="flex flex-col justify-center items-center grow">
          <EmptyList>No data to show</EmptyList>
        </div>
      </div>
    );
  }

  const data = users.map((user) => ({
    Name: user.name,
    'Plots Valued': user.numPlots,
  }));

  const { getProp, props: dataProps } = createPropGetter(data[0]);

  return (
    <div className="flex flex-col items-stretch gap-4">
      <GraphTitle>Valuations By User</GraphTitle>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          layout="vertical"
          width={600}
          height={500}
          data={data.map((user) => {
            const parts = user.Name.split(' ');
            const refinedParts = parts.map((p, i) => {
              if (i === parts.length - 1) {
                return p;
              }
              return p.charAt(0).toUpperCase();
            });
            return { ...user, name: refinedParts.join('. ') };
          })}
          barSize={40}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey={getProp('Name')} tick={{ fontSize: 10 }} label={{ fontSize: 10 }} />
          <LabelList dataKey={getProp('Name')} position="right" color="#000" fontSize={10} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const fields = getPropsFromObj(payload[0].payload, dataProps, '-');
                return (
                  <GraphToolTip>
                    <span style={{ color: GRAPH_BLUE }}>{fields.Name}</span>
                    <span style={{ color: GRAPH_BLUE }}>Plots Valued: {fields['Plots Valued']}</span>
                  </GraphToolTip>
                );
              }
              return null;
            }}
          />
          <Bar dataKey={getProp('Plots Valued')} fill={GRAPH_BLUE}>
            <LabelList dataKey={getProp('Plots Valued')} position="right" color="#000" fontSize={10} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HorizontalBarChart;
