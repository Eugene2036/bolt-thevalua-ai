import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

import { Chip } from './Chip';

interface Props extends ComponentProps<typeof Chip> {
  children?: undefined;
  value: string | number;
}
export function PerMarketChip(props: Props) {
  const { value, className, ...restOfProps } = props;
  return (
    <Chip className={twMerge('flex flex-col items-end p-0 bg-transparent', className)} {...restOfProps}>
      <span className="text-end text-stone-400 whitespace-nowrap">
        <span className="font-light">Per Market:</span> <span className="font-semibold">{value}</span>
      </span>
    </Chip>
  );
}
