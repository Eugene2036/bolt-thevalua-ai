import type { PerClientChip } from './PerClientChip';
import type { PerMarketChip } from './PerMarketChip';
import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

interface Props extends ComponentProps<'span'> {
  client: string | number;
  market: string | number;
  children?: undefined;
  clientChipProps?: Omit<ComponentProps<typeof PerClientChip>, 'value'>;
  marketChipProps?: Omit<ComponentProps<typeof PerMarketChip>, 'value'>;
}
export default function ClientVMarket(props: Props) {
  const { className, client, market, ...restOfProps } = props;
  return (
    <span className={twMerge('font-light', className)} {...restOfProps}>
      {client}
    </span>
  );
}
