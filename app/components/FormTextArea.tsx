import type { ComponentProps } from 'react';
import { useDisabled, useIsSubmitting, useUpdateState } from './ActionContextProvider';
import { TextArea } from './TextArea';

interface Props extends ComponentProps<typeof TextArea> {
  name: string;
}
export function FormTextArea(props: Props) {
  const { name, disabled: initDisabled, defaultValue, ...restOfProps } = props;

  const disabled = useDisabled();
  const isSubmitting = useIsSubmitting();
  const updateState = useUpdateState();

  const handleChange = async (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    updateState(name, newValue);
  };

  return <TextArea name={name} errors={[]} value={defaultValue} onChange={handleChange} disabled={isSubmitting || initDisabled || disabled} {...restOfProps} />;
}
