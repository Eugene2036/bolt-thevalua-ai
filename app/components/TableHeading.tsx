import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

interface Props extends ComponentProps<'th'> {}
export function TableHeading(props: Props) {
  const { children, className, ...restOfProps } = props;

  return (
    <th className={twMerge('text-start text-xs p-2 border border-white', className)} {...restOfProps}>
      {children}
    </th>
  );
}
