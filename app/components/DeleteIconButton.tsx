import type { ComponentProps } from 'react';
import { X } from 'tabler-icons-react';
import { SecondaryButton } from './SecondaryButton';

interface Props extends ComponentProps<typeof SecondaryButton> {
  handleDelete: () => void;
}
export function DeleteIconButton(props: Props) {
  const { handleDelete } = props;

  return (
    <SecondaryButton isIcon type="button" onClick={handleDelete} className="bg-transparent">
      <X className="text-red-600" size={16} />
    </SecondaryButton>
  );
}
