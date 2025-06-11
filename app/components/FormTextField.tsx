import { type ComponentProps } from 'react';
import { useDisabled, useIsSubmitting, useNoErrors, useUpdateState } from './ActionContextProvider';
import { TextField } from './TextField';

interface Props extends ComponentProps<typeof TextField> {
  name: string;
}
export function FormTextField(props: Props) {
  const { id, name, defaultValue, disabled: initDisabled, ...restOfProps } = props;

  const disabled = useDisabled();
  const isSubmitting = useIsSubmitting();
  const updateState = useUpdateState();
  const noErrors = useNoErrors();

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    updateState(name, newValue);
  };

  return (
    <TextField name={name} errors={[]} noErrors={noErrors} value={defaultValue} onChange={handleChange} disabled={isSubmitting || initDisabled || disabled} {...restOfProps} />
  );
}
