import { twMerge } from 'tailwind-merge';

interface Props {
  children: React.ReactNode | string | string[];
  className?: string;
}

export function InlineAlert(props: Props) {
  const { children, className } = props;
  return (
    <div className={twMerge('flex flex-row items-center justify-start space-x-4 rounded-md', 'bg-red-400/10 p-3 backdrop-blur-lg', className)}>
      {typeof children === 'string' && <span className="font-light text-red-500">{children}</span>}
      {children instanceof Array && (
        <div className="flex flex-col items-start gap-2">
          {children.map((child, index) => (
            <span key={index} className="font-light text-red-500">
              {child || "Please ensure you've provided valid input"}
            </span>
          ))}
        </div>
      )}
      {typeof children !== 'string' && !(children instanceof Array) && children}
    </div>
  );
}
