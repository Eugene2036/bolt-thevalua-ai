import type { ComponentProps } from 'react';

import { ChevronLeft } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';

import { UseBack } from '~/hooks/useBack';

import { SecondaryButton } from './SecondaryButton';

interface Props extends ComponentProps<typeof SecondaryButton> {}
export default function BackButton(props: Props) {
  const { children, className, disabled, ...restOfProps } = props;

  const goBack = UseBack();

  return (
    <SecondaryButton className={twMerge('flex-row flex gap-4', className)} onClick={goBack} disabled={disabled} {...restOfProps}>
      <ChevronLeft className={twMerge('text-teal-600', disabled && 'text-stone-400')} />
      <span className={twMerge(disabled && 'text-stone-400')}>BACK</span>
    </SecondaryButton>
  );
}
