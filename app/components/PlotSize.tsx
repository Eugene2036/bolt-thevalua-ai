import { useIsSubmitting } from './ActionContextProvider';
import { FormTextField } from './FormTextField';

interface Props {
  name: string;
  plotSize: number | string;
}
export function PlotSize(props: Props) {
  const { name, plotSize } = props;

  const isSubmitting = useIsSubmitting();

  return (
    <div className="flex flex-row items-center gap-2">
      <span className="text-base font-light">Plot Size: </span>
      <FormTextField name={name} isCamo type="number" step={0.01} className="text-base bg-stone-50 grow" disabled={isSubmitting} defaultValue={plotSize} />
    </div>
  );
}
