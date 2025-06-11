import { Plus } from 'tabler-icons-react';

import { SecondaryButton } from './SecondaryButton';

export function AddRowButton() {
  return (
    <SecondaryButton type="submit" className="flex flex-row items-center gap-2">
      <Plus className="text-teal-600" />
      Add Row
    </SecondaryButton>
  );
}
