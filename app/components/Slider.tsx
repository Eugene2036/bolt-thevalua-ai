import 'rc-slider/assets/index.css';
import Slider from 'rc-slider';
import { useState } from 'react';

interface Props {
  from: number;
  to: number;
  min: number;
  max: number;
  names: { from: string; to: string };
  large?: boolean;
}
export function CustomSlider(props: Props) {
  const { from, to, names, min, max, large } = props;

  const [values, setValues] = useState([from, to]);

  const intervalSize = (max - min) / 4;
  const intervalValues = [...[...Array(4).keys()].map((i) => min + i * intervalSize), max];
  const intervals = intervalValues.reduce(
    (acc, value) => {
      return { ...acc, [value]: value };
    },
    {} as Record<number, number>,
  );

  return (
    <div className="flex flex-col items-stretch px-2 pb-4">
      <input type="hidden" name={names.from} value={values[0]} />
      <input type="hidden" name={names.to} value={values[1]} />
      <Slider
        range
        dots
        marks={intervals}
        step={large ? 10_000 : 500}
        // step={10_000}
        value={values}
        min={min}
        max={max}
        onChange={(newValues) => {
          if (typeof newValues !== 'number') {
            setValues(newValues);
          }
        }}
      />
    </div>
  );
}
