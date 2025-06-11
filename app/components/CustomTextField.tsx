import { useEffect, useState, type ComponentProps } from 'react';
import { useIsSubmitting } from './ActionContextProvider';
import { TextField } from './TextField';

interface Props extends ComponentProps<typeof TextField> {
  name: string;
}
export function CustomTextField(props: Props) {
  const { id, name, defaultValue, disabled, ...restOfProps } = props;

  const isSubmitting = useIsSubmitting();
  const [newValue, setNewValue] = useState(defaultValue);

  useEffect(() => {
    setNewValue(defaultValue);
  }, [defaultValue]);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setNewValue(newValue);
  };

  return (
    <TextField
      name={name}
      errors={[]}
      value={newValue}
      onChange={handleChange}
      disabled={isSubmitting || disabled}
      {...restOfProps}
    />
  );
}
