import dayjs from 'dayjs';

import { DATE_INPUT_FORMAT } from '~/models/dates';

import { useIsSubmitting } from './ActionContextProvider';
import { FormTextField } from './FormTextField';

interface Props {
  name: string;
  inspectionDate: Date | string;
}
export function InspectionDate(props: Props) {
  const { name, inspectionDate } = props;

  const isSubmitting = useIsSubmitting();

  return (
    <div className="flex flex-row items-center gap-2">
      <span className="text-base font-light">Inspection Date: </span>
      <FormTextField name={name} isCamo type="date" disabled={isSubmitting} className="text-base bg-stone-50" defaultValue={dayjs(inspectionDate).format(DATE_INPUT_FORMAT)} />
    </div>
  );
}
