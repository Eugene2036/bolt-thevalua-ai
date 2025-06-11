import type { ComponentProps } from 'react';
import { useDisabled, useIsSubmitting, useUpdateState } from './ActionContextProvider';
import { Select } from './Select';

type Props = ComponentProps<typeof Select> & {
  name: string;
};
export function FormSelect(props: Props) {
  const { name, defaultValue, disabled: initDisabled, ...restOfProps } = props;

  const disabled = useDisabled();
  const isSubmitting = useIsSubmitting();
  const updateState = useUpdateState();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = event.target.value;
    updateState(name, newValue);
  };

  return <Select name={name} errors={[]} value={defaultValue} onChange={handleChange} disabled={isSubmitting || initDisabled || disabled} {...restOfProps} />;
}
