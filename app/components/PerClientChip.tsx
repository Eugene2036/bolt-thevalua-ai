import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

import { Chip } from './Chip';

interface Props extends Omit<ComponentProps<typeof Chip>, 'children'> {
  children?: undefined;
  value: string | number;
}
export function PerClientChip(props: Props) {
  const { value, className, ...restOfProps } = props;
  return (
    <Chip className={twMerge('flex flex-col items-end p-0 bg-transparent', className)} {...restOfProps}>
      <span className="font-light text-end text-black whitespace-nowrap">
        <span className="font-light">Per Client:</span> <span className="font-semibold">{value}</span>
      </span>
    </Chip>
  );
}
