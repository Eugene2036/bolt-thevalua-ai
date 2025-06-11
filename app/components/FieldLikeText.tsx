import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

interface Props extends ComponentProps<'span'> {}
export function FieldLikeText(props: Props) {
  const { children, className } = props;
  return <span className={twMerge('text-end pr-2', className)}>{children}</span>;
}
