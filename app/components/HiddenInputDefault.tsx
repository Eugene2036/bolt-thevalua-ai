import type { ComponentProps } from 'react';
import { useField } from './ActionContextProvider';

interface Props extends ComponentProps<'input'> {
  name: string;
}
export function HiddenInputDefault(props: Props) {
  const { name, defaultValue, ...restOfProps } = props;

  const { value } = useField(name);

  return <input name={name} type="hidden" defaultValue={typeof value === 'string' ? value : defaultValue} {...restOfProps} />;
}
