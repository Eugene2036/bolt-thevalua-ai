import type { ChangeEvent, FormEvent } from 'react';
import type { CalculatorRowItemSchema, MutateConstructionSchema } from '~/models/construction.schema';
import type { WithIndexAndError } from '~/models/core.validations';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import { useCalculatorData } from '~/hooks/useCalculatorData';
import { useCalculatorSheets } from '~/hooks/useCalculatorSheets';
import { useMutateCalculator } from '~/hooks/useMutateCalculator';
import { filterItemsByCalcKind, getCalculatorRate, getObso, getPropertyOptions } from '~/models/construction.fns';
import { CalculatorKind, KnownElement, QualityOfFinish, YearRange } from '~/models/construction.types';
import { createGetNameProp, createStateUpdater, formatAmount, getNumOrUndefined, getStateId } from '~/models/core.validations';
import { AppLinks } from '~/models/links';

import { ActionContextProvider } from './ActionContextProvider';
import { FormSelect } from './FormSelect';
import { FormTextField } from './FormTextField';
import { InlineAlert } from './InlineAlert';
import { PrimaryButton } from './PrimaryButton';
import SavePanel from './SavePanel';
import { SecondaryButtonLink } from './SecondaryButton';
import { Select } from './Select';
import { TableCell } from './TableCell';
import { TableHeading } from './TableHeading';

type RowItem = z.infer<typeof CalculatorRowItemSchema> & {
  multiplierIdentifier?: string | undefined | null;
};

interface Props {
  grcId: string;
  insurance: boolean;
  isBull: boolean;
  isAdmin: boolean;
}
export function Calculator({ grcId, insurance, isBull, isAdmin }: Props) {
  const query = useCalculatorData(grcId, insurance, undefined, isBull);
  const { mutate, isMutating: isProcessing } = useMutateCalculator(grcId, insurance);

  const property = query.data?.grc.constructionProp;

  const getNameProp = createGetNameProp<z.infer<typeof MutateConstructionSchema>>();

  const [floorArea, setFloorArea] = useState<number | ''>(property?.floorArea || '');
  const [verandaFloorArea, setVerandaFloorArea] = useState<number | ''>(property?.verandaFloorArea || 0);
  const [devYear, setDevYear] = useState<YearRange>(property?.devYear || YearRange.First);

  useEffect(() => {
    const property = query.data?.grc.constructionProp;

    setFloorArea(property?.floorArea || '');
    setVerandaFloorArea(property?.verandaFloorArea || 0);
    setDevYear(property?.devYear || YearRange.First);
  }, [query.data?.grc.constructionProp]);

  const getItemsFromProperty = useCallback(
    (prop: typeof property) => {
      return (
        prop?.items
          .filter((item) => filterItemsByCalcKind(item, query.data?.kind))
          .map((item, index) => ({
            index,
            id: item.id,
            element: item.element,
            multiplierIdentifier: item.multiplierIdentifier || '',
            multiplier: getNumOrUndefined(item.multiplier) ?? ('' as const),
            propertyOption: item.propertyOption,
            qualityOfFinish: item.qualityOfFinish,
          })) || []
      );
    },
    [query.data?.kind],
  );

  const [props, setProps] = useState<WithIndexAndError<RowItem>[]>(getItemsFromProperty(property));

  useEffect(() => {
    const property = query.data?.grc.constructionProp;
    setProps(getItemsFromProperty(property));
  }, [query.data?.grc.constructionProp, query.data?.kind, getItemsFromProperty]);

  const updateState = createStateUpdater(
    [
      [getNameProp('floorArea').name, z.literal('').or(z.coerce.number()), setFloorArea],
      [getNameProp('verandaFloorArea').name, z.literal('').or(z.coerce.number()), setVerandaFloorArea],
      [getNameProp('devYear').name, z.nativeEnum(YearRange), setDevYear],
    ] as const,
    [
      ['prop', 'element', z.nativeEnum(KnownElement), setProps],
      ['prop', 'propertyOption', z.string(), setProps],
      ['prop', 'typicalEstimate', z.literal('').or(z.coerce.number()), setProps],
      ['prop', 'multiplier', z.literal('').or(z.coerce.number()), setProps],
      ['prop', 'qualityOfFinish', z.nativeEnum(QualityOfFinish), setProps],
      ['prop', 'qualityEstimate', z.coerce.number(), setProps],
    ] as const,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await mutate({
      floorArea,
      verandaFloorArea,
      devYear,
      items: props,
    });
    if (typeof response.error === 'string') {
      return toast.error(response.error);
    }
    if (response.data) {
      toast.success('Changes saved');
    }
  }

  const sheets = useCalculatorSheets(isBull, insurance);
  const defaultSheet = sheets[0];

  async function handleKindChange(event: ChangeEvent<HTMLSelectElement>) {
    const newKind = event.target.value;
    await query.refetch(grcId, insurance, newKind);
  }

  const { totalTypicalEstimate, totalQualityEstimate, costPerSqMTypical, costPerSqMQuality, refinedProps } = getCalculatorRate(
    (query.data?.kind || defaultSheet) as CalculatorKind,
    props.map((p) => ({
      ...p,
      multiplier: p.multiplier === '' ? undefined : getNumOrUndefined(p.multiplier),
    })),
    devYear,
    floorArea === '' ? undefined : getNumOrUndefined(floorArea),
    verandaFloorArea === '' ? undefined : getNumOrUndefined(verandaFloorArea),
    query.data?.yearRangeValues || [],
  );

  if (typeof query.error === 'string') {
    return (
      <div className="flex flex-col items-stretch p-6">
        <InlineAlert>{query.error}</InlineAlert>
      </div>
    );
  }
  if (typeof query.data === 'undefined') {
    return (
      <div className="flex flex-col items-stretch p-6">
        <span className="text-lg font-light text-stone-600">Loading...</span>
      </div>
    );
  }

  const floorAreaText = query.data?.kind === CalculatorKind.Boundary_Wall ? 'Length' : 'Floor Area';

  const isMini = [CalculatorKind.Boundary_Wall, CalculatorKind.External_Works_Residential].some((k) => k === query.data?.kind);

  return (
    <div className={twMerge('flex flex-col items-stretch px-2 relative', query.isLoading && 'animate-pulse')}>
      <div className="flex flex-row items-center gap-2 border-b border-b-stone-200 shadow-md pb-2">
        <span className="font-bold text-stone-800 text-sm px-2">Calculator:</span>
        <Select name="sheet" onChange={handleKindChange} value={query.data?.kind || defaultSheet} isCamo required>
          {sheets.map((sheet) => (
            <option key={sheet} value={sheet}>
              {sheet}
            </option>
          ))}
        </Select>
        <div className="grow" />
        {!!isAdmin && <SecondaryButtonLink to={`${AppLinks.YearRangeValues}?kind=${query.data?.kind || ''}`}>Edit Calculator</SecondaryButtonLink>}
      </div>
      <form onSubmit={handleSubmit} className="grow flex flex-col items-stretch overflow-auto gap-2">
        <ActionContextProvider updateState={updateState} isSubmitting={isProcessing}>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-row items-center grow gap-2">
              <span className="text-sm font-light">{floorAreaText}</span>
              <div className="grow">
                <FormTextField {...getNameProp('floorArea')} defaultValue={floorArea} type="number" step={0.01} isCamo />
              </div>
            </div>
            <div className="flex flex-row items-center grow gap-2">
              <span className="text-sm font-light">Year of Development: </span>
              <div className="grow">
                <FormSelect {...getNameProp('devYear')} defaultValue={devYear} isCamo>
                  <option value={YearRange.First}>{YearRange.First}</option>
                  <option value={YearRange.Second}>{YearRange.Second}</option>
                  <option value={YearRange.Third}>{YearRange.Third}</option>
                </FormSelect>
              </div>
            </div>
          </div>
          <table className="mb-24">
            <thead>
              <tr>
                <TableHeading />
                <TableHeading></TableHeading>
                <TableHeading colSpan={2} className="text-center">
                  Typical Property Estimate
                </TableHeading>
                <TableHeading colSpan={2} className="text-center">
                  Quality Code
                </TableHeading>
              </tr>
              <tr>
                <TableHeading className="text-center">Ref</TableHeading>
                <TableHeading className="col-span-2">Element</TableHeading>
                <TableHeading>Property Options</TableHeading>
                <TableHeading className="text-end">Typical Estimate</TableHeading>
                <TableHeading>Quality Code</TableHeading>
                <TableHeading className="text-end">Quality Estimate</TableHeading>
              </tr>
            </thead>
            <tbody>
              {refinedProps
                .sort((a, b) => {
                  if (a.element === KnownElement.Veranda) {
                    return 1;
                  }
                  if (b.element === KnownElement.Veranda) {
                    return -1;
                  }
                  return 0;
                })
                .map((item, index) => (
                  <ListItem
                    key={item.id}
                    id={item.id}
                    index={index}
                    element={item.element}
                    propertyOption={item.propertyOption}
                    multiplierIdentifier={item.multiplierIdentifier || undefined}
                    multiplier={item.multiplier || 0}
                    options={getPropertyOptions(item.element)}
                    typicalEstimate={item.typicalEstimate}
                    qualityOfFinish={item.qualityOfFinish}
                    qualityEstimate={item.qualityEstimate}
                  />
                ))}
              {!isMini && (
                <tr>
                  <TableCell className="text-center"></TableCell>
                  <TableCell>Veranda Floor Area: </TableCell>
                  <TableCell className="text-center">
                    <div className="grow">
                      <FormTextField {...getNameProp('verandaFloorArea')} defaultValue={verandaFloorArea} type="number" step={0.01} isCamo />
                    </div>
                  </TableCell>
                  <TableCell className="text-center"></TableCell>
                  <TableCell className="text-center"></TableCell>
                </tr>
              )}
              {!!isMini && <input type="hidden" {...getNameProp('verandaFloorArea')} value={verandaFloorArea} />}
            </tbody>
            <tfoot>
              <tr>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="items-center">Total Building Estimate</TableCell>
                <TableCell className="text-end bg-stone-100 font-bold">{formatAmount(totalTypicalEstimate)}</TableCell>
                <TableCell className="text-end font-bold">Obsolescence</TableCell>
                <TableCell className="text-end bg-stone-100 font-bold">{formatAmount(totalQualityEstimate)}</TableCell>
              </tr>
              <tr>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="items-center">Cost/M2</TableCell>
                <TableCell className="text-end bg-stone-100 font-bold">{formatAmount(costPerSqMTypical)}</TableCell>
                <TableCell className="text-end font-normal">{formatAmount(getObso(costPerSqMTypical, costPerSqMQuality))}%</TableCell>
                <TableCell className="text-end bg-stone-100 font-bold">{formatAmount(costPerSqMQuality)}</TableCell>
              </tr>
            </tfoot>
          </table>
          <SavePanel>
            <input type="hidden" name="items" value={JSON.stringify(props)} />
            <div className="flex flex-col items-start">
              <PrimaryButton type="submit" disabled={isProcessing}>
                Save Changes
              </PrimaryButton>
            </div>
          </SavePanel>
        </ActionContextProvider>
      </form>
    </div>
  );
}

function ListItem(props: {
  index: number;
  err?: string;
  id: string;
  element: string;
  propertyOption: string;
  options: string[];
  multiplierIdentifier?: string;
  multiplier?: number;
  typicalEstimate: number;
  qualityOfFinish: string;
  qualityEstimate: number;
}) {
  const { index, element, propertyOption, options, typicalEstimate, qualityOfFinish, qualityEstimate, multiplier, multiplierIdentifier, err } = props;

  const finishOptions = [
    QualityOfFinish.Delapidated,
    QualityOfFinish.Poor,
    QualityOfFinish.Fair,
    QualityOfFinish.Good,
    QualityOfFinish.VeryGood,
    QualityOfFinish.Excellent,
    QualityOfFinish.NotApplicable,
  ];

  useEffect(() => {
    if (err) {
      toast.error(err);
    }
  }, [err]);

  return (
    <>
      <tr>
        <input type="hidden" name="id" value={props.id || ''} />
        <TableCell className="text-center">{index + 1}.</TableCell>
        <TableCell className="col-span-2">
          <span>{element}</span>
        </TableCell>
        <TableCell className="bg-orange-100">
          <FormSelect name={getStateId(['prop', index, 'propertyOption'])} defaultValue={propertyOption} isCamo disabled={propertyOption === KnownElement.Foundations}>
            <option value="">Select Property Option</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </FormSelect>
        </TableCell>
        <TableCell className="bg-stone-100 text-end">
          <span className="font-normal">{formatAmount(typicalEstimate)}</span>
        </TableCell>
        <TableCell className="bg-orange-100">
          <FormSelect name={getStateId(['prop', index, 'qualityOfFinish'])} defaultValue={qualityOfFinish} isCamo required>
            <option value="">Select Quality Code</option>
            {finishOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </FormSelect>
        </TableCell>
        <TableCell className="bg-stone-100 text-end">
          <span className="font-normal">{formatAmount(qualityEstimate)}</span>
        </TableCell>
      </tr>
      {!!multiplierIdentifier && (
        <tr>
          <TableCell className="text-center"></TableCell>
          <TableCell className="col-span-2">
            <span>{multiplierIdentifier || ''}</span>
          </TableCell>
          <TableCell className="bg-orange-100">
            <FormTextField name={getStateId(['prop', index, 'multiplier'])} defaultValue={multiplier} isCamo />
          </TableCell>
          <TableCell className="bg-stone-100 text-end"></TableCell>
          <TableCell className="bg-orange-100"></TableCell>
          <TableCell className="bg-stone-100 text-end"></TableCell>
        </tr>
      )}
    </>
  );
}
