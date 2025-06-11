import { Plus } from 'tabler-icons-react';

import { SecondaryButton } from './SecondaryButton';

interface Props {
  isLast: boolean;
}
export function AddRowButtonIfLast(props: Props) {
  const { isLast } = props;
  if (isLast) {
    return (
      <div className="flex flex-col items-end py-2">
        <SecondaryButton type="submit" className="flex flex-row items-center gap-2">
          <Plus className="text-teal-600" />
          Add Row
        </SecondaryButton>
      </div>
    );
  }
  return <input type="submit" className="invisible absolute top-0" />;
}
