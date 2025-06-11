import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

interface Props extends ComponentProps<'div'> {
  subtitle: string;
  detail: string | number;
}
export function ListItemDetail(props: Props) {
  const { subtitle, detail, className, ...restOfProps } = props;

  return (
    <div {...restOfProps} className={twMerge(`flex flex-col items-stretch gap-2`, className)}>
      <span className="text-sm font-light text-slate-600">{subtitle}</span>
      <span className="text-base font-semibold">{detail}</span>
    </div>
  );
}
