import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

interface Props extends ComponentProps<'div'> {}
export function Chip(props: Props) {
  const { className, ...restOfProps } = props;
  return <div className={twMerge('flex flex-row items-start justify-start rounded-md bg-stone-100 p-2', 'transition-all duration-300', className)} {...restOfProps}></div>;
}
