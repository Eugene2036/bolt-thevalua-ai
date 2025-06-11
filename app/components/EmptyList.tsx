import type { ComponentProps } from 'react';
import { twMerge } from 'tailwind-merge';

interface Props extends ComponentProps<'div'> { }
export function EmptyList(props: Props) {
  const { children, className, ...restOfProps } = props;
  return (
    <div className={twMerge('flex flex-col items-center justify-center p-6', className)} {...restOfProps}>
      <span className="text-lg font-light text-stone-400">{children}</span>
    </div>
  );
}
