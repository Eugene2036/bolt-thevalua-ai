import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

import { UnderLine } from './UnderLine';

interface Props extends ComponentProps<'div'> {}
export function UnderLineHeading(props: Props) {
  const { children, className } = props;
  return (
    <div className={twMerge('flex flex-col items-center gap-4', className)}>
      <span className="text-4xl text-violet-800 font-semibold">{children}</span>
      <div className="w-1/3">
        <UnderLine />
      </div>
    </div>
  );
}
