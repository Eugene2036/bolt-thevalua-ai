import { type ComponentProps } from 'react';
import { FormTextArea } from './FormTextArea';

interface Props extends ComponentProps<typeof FormTextArea> { }
export function EditStoredValueArea(props: Props) {
  const { id, ...restOfProps } = props;

  return (
    <div className="grow">
      <FormTextArea {...restOfProps} />
    </div>
  );
}
