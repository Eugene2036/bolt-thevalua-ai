import type { ComponentProps } from 'react';

import { ChevronRight } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';

import { PrimaryButton } from './PrimaryButton';

interface Props extends ComponentProps<typeof PrimaryButton> {
  isProcessing: boolean;
}
export default function NextButton(props: Props) {
  const { children, className, isProcessing, disabled, ...restOfProps } = props;
  return (
    <PrimaryButton className={twMerge('flex-row flex gap-4', className)} {...restOfProps} disabled={isProcessing || disabled}>
      {!isProcessing && (children || 'NEXT')}
      {!!isProcessing && 'SAVING...'}
      <ChevronRight className="text-white" />
    </PrimaryButton>
  );
}
