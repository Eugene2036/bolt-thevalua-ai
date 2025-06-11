import type { FormEvent } from 'react';
import type { z } from 'zod';
import { faker } from '@faker-js/faker';
import { useFetcher } from '@remix-run/react';
import dayjs from 'dayjs';
import { hasFormError } from '~/models/forms';
import { UpdatePropertyDetailsSchema } from '~/models/plots.validations';
import { ActionContextProvider, useForm } from './ActionContextProvider';
import { FormTextField } from './FormTextField';
import { InlineAlert } from './InlineAlert';
import { PrimaryButton } from './PrimaryButton';
import { TextField } from './TextField';

interface Props {
  plotId: string;
  nextPropertyId: number;
  handleNext: () => void;
}
export function EnterPropertyDetails(props: Props) {
  const { plotId, nextPropertyId, handleNext } = props;

  const fetcher = useFetcher();

  const { getNameProp, isProcessing } = useForm(fetcher, UpdatePropertyDetailsSchema);

  const defaultValues: Record<keyof z.infer<typeof UpdatePropertyDetailsSchema>, string | undefined> = {
    id: plotId,
    propertyId: nextPropertyId.toString(),
    title: faker.location.buildingNumber(),
    valuer: faker.person.fullName(),
    inspectionDate: dayjs(faker.date.recent()).format('YYYY-MM-DD'),
    plotDesc: faker.lorem.sentence(6),
    plotExtent: faker.number.float({ precision: 0.001 }).toString(),
    address: faker.location.streetAddress(),
    zoning: 'COMMERCIAL',
    classification: 'COMMERCIAL',
    usage: 'RETAIL',
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetcher.submit(event.currentTarget);
    handleNext();
  };

  return (
    <fetcher.Form onSubmit={handleSubmit} className="flex flex-col items-stretch gap-0">
      <ActionContextProvider {...fetcher.data} fields={fetcher.data.fields || defaultValues} isSubmitting={isProcessing}>
        <div className="flex flex-row items-center gap-6 bg-white py-4">
          <h2 className="text-xl font-semibold">Enter Asset Details</h2>
        </div>
        <div className="flex flex-col items-stretch gap-6 overflow-auto">
          <div className="grid grid-cols-2 gap-6">
            <TextField value={nextPropertyId} label="Asset ID" className="font-normal" disabled required />
            <FormTextField {...getNameProp('title')} label="Plot Number" required />
            <FormTextField {...getNameProp('valuer')} label="Valuer" required />
            <FormTextField {...getNameProp('inspectionDate')} type="date" label="Valuation Date" required />
            <FormTextField {...getNameProp('plotDesc')} label="Plot Description" required />
            <FormTextField {...getNameProp('plotExtent')} type="number" label="Plot Extent" required />
            <FormTextField {...getNameProp('address')} label="Address" required />
            <FormTextField {...getNameProp('zoning')} label="Zoning" required />
            <FormTextField {...getNameProp('classification')} label="Classification" required />
            <FormTextField {...getNameProp('usage')} label="Usage" required />
          </div>
          {hasFormError(fetcher.data) && <InlineAlert>{fetcher.data.formError}</InlineAlert>}
          <div className="flex flex-col justify-center items-center py-6">
            <div className="flex flex-col items-stretch w-full md:w-1/2">
              <PrimaryButton type="submit">{isProcessing ? 'Saving...' : 'Save'}</PrimaryButton>
            </div>
          </div>
        </div>
      </ActionContextProvider>
    </fetcher.Form>
  );
}
