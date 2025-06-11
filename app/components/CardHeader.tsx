import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

interface Props extends ComponentProps<'div'> {
  topBorder?: boolean;
}
export function CardHeader(props: Props) {
  const { className, children, topBorder, ...restOfProps } = props;
  return (
    <div
      className={twMerge('flex flex-col items-stretch p-4 border-dashed', topBorder && 'border-t border-t-stone-200', !topBorder && 'border-b border-b-stone-200', className)}
      {...restOfProps}
    >
      {children}
    </div>
  );
}
