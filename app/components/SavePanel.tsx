import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

interface Props extends ComponentProps<'div'> {}
export default function SavePanel(props: Props) {
  const { children, className, ...restOfProps } = props;
  return (
    <div
      className={twMerge(
        'flex flex-col items-stretch absolute bottom-0 ',
        'bg-white/80 backdrop-blur-sm py-2 border-t border-stone-200',
        'w-full md:w-[80%] lg:w-[90%]',
        className,
      )}
      {...restOfProps}
    >
      {children}
    </div>
  );
}
