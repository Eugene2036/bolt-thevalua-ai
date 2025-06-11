import { useState } from 'react';
import { Check, ChevronRight } from 'tabler-icons-react';

import BackButton from '~/components/BackButton';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { Card } from '~/components/Card';
import { CardHeader } from '~/components/CardHeader';
import { PrimaryButton, PrimaryButtonLink } from '~/components/PrimaryButton';
import { SecondaryButton } from '~/components/SecondaryButton';
import { AppLinks } from '~/models/links';
import { ValuationType } from '~/models/plots.validations';

export default function CofcValuationtype() {
  const [valType, setValType] = useState(ValuationType.Residential);

  const options = [ValuationType.Residential, ValuationType.Commercial];

  return (
    <Card>
      <CardHeader className="flex flex-col items-center gap-10">
        <h2 className="text-xl font-semibold">Select Type of Valuation</h2>
      </CardHeader>
      <div className="flex flex-col items-stretch p-10 gap-10">
        <div className="flex flex-col justify-center items-center">
          <span className="text-lg font-light text-center text-stone-400">Select either of the options below and then click 'NEXT'</span>
        </div>
        <div className="flex flex-row justify-center items-center gap-8">
          {options.map((option) => {
            if (valType === option) {
              return (
                <PrimaryButton key={option} type="button" className="flex flex-row gap-4" onClick={() => setValType(option)}>
                  <Check className="text-white" />
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
      </div>
      <CardHeader className="flex flex-row items-center gap-10" topBorder>
        <BackButton disabled />
        <div className="grow" />
        <PrimaryButtonLink to={AppLinks.SearchCouncilPlot(valType)} type="button" className="flex-row flex gap-4">
          NEXT
          <ChevronRight className="text-white" />
        </PrimaryButtonLink>
      </CardHeader>
    </Card>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
