import type { ComponentProps } from 'react';
import { twMerge } from 'tailwind-merge';
import { DeleteIconButton } from './DeleteIconButton';

interface Props extends ComponentProps<'div'> {
  handleDelete: ComponentProps<typeof DeleteIconButton>['handleDelete'];
}
export function DeleteButtonGridCell(props: Props) {
  const { handleDelete, className, ...restOfProps } = props;
  return (
    <div className={twMerge('flex flex-col justify-center items-center p-2 border border-stone-200', className)} {...restOfProps}>
      <DeleteIconButton handleDelete={handleDelete} />
    </div>
  );
}
