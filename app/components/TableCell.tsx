import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

interface Props extends ComponentProps<'td'> {}
export function TableCell(props: Props) {
  const { children, className, ...restOfProps } = props;

  return (
    <td className={twMerge('text-stone-600 text-sm border border-stone-200 p-2 text-start', className)} {...restOfProps}>
      {children}
    </td>
  );
}
