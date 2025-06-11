import { Text, TextProps } from '@react-pdf/renderer';
import { ReactNode } from 'react';

type SafeTextProps = TextProps & {
  children: string | ReactNode;
  maxWidth?: number;
  fontSize?: number;
  lineHeight?: number;
};

export function SafeText(props: SafeTextProps) {
  const { children, fontSize = 10, lineHeight = '14pt', style, ...rest } = props;

  return (
    <Text style={{ fontSize, lineHeight, ...style }} {...rest} >
      {children}
    </Text>
  );
}
