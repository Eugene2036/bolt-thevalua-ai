import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';

const tw = createTw({
  theme: {},
});

interface TableProps {
  headers: string[];
  data: string[][];
}

export function PdfTable (props: TableProps) {
  const { headers, data } = props;
  
  const columnWidth = `${100 / headers.length}%`;

  return (
    <View style={tw('w-full my-2')}>
      {/* Header Row */}
      <View style={tw('flex flex-row border-b-2 border-gray-500')}>
        {headers.map((header, index) => (
          <View key={index} style={[tw('p-2'), { width: columnWidth }]}>
            <Text style={tw('font-bold text-[10pt]')}>{header}</Text>
          </View>
        ))}
      </View>
      {/* Data Rows */}
      {data.map((row, rowIndex) => (
        <View key={rowIndex} style={tw('flex flex-row border-b border-gray-300')}>
          {row.map((cell, cellIndex) => (
            <View key={cellIndex} style={[tw('p-2'), { width: columnWidth }]}>
              <Text style={tw("text-[10pt]")}>{cell}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};
