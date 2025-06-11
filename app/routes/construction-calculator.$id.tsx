import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { FormEvent } from 'react';
import type { WithIndexAndError } from '~/models/core.validations';

import { Response, json } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { CenteredView } from '~/components/CenteredView';
import { ConstructionValuesInline } from '~/components/ConstuctionValuesInline';
import { FormSelect } from '~/components/FormSelect';
import { FormTextField } from '~/components/FormTextField';
import { PrimaryButton } from '~/components/PrimaryButton';
import SavePanel from '~/components/SavePanel';
import { SecondaryButton } from '~/components/SecondaryButton';
import { TableCell } from '~/components/TableCell';
import { TableHeading } from '~/components/TableHeading';
import { Toolbar } from '~/components/Toolbar';
import { prisma } from '~/db.server';
import { calcQualityEstimate, calcTypicalEstimate, getPropertyOptions, getValidated, validateInObj } from '~/models/construction.fns';
import { getYearRangeValues } from '~/models/construction.server';
import { KnownElement, MiniKnownElement, QualityOfFinish, YearRange } from '~/models/construction.types';
import { StatusCode, badRequest, createStateUpdater, formatAmount, getStateId, getValidatedId, hasSuccess, preprocessJSON, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields } from '~/models/forms';
import { requireUserId } from '~/session.server';
import { useUser } from '~/utils';

export async function loader({ request, params }: LoaderArgs) {
  await requireUserId(request);

  try {
    const id = getValidatedId(params.id);
    const yearRangeValues = await getYearRangeValues();
    const property = await prisma.constructionProp
      .findUnique({
        where: { id },
        include: { items: true },
      })
      .then((prop) => {
        if (!prop) {
          return undefined;
        }
        const devYear = getValidated.devYear(prop.devYear);
        if (!devYear) {
          throw new Response('Invalid value found for year of development, please contact the support team', { status: StatusCode.BadRequest });
        }
        return {
          ...prop,
          devYear,
          floorArea: Number(prop.floorArea),
          verandaFloorArea: Number(prop.verandaFloorArea),
          items: prop.items
            .map((item) => validateInObj.element(item))
            .map((item) => validateInObj.qualityOfFinish(item))
            .filter(Boolean),
        };
      });

    return json({ yearRangeValues, property });
  } catch (error) {
    console.log('error', error);
    throw new Response(getErrorMessage(error), {
      status: StatusCode.BadRequest,
    });
  }
}

const RowItemSchema = z.object({
  id: z.string().or(z.literal('')),
  element: z.nativeEnum(KnownElement).or(z.nativeEnum(MiniKnownElement)),
  propertyOption: z.string(),
  qualityOfFinish: z.nativeEnum(QualityOfFinish),
});
type RowItem = z.infer<typeof RowItemSchema>;

const Schema = z
  .object({
    floorArea: z.literal('').or(z.coerce.number()),
    verandaFloorArea: z.literal('').or(z.coerce.number()),
    devYear: z.nativeEnum(YearRange),
    items: preprocessJSON(RowItemSchema.array()),
  })
  .transform((arg) => ({
    ...arg,
    floorArea: arg.floorArea || 0,
    verandaFloorArea: arg.verandaFloorArea || 0,
  }));
export async function action({ request, params }: ActionArgs) {
  try {
    const id = getValidatedId(params.id);
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { items, floorArea, verandaFloorArea, devYear } = result.data;
    const currentRecords = await prisma.constructionPropertyItem.findMany({
      where: { propId: id },
      select: { id: true },
    });
    await prisma.$transaction(async (tx) => {
      await tx.constructionProp.update({
        where: { id },
        data: { floorArea, verandaFloorArea, devYear },
      });
      const itemsToDelete = currentRecords.filter((record) => items.every((el) => el.id !== record.id));
      for (let item of itemsToDelete) {
        await tx.constructionPropertyItem.delete({
          where: { id: item.id },
        });
      }

      const newRecords = items.filter((item) => !item.id);
      for (let record of newRecords) {
        await tx.constructionPropertyItem.create({
          data: {
            propId: id,
            element: record.element,
            propertyOption: record.propertyOption,
            qualityOfFinish: record.qualityOfFinish,
          },
        });
      }

      const existingRecords = items.filter((item) => item.id);
      for (let record of existingRecords) {
        await tx.constructionPropertyItem.update({
          where: { id: record.id },
          data: {
            element: record.element,
            propertyOption: record.propertyOption,
            qualityOfFinish: record.qualityOfFinish,
          },
        });
      }
    });

    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}

export default function ConstructionCalculator() {
  const currentUser = useUser();
  const { yearRangeValues, property } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      toast.success('Changes saved');
    }
  }, [fetcher.data]);

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const [floorArea, setFloorArea] = useState<number | ''>(property?.floorArea || '');
  const [verandaFloorArea, setVerandaFloorArea] = useState<number | ''>(property?.verandaFloorArea || '');
  const [devYear, setDevYear] = useState<YearRange>(property?.devYear || YearRange.First);

  const [props, setProps] = useState<WithIndexAndError<RowItem>[]>(
    property?.items.map((prop, index) => ({
      index,
      id: prop.id,
      element: prop.element,
      propertyOption: prop.propertyOption,
      qualityOfFinish: prop.qualityOfFinish,
    })) || [],
  );

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
      ['prop', 'qualityOfFinish', z.nativeEnum(QualityOfFinish), setProps],
      ['prop', 'qualityEstimate', z.coerce.number(), setProps],
    ] as const,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    fetcher.submit(event.currentTarget);
  }

  const refinedProps = props.map((prop) => {
    const typicalEstimate = calcTypicalEstimate(
      devYear,
      Number(floorArea),
      prop.propertyOption,
      yearRangeValues,
      prop.element === KnownElement.Veranda ? Number(verandaFloorArea) : 0,
    );
    const qualityEstimate = calcQualityEstimate(typicalEstimate, prop.qualityOfFinish);
    return { ...prop, typicalEstimate, qualityEstimate };
  });

  const totalTypicalEstimate = refinedProps.reduce((acc, prop) => acc + prop.typicalEstimate, 0);
  const totalQualityEstimate = refinedProps.reduce((acc, prop) => acc + prop.qualityEstimate, 0);

  const costPerSqMTypical = totalTypicalEstimate / Number(floorArea);
  const costPerSqMQuality = totalQualityEstimate / Number(floorArea);

  const [opened, setOpened] = useState(false);

  function toggle() {
    setOpened((prevState) => !prevState);
  }

  return (
    <div className="flex h-screen flex-col items-stretch">
      <Toolbar currentUserName={currentUser.email} isSuper={currentUser.isSuper} isBanker={currentUser.isBanker} isSignatory={currentUser.isSignatory} />
      <div className="flex grow flex-row items-stretch pt-6 overflow-auto">
        <CenteredView className="w-full" innerProps={{ className: twMerge('h-full') }}>
          <div className="flex flex-row items-stretch gap-2 overflow-y-auto">
            <fetcher.Form method="post" onSubmit={handleSubmit} className="grow flex flex-col items-stretch overflow-auto">
              <ActionContextProvider {...fetcher.data} updateState={updateState} isSubmitting={isProcessing}>
                <div className="flex flex-row items-center gap-4">
                  <h2 className="text-xl font-semibold py-4">CONSTRUCTION COST CALCULATOR</h2>
                  <div className="grow" />
                  <div className="flex flex-row items-center gap-2">
                    <span className="text-sm font-light">Veranda Floor Area: </span>
                    <div className="grow">
                      <FormTextField {...getNameProp('verandaFloorArea')} defaultValue={verandaFloorArea} type="number" step={0.01} isCamo />
                    </div>
                  </div>
                  <div className="flex flex-row items-center gap-2">
                    <span className="text-sm font-light">Floor Area: </span>
                    <div className="grow">
                      <FormTextField {...getNameProp('floorArea')} defaultValue={floorArea} type="number" step={0.01} isCamo />
                    </div>
                  </div>
                  <div className="flex flex-row items-center gap-2">
                    <span className="text-sm font-light">Year of Development: </span>
                    <div className="grow">
                      <FormSelect {...getNameProp('devYear')} defaultValue={devYear} isCamo>
                        <option value={YearRange.First}>{YearRange.First}</option>
                        <option value={YearRange.Second}>{YearRange.Second}</option>
                        <option value={YearRange.Third}>{YearRange.Third}</option>
                      </FormSelect>
                    </div>
                  </div>
                  <SecondaryButton type="button" onClick={toggle} className="p-1">
                    {opened ? <ChevronRight className="text-teal-600" /> : <ChevronLeft className="text-teal-600" />}
                  </SecondaryButton>
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
                    {refinedProps.map((item, index) => (
                      <ListItem
                        key={item.id}
                        id={item.id}
                        index={index}
                        element={item.element}
                        propertyOption={item.propertyOption}
                        options={getPropertyOptions(item.element)}
                        typicalEstimate={item.typicalEstimate}
                        qualityOfFinish={item.qualityOfFinish}
                        qualityEstimate={item.qualityEstimate}
                      />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="items-center">Total Building Estimate</TableCell>
                      <TableCell className="text-end bg-stone-100 font-bold">{formatAmount(totalTypicalEstimate)}</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-end bg-stone-100 font-bold">{formatAmount(totalQualityEstimate)}</TableCell>
                    </tr>
                    <tr>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="items-center">Cost/M2</TableCell>
                      <TableCell className="text-end bg-stone-100 font-bold">{formatAmount(costPerSqMTypical)}</TableCell>
                      <TableCell></TableCell>
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
            </fetcher.Form>
            {!!opened && (
              <div className="flex flex-col items-stretch w-[40%] overflow-auto">
                <div className="flex flex-row items-center invisible">
                  <h2 className="text-xl font-semibold py-4">CONSTRUCTION COST CALCULATOR CALCULATOR</h2>
                  <div className="grow" />
                  <SecondaryButton type="button" disabled className="p-1">
                    {opened ? <ChevronRight className="text-teal-600" /> : <ChevronLeft className="text-teal-600" />}
                  </SecondaryButton>
                </div>
                <ConstructionValuesInline data={yearRangeValues} />
              </div>
            )}
          </div>
        </CenteredView>
      </div>
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
  typicalEstimate: number;
  qualityOfFinish: string;
  qualityEstimate: number;
}) {
  const { index, element, propertyOption, options, typicalEstimate, qualityOfFinish, qualityEstimate, err } = props;

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
    <tr>
      <input type="hidden" name="id" value={props.id || ''} />
      <TableCell className="text-center">{index + 1}.</TableCell>
      <TableCell className="col-span-2">
        <span>{element}</span>
        {/* <FormTextField
          key={getStateId(['prop', index, 'element'])}
          name={getStateId(['prop', index, 'element'])}
          defaultValue={element}
          isCamo
          disabled
          required
        /> */}
      </TableCell>
      <TableCell className="bg-orange-100">
        <FormSelect name={getStateId(['prop', index, 'propertyOption'])} defaultValue={propertyOption} isCamo>
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
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
