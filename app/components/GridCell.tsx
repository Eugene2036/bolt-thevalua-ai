import type { ComponentProps } from 'react';
import { twMerge } from 'tailwind-merge';

interface Props extends ComponentProps<'div'> { }
export function GridCell(props: Props) {
  const { children, className, ...restOfProps } = props;

  return (
    <div className={twMerge('text-stone-600 text-sm border border-stone-200 p-2 text-start flex flex-col justify-center', className)} {...restOfProps}>
      {children}
    </div>
  );
}
