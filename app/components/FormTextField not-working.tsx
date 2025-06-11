import { ComponentProps, useState } from "react";
import {
  useDisabled,
  useIsSubmitting,
  useNoErrors,
  useUpdateState,
} from "./ActionContextProvider";
import { TextField } from "./TextField";

import EyeOffIcon from "public/images/main/eye-off.svg";
import EyeIcon from "public/images/main/eye.svg";

interface Props extends ComponentProps<typeof TextField> {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  disabled?: boolean;
  defaultValue?: string;
}

export function FormTextField(props: Props) {
  const {
    name,
    label,
    required,
    type,
    defaultValue,
    disabled: initDisabled,
    ...restOfProps
  } = props;

  const [showPassword, setShowPassword] = useState(false);
  const disabled = useDisabled();
  const isSubmitting = useIsSubmitting();
  const updateState = useUpdateState();
  const noErrors = useNoErrors();

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    updateState(name, newValue);
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const inputType = name === "password" && showPassword ? "text" : props.type;
  console.log("Dynamic Input Type: ", inputType);
  return (
    <div className="relative">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {/* {required && <span className="text-red-500">*</span>} */}
        {required}
      </label>
      <TextField
        id={name}
        name={name}
        type={inputType}
        errors={[]}
        noErrors={noErrors}
        value={defaultValue}
        onChange={handleChange}
        disabled={isSubmitting || initDisabled || disabled}
        {...restOfProps}
      />
      {name === "password" && (
        <button
          type="button"
          className="absolute inset-y-0 right-4 flex items-center top-4"
          onClick={togglePasswordVisibility}
          disabled={isSubmitting || initDisabled || disabled}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <img
              src={EyeOffIcon}
              alt="Hide password"
              className="h-5 mt-8 w-5"
            />
          ) : (
            <img src={EyeIcon} alt="Show password" className="h-5 mt-8 w-5" />
          )}
        </button>
      )}
    </div>
  );
}
