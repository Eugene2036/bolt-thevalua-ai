import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

interface Props extends ComponentProps<'div'> {}
export default function GraphTitle(props: Props) {
  const { className, children, ...rest } = props;
  return (
    <div className={twMerge('flex flex-col justify-center items-center', className)} {...rest}>
      <span className="font-semibold text-stone-600">{children}</span>
    </div>
  );
}
