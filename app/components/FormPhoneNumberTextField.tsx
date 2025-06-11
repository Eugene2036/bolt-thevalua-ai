import React, { useState } from 'react';
import PhoneInput, { isValidPhoneNumber, CountryCode } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useDisabled, useIsSubmitting, useNoErrors, useUpdateState } from './ActionContextProvider';
import { twMerge } from "tailwind-merge";

interface Props {
  name: string;
  label: string;
  value: string;
  isCamo?: boolean;
  onChange: (value: string) => void;
  defaultCountry?: CountryCode;
  required?: boolean;
  className?: string;
  type?: string;
  step?: number;
  whitey?: boolean;
}

export function FormPhoneNumberTextField({
  name,
  label,
  value,
  isCamo,
  onChange,
  defaultCountry = 'BW',
  required,
  className: initClassName,
  type,
  step: initStep,
  whitey,
}: Props) {
  const [error, setError] = useState<string | null>(null);

  const disabled = useDisabled();
  const isSubmitting = useIsSubmitting();
  const updateState = useUpdateState();
  const noErrors = useNoErrors();

  const handleChange = (newValue: string | undefined) => {
    const phoneValue = newValue || '';
    onChange(phoneValue);
    updateState(name, phoneValue);
    if (required && (!phoneValue || !isValidPhoneNumber(phoneValue))) {
      setError('Enter a valid phone number');
    } else {
      setError(null);
    }
  };

  const step = type === "number" && !initStep ? 0.01 : initStep;
  const className = twMerge(type === "number" && "text-end", initClassName);

  return (
    <div className="flex flex-col items-stretch justify-center gap-0">
      <div className={"flex flex-col items-stretch gap-0"}>
        {label && (
          <div className="flex flex-col items-start justify-center">
            <span
              className={twMerge(
                "text-sm font-light text-stone-600",
                whitey && "text-white",
              )}
            >
              {label}
            </span>
          </div>
        )}
        <div className="flex grow flex-col items-stretch">
          <PhoneInput
            step={step}
            id={name}
            international
            defaultCountry={defaultCountry}
            value={value}
            onChange={handleChange}
            disabled={isSubmitting || disabled}
            className={twMerge(
              "global-input",
              'w-full transition-all duration-300',
              'rounded-lg px-1 py-2 text-sm font-light outline-none bg-white',
              'border border-stone-300 hover:bg-stone-100 focus:bg-stone-100',
              isCamo && "global-input",
              isCamo && disabled && "hover:bg-transparent bg-white",
              disabled &&
              "cursor-not-allowed border-stone-200 text-stone-600 bg-white/50",
              error && "border border-red-600",
              className,
            )}
          />
        </div>
      </div>
      {error && !noErrors && (
        <span
          className="text-sm font-semibold text-red-500"
          id={`${name}-error`}
        >
          {error}
        </span>
      )}
    </div>
  );
}

// import React, { useState } from 'react';
// import PhoneInput, { isValidPhoneNumber, CountryCode } from 'react-phone-number-input';
// import 'react-phone-number-input/style.css';
// import { useDisabled, useIsSubmitting, useNoErrors, useUpdateState } from './ActionContextProvider';
// import { twMerge } from "tailwind-merge";

// interface Props {
//   name: string;
//   label: string;
//   value: string;
//   isCamo?: boolean;
//   onChange: (value: string) => void;
//   defaultCountry?: CountryCode;
//   required?: boolean;
//   className?: string;
//   type?: string;
//   step?: number;
//   whitey?: boolean;
// }

// export function FormPhoneNumberTextField({ 
//   name, 
//   label, 
//   value, 
//   isCamo, 
//   onChange, 
//   defaultCountry = 'BW', 
//   required, 
//   className: initClassName, 
//   type, 
//   step: initStep,
//   whitey,
// }: Props) {
//   const [error, setError] = useState<string | null>(null);

//   const disabled = useDisabled();
//   const isSubmitting = useIsSubmitting();
//   const updateState = useUpdateState();
//   const noErrors = useNoErrors();

//   const handleChange = (newValue: string | undefined) => {
//     const phoneValue = newValue || '';
//     onChange(phoneValue);
//     updateState(name, phoneValue);
//     if (required && (!phoneValue || !isValidPhoneNumber(phoneValue))) {
//       setError('Enter a valid phone number');
//     } else {
//       setError(null);
//     }
//   };

//   const step = type === "number" && !initStep ? 0.01 : initStep;
//   const className = twMerge(type === "number" && "text-end", initClassName);

//   return (
//     <div className="flex flex-col items-stretch justify-center gap-0">
//       <div className={"flex flex-col items-stretch gap-0"}>
//         {label && (
//           <div className="flex flex-col items-start justify-center">
//             <span
//               className={twMerge(
//                 "text-sm font-light text-stone-600",
//                 whitey && "text-white",
//               )}
//             >
//               {label}
//             </span>
//           </div>
//         )}
//         <div className="flex grow flex-col items-stretch">
//           <PhoneInput
//             step={step}
//             id={name}
//             international
//             defaultCountry={defaultCountry}
//             value={value}
//             onChange={handleChange}
//             disabled={isSubmitting || disabled}
//             className={twMerge(
//               "global-input",
//               'w-full transition-all duration-300',
//               'rounded-lg px-1 py-2 text-sm font-light outline-none bg-white',
//               'border border-stone-300 hover:bg-stone-100 focus:bg-stone-100',
//               isCamo && "global-input",
//               isCamo && disabled && "hover:bg-transparent bg-white",
//               disabled &&
//               "cursor-not-allowed border-stone-200 text-stone-600 bg-white/50",
//               error && "border border-red-600",
//               className,
//             )}
//           />
//         </div>
//       </div>
//       {error && !noErrors && (
//         <span
//           className="text-sm font-semibold text-red-500"
//           id={`${name}-error`}
//         >
//           {error}
//         </span>
//       )}
//     </div>
//   );
// }