import { type ComponentProps } from 'react';

import { FormTextField } from './FormTextField';

interface Props extends ComponentProps<typeof FormTextField> {}
export function CustomStoredValue(props: Props) {
  const { id, ...restOfProps } = props;

  return (
    <div className="grow">
      <FormTextField {...restOfProps} />
    </div>
  );
}
