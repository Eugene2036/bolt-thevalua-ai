import dayjs from 'dayjs';

import { DATE_INPUT_FORMAT } from '~/models/dates';

import { useIsSubmitting } from './ActionContextProvider';
import { FormTextField } from './FormTextField';

interface Props {
  name: string;
  analysisDate: Date | string;
}
export function AnalysisDate(props: Props) {
  const { name, analysisDate } = props;

  const isSubmitting = useIsSubmitting();

  return (
    <div className="flex flex-row items-center gap-2">
      <span className="text-sm font-light">Valuation Date: </span>
      <FormTextField name={name} isCamo type="date" disabled={isSubmitting} className="text-sm bg-stone-50" defaultValue={dayjs(analysisDate).format(DATE_INPUT_FORMAT)} />
    </div>
  );
}
