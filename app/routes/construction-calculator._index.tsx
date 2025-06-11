import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { CenteredView } from '~/components/CenteredView';
import { FormTextField } from '~/components/FormTextField';
import { PrimaryButton } from '~/components/PrimaryButton';
import { SecondaryButtonLink } from '~/components/SecondaryButton';
import { Toolbar } from '~/components/Toolbar';
import { prisma } from '~/db.server';
import { createConstructionItem } from '~/models/construction.fns';
import { KnownElement, PropertyOption, QualityOfFinish, YearRange } from '~/models/construction.types';
import { badRequest, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';
import { useUser } from '~/utils';

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);
  const props = await prisma.constructionProp.findMany({
    select: { id: true, name: true },
  });
  return json({ props });
}

const Schema = z.object({
  name: z.string().min(1),
});
export async function action({ request }: ActionArgs) {
  await requireUserId(request);
  try {
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { name } = result.data;

    const devYear = YearRange.First;
    const floorArea = 200;

    const { id } = await prisma.constructionProp.create({
      data: {
        name,
        floorArea,
        devYear,
        items: {
          create: [
            createConstructionItem(KnownElement.Foundations, PropertyOption.Foundations, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.Concrete, PropertyOption.Concrete.Yes, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.Brickwork, PropertyOption.Bricks.StockBricks, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.RoofingCover, PropertyOption.Roofing.ConcreteRoofTiles, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.RoofingTrusses, PropertyOption.Trusses.TimberRoofTrusses, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.CarpentryAndJoineryDoors, PropertyOption.CarpentryAndJoineryDoors.Yes, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.CarpentryAndJoineryFittedKitchen, PropertyOption.CarpentryAndJoineryFittedKitchen.Yes, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.CarpentryAndJoineryFittedWardrobes, PropertyOption.CarpentryAndJoineryFittedWardrobes.Yes, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.Ceilings, PropertyOption.Ceilings.Yes, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.FloorCoverings, PropertyOption.Flooring.Tiling, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.Metalwork, PropertyOption.Frames.AluminiumWindow, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.Plastering, PropertyOption.Plastering.Yes, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.WallFinishes, PropertyOption.WallFinishes.Yes, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.PlumbingAndDrainage, PropertyOption.PlumbingAndDrainage.Yes, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.Paintwork, PropertyOption.Paintwork.Yes, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.Electrical, PropertyOption.Electrical.Yes, QualityOfFinish.Excellent),
            createConstructionItem(KnownElement.MechanicalWorks, PropertyOption.MechanicalWorks.Yes, QualityOfFinish.Excellent),
          ],
        },
      },
    });
    return redirect(AppLinks.ConstructionCalculator(id));
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}

export default function ConstructionCalculatorList() {
  const currentUser = useUser();
  const { props } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  return (
    <div className="flex h-screen flex-col items-stretch">
      <Toolbar currentUserName={currentUser.email} isSuper={currentUser.isSuper} isBanker={currentUser.isBanker} isSignatory={currentUser.isSignatory} />
      <div className="flex grow flex-row items-stretch pt-6">
        <CenteredView className="w-full" innerProps={{ className: twMerge('h-full gap-4') }}>
          <h1 className="text-xl font-bold">Construction Calculator</h1>
          <fetcher.Form method="post" className="flex flex-row items-center gap-6">
            <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
              <FormTextField {...getNameProp('name')} placeholder="Name" />
              <PrimaryButton type="submit">Create</PrimaryButton>
            </ActionContextProvider>
          </fetcher.Form>
          <div className="grid grid-cols-4 gap-2 py-4">
            {props.map((prop, index) => (
              <SecondaryButtonLink key={prop.id} to={AppLinks.ConstructionCalculator(prop.id)}>
                <div className="flex flex-col items-stretch">
                  <span>Construction Calculator #{index + 1}</span>
                </div>
              </SecondaryButtonLink>
            ))}
          </div>
        </CenteredView>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
