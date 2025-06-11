import type { RefObject, ComponentProps } from 'react';

import { useEffect } from 'react';
import { twMerge } from 'tailwind-merge';

type Props = ComponentProps<'textarea'> & {
  customRef?: RefObject<HTMLTextAreaElement>;
  name?: string | undefined;
  label?: string | undefined;
  errors?: string[];
  underLineOnHover?: boolean;
  runAfterRender?: () => void;
};
export function TextArea(props: Props) {
  const { customRef, name, label, className, errors, rows, disabled, underLineOnHover, runAfterRender, ...restOfProps } = props;

  useEffect(() => {
    if (runAfterRender) {
      runAfterRender();
    }
  }, [runAfterRender]);

  return (
    <div className="flex flex-col items-stretch justify-center gap-1">
      {label && <span className="text-sm font-light text-stone-600">{label}</span>}
      <textarea
        ref={customRef}
        name={name}
        aria-invalid={!!errors?.length}
        aria-describedby={`${name}-error`}
        disabled={disabled}
        className={twMerge(
          'transition-all duration-75',
          'rounded-md border border-stone-200 p-2 text-sm font-light outline-none bg-white',
          'border border-stone-400 hover:bg-stone-100 focus:bg-stone-100',
          underLineOnHover && 'border-b-0 focus:border-b-2 active:border-b-2',
          disabled && 'cursor-not-allowed bg-white/50 border-0 text-stone-400',
          errors?.length && 'border-2 border-red-600',
          className,
        )}
        rows={rows || 4}
        {...restOfProps}
      />
      {errors && Boolean(errors.length) && (
        <span className="text-sm font-semibold text-red-500" id={`${name}-error`}>
          {errors.join(', ')}
        </span>
      )}
    </div>
  );
}
