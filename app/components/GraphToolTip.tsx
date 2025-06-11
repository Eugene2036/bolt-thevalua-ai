import type { ComponentProps } from 'react';
import { twMerge } from 'tailwind-merge';

interface Props extends ComponentProps<'div'> { }
export function GraphToolTip(props: Props) {
  const { className, children, ...rest } = props;
  return (
    <div className={twMerge('flex flex-col items-stretch bg-white/80 backdrop-blur-sm rounded-md px-6 py-4', 'font-semibold text-stone-800 text-sm', className)} {...rest}>
      {children}
    </div>
  );
}
