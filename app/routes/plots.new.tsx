import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { FormFields } from '~/models/forms';

import { Response, json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { useState } from 'react';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { AddImage } from '~/components/AddImage';
import { AddMultipleImages } from '~/components/AddMultipleImages';
import BackButton from '~/components/BackButton';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { Card } from '~/components/Card';
import { CardHeader } from '~/components/CardHeader';
import { FormSelect } from '~/components/FormSelect';
import { FormTextArea } from '~/components/FormTextArea';
import { FormTextField } from '~/components/FormTextField';
import { Image } from '~/components/Image';
import { InlineAlert } from '~/components/InlineAlert';
import NextButton from '~/components/NextButton';
import { Services } from '~/components/Services';
import { TextField } from '~/components/TextField';
import { prisma } from '~/db.server';
import { RequiredImageIdSchema, StatusCode, badRequest, getMarketValue, getValidatedId, processBadRequest, safeJsonParse } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields, hasFieldErrors, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUser, requireUserId } from '~/session.server';
import { Construction } from '~/components/Construction';
import { Editor } from 'primereact/editor';
import SummaryOfValuationTable from '~/components/SummaryOfValuationTable';
import { getValuer } from '~/models/plots.validations';
import { StoredValueId } from '~/models/storedValuest';

var landValue = 0;
var valueOfImprovements = 0;
var capValue = 0;

export async function loader({ request, params }: LoaderArgs) {
  console.log("Property Details: Action called with params:", params);
  await requireUserId(request);

  const queryParams = getQueryParams(request.url, ['redirectTo']);
  const redirectTo = queryParams.redirectTo || '';
  const currentUser = await requireUser(request);

  const activeUser = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: {
      Plot: true,
      UserGroup: {
        include: {
          company: {
            select: {
              id: true,
              CompanyName: true,
            }
          }
        },
      },
    },
  });

  const compId = activeUser?.UserGroup?.company.id;
  const valType = params.valuationType;


  return json({
    compId, valType
  });
}

function getCurrentCoordinates(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        }
      );
    }
  });
}

const ConstructionSchema = z.preprocess((data: unknown) => {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (error) {
      return undefined;
    }
  }
}, z.array(z.string()));

const ServicesSchema = z.preprocess((data: unknown) => {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (error) {
      return undefined;
    }
  }
}, z.array(z.string()));

const Schema = z.object({
  globalId: z.coerce.string(),
  propertyId: z.coerce.number(),
  plotNumber: z.string(),
  council: z.coerce.boolean(),
  hasBeenZeroReviewed: z.coerce.boolean(),
  ZoneValue: z.coerce.string(),
  inspectionDate: z.coerce.date(),
  analysisDate: z.coerce.date(),
  propertyLocation: z.coerce.string(),
  plotExtent: z.coerce.string(),
  address: z.coerce.string(),
  zoning: z.coerce.string(),
  classification: z.coerce.string(),
  construction: ConstructionSchema,
  services: ServicesSchema,
  usage: z.coerce.string(),
  undevelopedPortion: z.coerce.number(),
  rateForUndevelopedPortion: z.coerce.number(),
  numAirCon: z.coerce.number(),
  numParkingBays: z.coerce.number(),
  numOfStructures: z.coerce.number(),
  SwimmingPool: z.coerce.string(),
  Paving: z.coerce.string(),
  Boundary: z.coerce.string(),
  Perimeter: z.coerce.number(),
  longitude: z.coerce.number(),
  latitude: z.coerce.number(),
  userId: z.coerce.string(),
  companyId: z.coerce.string(),
  valuer: z.coerce.string(),
  valuationType: z.coerce.string(),
});


export const action = async ({ params, request }: ActionArgs) => {
  console.log("BEGIN UPDATE ACTION");

  const currentUserId = await requireUserId(request);
  const plotId = getValidatedId(params.plotId);

  let getLatitude = 0;
  let getLongitude = 0;

  getCurrentCoordinates()
    .then((coordinates) => {
      console.log("Latitude: ", coordinates.latitude);
      console.log("Longitude: ", coordinates.longitude);
      getLatitude = coordinates.latitude;
      getLongitude = coordinates.longitude;
    })
    .catch((error) => {
      console.error("Error getting coordinates: ", error);
    });

  try {
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }

    const {
      globalId,
      propertyId,
      plotNumber,
      council,
      hasBeenZeroReviewed,
      ZoneValue,
      inspectionDate,
      analysisDate,
      propertyLocation,
      plotExtent,
      address,
      zoning,
      classification,
      construction,
      services,
      usage,
      undevelopedPortion,
      rateForUndevelopedPortion,
      numAirCon,
      numParkingBays,
      numOfStructures,
      SwimmingPool,
      Paving,
      Boundary,
      Perimeter,
      longitude,
      latitude,
      userId,
      companyId,
      valuer,
      valuationType,
    } = result.data;

    console.log("Updated Schema: ", result.data);


    const plot = await prisma.plot.findUnique({
      where: { id: plotId },
    });
    if (!plot) {
      throw new Error('Plot record not found');
    }

    console.log('Begin Plot Update Transaction');
    await prisma.$transaction(async (tx) => {
      const updated = await tx.plot.create({
        data: {
          globalId,
          propertyId,
          plotNumber,
          council,
          hasBeenZeroReviewed,
          ZoneValue,
          inspectionDate,
          analysisDate,
          propertyLocation,
          plotExtent,
          address,
          zoning,
          classification,
          construction: JSON.stringify(construction),
          services: JSON.stringify(services),
          usage,
          undevelopedPortion,
          rateForUndevelopedPortion,
          numAirCon,
          numParkingBays,
          numOfStructures,
          SwimmingPool,
          Paving,
          Boundary,
          Perimeter,
          longitude: getLongitude,
          latitude: getLatitude,
          userId,
          companyId,
          valuer,
          valuationType,
        },
      });

      console.log('Finished Plot Update Transaction');
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Plot,
          action: EventAction.Update,
          recordId: plotId,
          recordData: JSON.stringify({ from: plot, to: updated }),
        },
      });

    });

    return redirect(AppLinks.PlotCouncilGrc(plotId));

  } catch (error) {
    if (error instanceof Error) {
      console.error("Error message: ", error.message);
      return badRequest({ formError: error.message });
    } else {
      console.error("Unexpected error: ", error);
      return badRequest({ formError: 'An unexpected error occurred' });
    }
  }
};

export default function PlotValuerDetails() {
  const { compId, valType } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  // const defaultValues: FormFields<keyof z.infer<typeof Schema>> = {
  //   plotNumber: String(Plot.plotNumber),
  //   inspectionDate: dayjs(Plot.inspectionDate).format('YYYY-MM-DD'),
  //   analysisDate: dayjs(Plot.analysisDate).format('YYYY-MM-DD'),
  //   plotExtent: Plot.plotExtent,
  //   address: Plot.address,
  //   zoning: Plot.zoning,
  //   numAirCon: String(Plot.numAirCon),
  //   numParkingBays: String(Plot.numParkingBays),
  //   titleDeedNum: Plot.titleDeedNum || '',
  //   titleDeedDate: dayjs(Plot.titleDeedDate || '').format('YYYY-MM-DD'),
  //   usage: Plot.usage,

  //   longitude: Plot.longitude || '',
  //   latitude: Plot.latitude || '',
  //   // mapLabel: plot.mapLabel || '',

  //   summaryOfValuation: htmlTable,
  //   opinionOfValue: htmlTableOpinionOfValueNum,
  //   scopeOfWork: htmlTableScopeOfWork,
  //   basesOfValue: htmlTableBasesOfValue,
  //   scopeOfEquity: htmlTableScopeOfEquity,
  //   propertyDetails: htmlTablePropertyDetails,

  //   tableOfContents: htmlTableOfContents,

  //   coverImageId: Plot.coverImageId,
  //   imageIds: JSON.stringify(Plot.images.map((image) => image.imageId)),
  // };

  return (
    <fetcher.Form method="post" className="flex flex-col items-stretch gap-6">
      <ActionContextProvider {...fetcher.data} fields={fetcher.data?.fields || defaultValues} isSubmitting={isProcessing} >
        <Card>
          <CardHeader className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-semibold">4. Asset Details</h2>
          </CardHeader>
          <div className="flex flex-col items-stretch p-4">
            <div className="grid grid-cols-3 gap-6">
              <FormTextField {...getNameProp('plotNumber')} label="Plot Number" defaultValue={""} />
              <FormTextField {...getNameProp('plotExtent')} type="number" step={0.01} label="Plot Extent" defaultValue={""} />
              <FormTextField {...getNameProp('inspectionDate')} type="date" label="Inspection Date" defaultValue={""} />
              <FormTextField {...getNameProp('analysisDate')} type="date" label="Valuation Date" defaultValue={""} />
              <FormTextField {...getNameProp('address')} label="Address" defaultValue={""} />

              <input type="hidden" {...getNameProp('numParkingBays')} defaultValue={1} />
              <input type="hidden" {...getNameProp('numAirCon')} defaultValue={1} />

              <FormSelect
                {...getNameProp('usage')}
              >
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
              </FormSelect>

              <FormSelect hidden {...getNameProp('zoning')} label="" disabled={isProcessing} defaultValue={Plot.zoning}>
                {['Residential', 'Industrial', 'Commercial', 'Agricultural', 'Mixed Use'].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </FormSelect>
              <span className="text-sm flex flex-row items-stretch font-light text-stone-600">Services</span>
              <div className="col-span-3 flex flex-col items-stretch">
                <Services services={[]} />
              </div>
              <span className="text-sm flex flex-row items-stretch font-light text-stone-600">Construction</span>
              <div className="col-span-3 flex flex-col items-stretch">
                <Construction construction={[]} />
              </div>

              {/* <SummaryOfValuation templateId='cm5sax7bc0002rqqsk6llmaik' /> */}

              {/* <SummaryOfValuationTable templateId={'cm5sax7bc0002rqqsk6llmaik'} headerSection={'Summary of Valuation'} /> */}


              <div className="col-span-3 flex flex-col items-stretch " >

                <div>
                  <div className="grid grid-cols-1 gap-6">
                    <span className='text-xs'>NOTE: The following field constants can be used as placeholders anywhere within the Valuation Report, actual data will display automatically in the report preview:</span>
                    <div className='grid grid-cols-3 items-stretch gap-3'>
                      <div className='text-xs text-red-600'>
                        Market Value Amount: {'{marketValue}'}<br />
                        Market Value in Words: {'{marketValueInWords}'}<br />
                        Forced Sale Value Amount: {'{forcedValue}'}<br />
                        Forced Sale Value in Words: {'{forcedValueInWords}'}<br />
                        Replacement Cost Amount: {'{replacementCost}'}<br />
                        Replacement Cost in Words: {'{replacementCostInWords}'}<br />
                      </div>
                      <div className='text-xs text-red-600'>
                        Company Name: {'{companyName}'}<br />
                        Plot Number: {'{plotNumber}'}<br />
                        Plot Size: {'{plotExtent}'}<br />
                        Plot Size In Words: {'{plotExtentInWords}'}<br />
                        Instruction Date: {'{instructionDate}'}<br />
                        Inspection Date: {'{inspectionDate}'}<br />
                      </div>
                      <div className='text-xs text-red-600'>
                        Title Deed Date: {'{titleDeedDate}'}<br />
                        Title Deed Number: {'{titleDeedNumber}'}<br />
                        Client Company Name: {'{clientCompanyName}'}<br />
                        Client Full Name: {'{clientFullName}'}<br />
                        Valuation Date: {'{valuationDate}'}<br />
                      </div>
                    </div>
                    <div>
                      <span>Summary of Valuation</span>
                      <Editor
                        value={summaryOfValuation!}
                        headerTemplate={customHeader}
                        onTextChange={(e) => setSummaryOfValuation(e.htmlValue)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 mt-4">
                    <div>
                      <span>Opinion Of Value</span>
                      <Editor
                        readOnly
                        value={opinionOfValueNum!}
                        headerTemplate={customHeader}
                        onTextChange={(e) => setOpinionOfValueNum(e.htmlValue)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 mt-4">
                    <div>
                      <span>Scope of Work</span>
                      <Editor
                        value={scopeOfWork!}
                        headerTemplate={customHeader}
                        onTextChange={(e) => setScopeOfWork(e.htmlValue)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 mt-4">
                    <div>
                      <span>Bases of Value</span>
                      <Editor
                        value={basesOfValue!}
                        headerTemplate={customHeader}
                        onTextChange={(e) => setBasisOfValue(e.htmlValue)} />
                    </div>
                  </div>


                  <div className="grid grid-cols-1 gap-6 mt-4">
                    <div>
                      <span>Scope Of Equity</span>
                      <Editor
                        value={scopeOfEquity!}
                        headerTemplate={customHeader}
                        onTextChange={(e) => setScopeOfEquity(e.htmlValue)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 mt-4">
                    <div>
                      <span>Property Details</span>
                      <Editor
                        value={propertyDetails!}
                        headerTemplate={customHeader}
                        onTextChange={(e) => setPropertyDetails(e.htmlValue)} />
                    </div>
                  </div>



                </div>
              </div>

              <input type="hidden" {...getNameProp('summaryOfValuation')} value={summaryOfValuation!} readOnly />
              <input type="hidden" {...getNameProp('opinionOfValue')} value={opinionOfValueNum!} readOnly />
              <input type="hidden" {...getNameProp('scopeOfWork')} value={scopeOfWork!} readOnly />
              <input type="hidden" {...getNameProp('basesOfValue')} value={basesOfValue!} readOnly />
              <input type="hidden" {...getNameProp('scopeOfEquity')} value={scopeOfEquity!} readOnly />
              <input type="hidden" {...getNameProp('propertyDetails')} value={propertyDetails!} readOnly />

              <input type="hidden" {...getNameProp('reportTemplateId')} value={reportTemplateId} readOnly />
              <input type="hidden" {...getNameProp('tableOfContents')} value={tableOfContents} readOnly />

              <input type="hidden" name='MarketValue' value={MarketValue} readOnly />
              <input type="hidden" name='ForcedSaleValue' value={ForcedSaleValue} readOnly />
              <input type="hidden" name='ReplacementValue' value={ReplacementValue} readOnly />


              <input type="hidden" {...getNameProp('coverImageId')} value={coverImageId} />
              <input type="hidden" {...getNameProp('imageIds')} value={JSON.stringify(imageIds)} />
              <div className="flex flex-col items-stretch col-span-3 gap-2">
                <span className="text-sm font-light text-stone-600">Cover Image</span>
                <div className="grid grid-cols-4 gap-4">
                  {!!coverImageId && <Image key={coverImageId} imageId={coverImageId} removeImage={() => setCoverImageId('')} />}
                  {!coverImageId && (
                    <AddImage
                      handleUploadedImages={(imageIds) => {
                        const newImageId = imageIds.length ? imageIds[0] : '';
                        setCoverImageId(newImageId);
                      }}
                      singleUpload
                    />
                  )}
                </div>
                {!!coverImageError && <InlineAlert>{coverImageError}</InlineAlert>}
              </div>
              <div className="flex flex-col items-stretch col-span-3 gap-2">
                <span className="text-sm font-light text-stone-600">Multiple File attachments (<span className='text-red-600'>Maximum 8 images</span>)</span>
                <div className="grid grid-cols-4 gap-4">
                  {imageIds.map((imageId) => (
                    <Image key={imageId} imageId={imageId} removeImage={() => removeImage(imageId)} />
                  ))}
                  {/* <AddImage key="internal" handleUploadedImages={addImages} /> */}
                  <AddMultipleImages handleUploadedImages={addImages} />
                </div>
                {!!imagesError && <InlineAlert>{imagesError}</InlineAlert>}
              </div>
            </div>
            {hasFormError(fetcher.data) && <InlineAlert>{fetcher.data.formError}</InlineAlert>}
          </div>
          <CardHeader className="flex flex-row items-center gap-4" topBorder>
            <BackButton />
            <div className="grow" />
            <NextButton type="submit" isProcessing={isProcessing} />
          </CardHeader>
        </Card>
      </ActionContextProvider>
    </fetcher.Form>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
