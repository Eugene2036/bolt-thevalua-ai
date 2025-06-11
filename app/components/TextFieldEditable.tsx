import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

type Props = ComponentProps<'input'> & {
  customRef?: ComponentProps<'input'>['ref'];
  name?: string | undefined;
  label?: string | undefined;
  errors?: string[];
  required?: boolean;
  isCamo?: boolean;
  whitey?: boolean;
  noErrors?: boolean;
};

export function TextFieldEditable(props: Props) {
  const { customRef, name, label, className: initClassName, errors, required, isCamo, type, whitey, step: initStep, noErrors: initNoErrors, ...restOfProps } = props;

  const noErrors = initNoErrors || false;

  const step = type === 'number' && !initStep ? 0.01 : initStep;
  const className = twMerge(type === 'number' && 'text-end', initClassName);

  return (
    <div className="flex flex-col items-stretch justify-center gap-0">
      <div className={'flex flex-col items-stretch gap-0'}>
        {label && (
          <div className="flex flex-col items-start justify-center">
            <span className={twMerge('text-sm font-light text-stone-600', whitey && 'text-white')}>{label}</span>
          </div>
        )}
        <div className="flex grow flex-col items-stretch">
          <input
            key={name}
            required={required}
            aria-required={required}
            ref={customRef}
            type={type || 'text'}
            name={name}
            aria-invalid={!!errors?.length}
            aria-describedby={`${name}-error`}
            step={step}
            className={twMerge(
              'w-full transition-all duration-300 bg-white',
              'rounded-lg p-2 text-sm font-light outline-none',
              'border border-stone-400 hover:bg-stone-100 focus:bg-stone-100',
              isCamo && 'border border-dashed border-stone-200 bg-stone-50',
              errors?.length && 'border border-red-600',
              className,
            )}
            {...restOfProps}
          />
        </div>
      </div>
      {!!errors && !noErrors && !!errors.length && (
        <span className="text-sm font-semibold text-red-500" id={`${name}-error`}>
          {errors.join(', ')}
        </span>
      )}
    </div>
  );
}
