import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

interface Props extends ComponentProps<'h1'> {
  large?: boolean;
}
export function AppTitle(props: Props) {
  const { large, className, ...restOfProps } = props;
  return (
    <h1 className={twMerge('text-xl font-semibold text-stone-800', large && 'text-2xl', className)} {...restOfProps}>
      Xtra
    </h1>
  );
}
