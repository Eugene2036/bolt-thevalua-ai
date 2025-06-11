import type { ComponentProps } from 'react';
import { twMerge } from 'tailwind-merge';

interface Props extends ComponentProps<'div'> { }
export function GridHeading(props: Props) {
  const { children, className, ...restOfProps } = props;

  return (
    <div className={twMerge('text-start text-xs p-4 border border-stone-200 font-semibold', className)} {...restOfProps}>
      {children}
    </div>
  );
}
