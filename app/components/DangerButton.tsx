import type { RemixLinkProps } from '@remix-run/react/dist/components';
import type { ComponentProps } from 'react';
import { Link } from '@remix-run/react';
import { twMerge } from 'tailwind-merge';

interface GetClassNameProps {
  className: string | undefined;
  disabled: boolean | undefined;
}
function getClassName(props: GetClassNameProps) {
  const { disabled, className: inputClassName } = props;

  const className = twMerge(
    'rounded-md transition-all duration-300 text-center text-white py-2 px-4 text-base shadow-lg',
    'bg-red-600 hover:bg-red-800 focus:bg-red-800 focus:outline-red-800',
    disabled && 'bg-red-600/20 cursor-not-allowed hover:bg-red-600/20',
    inputClassName,
  );
  return className;
}

interface Props extends ComponentProps<'button'> { }
export function DangerButton(props: Props) {
  const { type = 'button', disabled, className, ...restOfProps } = props;

  return <button type={type} className={getClassName({ className, disabled })} disabled={disabled} {...restOfProps} />;
}

interface ButtonLinkProps extends ComponentProps<typeof Link>, RemixLinkProps { }
export function PrimaryButtonLink(props: ButtonLinkProps) {
  const { className, children, ...restOfProps } = props;

  return <Link className={getClassName({ className, disabled: false })} children={children} {...restOfProps} />;
}

interface ExternalLinkProps extends ComponentProps<'a'> { }
export function PrimaryButtonExternalLink(props: ExternalLinkProps) {
  const { className, children, ...restOfProps } = props;

  return <a className={getClassName({ className, disabled: false })} children={children} {...restOfProps} />;
}
