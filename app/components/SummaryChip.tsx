import type { ComponentProps } from 'react';

interface Props extends ComponentProps<'div'> {
  subtitle: string;
  detail: string | number;
}
export function SummaryChip(props: Props) {
  const { subtitle, detail } = props;
  return (
    <div className="grid grid-cols-6 rounded border border-stone-400">
      <div className="p-2 flex flex-col items-start justify-center col-span-2">
        <span className="text-sm font-light text-stone-600">{subtitle}</span>
      </div>
      <div className="p-2 flex flex-col items-start justify-center col-span-4 border-l border-l-stone-400">
        <span className="text-base font-normal text-black">{detail}</span>
      </div>
    </div>
  );
}
