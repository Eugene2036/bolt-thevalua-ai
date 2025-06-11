import { useState } from 'react';

import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

enum ValuationType {
  Commercial = 'Commercial',
  Residential = 'Residential',
}

interface Props {
  handleNext: () => void;
}
export function SelectValuationType(props: Props) {
  const { handleNext } = props;
  const [valType, setValType] = useState<ValuationType | undefined>();

  const options = [ValuationType.Commercial, ValuationType.Residential];

  return (
    <div className="flex flex-col items-stretch gap-6">
      <div className="flex flex-row items-center gap-2">
        {options.map((option) => {
          if (valType === option) {
            return (
              <PrimaryButton key={option} type="button" onClick={() => setValType(option)}>
                {option}
              </PrimaryButton>
            );
          }
          return (
            <SecondaryButton key={option} type="button" onClick={() => setValType(option)}>
              {option}
            </SecondaryButton>
          );
        })}
      </div>
      <PrimaryButton onClick={handleNext}>NEXT</PrimaryButton>
    </div>
  );
}
