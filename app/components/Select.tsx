import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

type Props<SchemaType extends Record<string, any>> = ComponentProps<'select'> & {
  customRef?: ComponentProps<'select'>['ref'];
  name: keyof SchemaType;
  label?: string | undefined;
  errors?: string[];
  required?: boolean;
  isCamo?: boolean;
};
export function Select<SchemaType extends Record<string, any>>(props: Props<SchemaType>) {
  const { customRef, name, label, className, errors, required, disabled, isCamo, ...restOfProps } = props;

  return (
    <div className="flex flex-col items-stretch justify-center gap-0">
      <div className="flex flex-col items-stretch justify-center gap-0">
        {label && (
          <div className="flex flex-col items-start justify-center">
            <span className="text-sm font-light text-stone-600">{label}</span>
          </div>
        )}
        <div className="flex grow flex-col items-stretch">
          <select
            required={required}
            ref={customRef}
            name={name}
            aria-invalid={!!errors?.length}
            aria-describedby={`${name}-error`}
            disabled={disabled}
            className={twMerge(
              'w-full transition-all duration-300',
              'rounded-lg px-1 py-2 text-sm font-light outline-none bg-white',
              'border border-stone-400 hover:bg-stone-100 focus:bg-stone-100',
              isCamo && 'border border-dashed border-stone-200 bg-stone-50',
              isCamo && disabled && 'hover:bg-transparent bg-transparent border-0',
              disabled && 'cursor-not-allowed text-stone-400 bg-white/50 border-0',
              errors?.length && 'border-2 border-red-600',
              className,
            )}
            {...restOfProps}
          />
        </div>
      </div>
      {errors && Boolean(errors.length) && (
        <div className="text-sm font-semibold text-red-500" id={`${name}-error`}>
          {errors.join(', ')}
        </div>
      )}
    </div>
  );
}
