import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

import { Chip } from './Chip';
import { ListItemDetail } from './ListItemDetail';

interface Props extends ComponentProps<typeof ListItemDetail> {
  children?: undefined;
}
export function TableMetaCard(props: Props) {
  const { className, ...restOfProps } = props;
  return (
    <Chip className="px-2 py-0 bg-stone-200">
      <ListItemDetail className={twMerge('font-bold text-xs flex-row items-center gap-2', className)} {...restOfProps} />
    </Chip>
  );
}
