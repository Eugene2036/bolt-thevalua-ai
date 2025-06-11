import { useState } from 'react';

import { RouteErrorBoundary } from '~/components/Boundaries';
import { TextField } from '~/components/TextField';

interface RowInfo {
  id: number;
  one: string;
  two: string;
}

export default function PlotTestingPage() {
  const [rows, setRows] = useState<RowInfo[]>([
    { id: 1, one: 'bach', two: 'xcd' },
    { id: 2, one: 'mozart', two: 'xcd' },
  ]);

  function updateOne(id: number, newValue: string) {
    setRows((prevState) =>
      prevState.map((row) => {
        if (row.id === id) {
          return { ...row, one: newValue };
        }
        return row;
      }),
    );
  }

  function updateTwo(id: number, newValue: string) {
    setRows((prevState) =>
      prevState.map((row) => {
        if (row.id === id) {
          return { ...row, two: newValue };
        }
        return row;
      }),
    );
  }

  return (
    <div className="flex flex-col items-stretch">
      <span className="text-red-400">
        {rows.length} - {JSON.stringify(rows)}
      </span>
      {rows.map((row) => (
        <CustomRow key={row.id} {...row} updateOne={updateOne} updateTwo={updateTwo} />
      ))}
    </div>
  );
}

interface RowProps {
  id: number;
  one: string;
  two: string;
  updateOne: (id: number, newValue: string) => void;
  updateTwo: (id: number, newValue: string) => void;
}
function CustomRow(props: RowProps) {
  const { id, one, two, updateOne, updateTwo } = props;

  return (
    <div className="flex flex-row items-stretch gap-2">
      <TextField
        value={one}
        onChange={(event) => {
          updateOne(id, event.target.value);
        }}
      />
      <TextField
        value={two}
        onChange={(event) => {
          updateTwo(id, event.target.value);
        }}
      />
    </div>
  );
}

// interface Props {
//   value: string;
//   updateState: (newValue: string) => void;
// }
// function Field(props: Props) {
//   const { value, updateState } = props;

//   function handleChange(event: ChangeEvent<HTMLInputElement>) {
//     updateState(event.target.value);
//   }

//   return <input type="text" value={value} onChange={handleChange} />;
// }

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
