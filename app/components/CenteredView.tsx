import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

interface Props extends ComponentProps<'div'> {
  children: React.ReactNode;
  innerProps?: ComponentProps<'div'>;
  className?: string;
}

export function CenteredView(props: Props) {
  const { children, innerProps, className, ...restOfProps } = props;
  const { className: innerClassName, ...restOfInnerProps } = innerProps || {};

  return (
    <div className={twMerge('flex flex-col items-center justify-center', className)} {...restOfProps}>
      <div className={twMerge('flex flex-col items-stretch', 'w-full md:w-[80%] lg:w-[90%] print:w-full', innerClassName)} {...restOfInnerProps}>
        {children}
      </div>
    </div>
  );
}