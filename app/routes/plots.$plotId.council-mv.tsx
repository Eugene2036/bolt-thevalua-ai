import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { ComponentProps, FormEvent } from 'react';

import { json } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  X, Wall, MapPin, Paint, BuildingEstate, Home,
  AirConditioningDisabled, ToolsKitchen,
  Bath, ToiletPaperOff, Swimming, Parking, Search,
  Ruler2
} from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { CustomStoredValue } from '~/components/CustomStoredValue';
import { EditStoredValueArea } from '~/components/EditStoredValueArea';
import { FormTextField } from '~/components/FormTextField';
import { GridCell } from '~/components/GridCell';
import { PrimaryButton } from '~/components/PrimaryButton';
import SavePanel from '~/components/SavePanel';
import { SecondaryButton } from '~/components/SecondaryButton';
import { prisma } from '~/db.server';
import {
  ComposeRecordIdSchema,
  StatusCode,
  badRequest,
  formatAmount,
  getValidatedId,
  hasSuccess,
  processBadRequest,
  safeParseJSON,
  validateStateId,
} from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { CLOUDINARY_CONFIG } from '~/models/plots.validations';
import { StoredValueId } from '~/models/storedValuest';
import { requireUser, requireUserId } from '~/session.server';
import { Card } from '~/components/Card';
import { CardHeader } from '~/components/CardHeader';
import { AiPlotChat } from '~/components/AiPlotChat';
import { Spinner } from '~/components/Spinner';
import { IconSparkles } from '@tabler/icons-react';
import GoogleComponent from '~/components/GoogleComponent';

var cantEdit: boolean = false;

const Schema = z.object({
  comparables: z.preprocess(safeParseJSON, ComposeRecordIdSchema('comparable plot').array()),
  valuerComments: z.string(),
  landRate: z.coerce.number().min(0),
  buildRate: z.coerce.number().min(0),
  usage: z.string(),
  desc: z.string(),
  perculiar: z.coerce.number(),
});

export async function loader({ request, params }: LoaderArgs) {
  const currentUser = await requireUser(request);
  const plotId = getValidatedId(params.plotId);

  const plot = await prisma.plot
    .findUnique({
      where: { id: plotId },
      select: {
        id: true,
        reviewedById: true,
        usage: true,
        plotNumber: true,
        propertyLocation: true,
        address: true,
        titleDeedNum: true,
        classification: true,
        valuationType: true,
        titleDeedDate: true,
        plotDesc: true,
        plotExtent: true,
        inspectionDate: true,
        analysisDate: true,
        valuerComments: true,
        plotAndComparables: { select: { id: true, comparablePlot: true } },
        storedValues: {
          select: { id: true, identifier: true, value: true },
        },
        grcRecords: {
          select: {
            id: true,
            identifier: true,
            unit: true,
            size: true,
            rate: true,
            bull: true,
          },
        },
        mvRecords: {
          select: {
            id: true,
            identifier: true,
            size: true,
            date: true,
            location: true,
            price: true,
          },
        },
        longitude: true,
        latitude: true,
      },
    })
    .then((plot) => {
      if (!plot) {
        return undefined;
      }
      return {
        ...plot,
        usage: plot.usage || 'Residential',
        desc: plot.plotDesc || 'Vacant Land',
        plotExtent: Number(plot.plotExtent),
        inspectionDate: dayjs(plot.inspectionDate).format('YYYY-MM-DD'),
        analysisDate: dayjs(plot.analysisDate).format('YYYY-MM-DD'),
        grcRecords: plot.grcRecords.map((record) => ({
          ...record,
          bull: record.bull || false,
          size: Number(record.size),
          rate: Number(record.rate),
        })),
        mvRecords: plot.mvRecords.map((record) => ({
          ...record,
          size: Number(record.size),
          price: Number(record.price),
        })),
      };
    });
  if (!plot) {
    throw new Response('Plot not found', { status: StatusCode.NotFound });
  }

  const comparables = await prisma.comparablePlot.findMany({
    where: { id: { in: plot.plotAndComparables.map((c) => c.comparablePlot.id) } },
    include: { comparableImage: true }
  }).then(records => records.map(record => ({
    ...record,
    plotExtent: Number(record.plotExtent),
    price: Number(record.price),
    size: Number(record.plotExtent),
    imageIds: record.comparableImage?.map((image) => image.imageId) || [],
  })));

  const plotAiAnalysisData = await prisma.plotAiAnalysis.findMany({
    where: { plotId: plot.id },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      plotId: true,
      query: true,
      analysis: true,
    },
  });

  const avgPrice = comparables.length ? comparables.reduce((acc, comparable) => acc + comparable.price, 0) / comparables.length : 0;

  function getStoredValue(identifier: StoredValueId) {
    if (!plot) {
      return undefined;
    }
    const match = plot.storedValues.find((el) => el.identifier === identifier);
    if (!match) {
      return undefined;
    }
    return { ...match, value: Number(match.value) };
  }

  const landRate = getStoredValue(StoredValueId.LandRate);
  const buildRate = getStoredValue(StoredValueId.BuildRate);
  const perculiar = getStoredValue(StoredValueId.Perculiar);

  cantEdit = plot.reviewedById ? !currentUser.isSuper : false;
  cantEdit = currentUser.isBanker === true ? true : false;

  console.log('Subject Plot # of structures:', plot.grcRecords.length);

  return json({
    cantEdit,
    avgPrice,
    plot,
    comparables,
    storedValues: { landRate, buildRate, perculiar },
    plotAiAnalysisData,
  });
}

export async function action({ request, params }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  try {
    const plotId = getValidatedId(params.plotId);
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { comparables, valuerComments, landRate, buildRate, perculiar, usage, desc } = result.data;

    await prisma.$transaction(async (tx) => {
      const updated = await tx.plot.update({
        where: { id: plotId },
        data: { valuerComments, usage, plotDesc: desc },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Plot,
          action: EventAction.Update,
          recordId: updated.id,
          recordData: JSON.stringify(updated),
        },
      });

      await tx.plotAndComparable.deleteMany({
        where: { plotId },
      });
      await tx.plotAndComparable.createMany({
        data: comparables.map((comparablePlotId) => ({
          plotId,
          comparablePlotId,
          valuerComments,
        })),
      });

      const records = await tx.plotAndComparable.findMany({
        where: { plotId, comparablePlotId: { in: comparables } },
      });
      for (let record of records) {
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.PlotAndComparable,
            action: EventAction.Create,
            recordId: record.id,
            recordData: JSON.stringify(record),
          },
        });
      }

      const valueRecords = await tx.storedValue.findMany({
        where: { plotId },
        select: { id: true, identifier: true },
      });

      async function updateStoredValue(identifier: string, newValue: number) {
        const record = valueRecords.find((r) => r.identifier === identifier);
        if (record) {
          const updated = await tx.storedValue.update({
            where: { id: record.id },
            data: { value: newValue },
          });
          await tx.event.create({
            data: {
              userId: currentUserId,
              domain: EventDomain.StoredValue,
              action: EventAction.Update,
              recordId: updated.id,
              recordData: JSON.stringify(updated),
            },
          });
        } else {
          const created = await tx.storedValue.create({
            data: { plotId, identifier, value: newValue },
          });
          await tx.event.create({
            data: {
              userId: currentUserId,
              domain: EventDomain.StoredValue,
              action: EventAction.Create,
              recordId: created.id,
              recordData: JSON.stringify(created),
            },
          });
        }
      }
      await updateStoredValue(StoredValueId.LandRate, landRate);
      await updateStoredValue(StoredValueId.BuildRate, buildRate);
      await updateStoredValue(StoredValueId.Perculiar, perculiar);
    });

    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}

export default function PlotMVPage() {
  const { plot, comparables: initComparables, storedValues, cantEdit, plotAiAnalysisData } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const aiFetcher = useFetcher();
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  const [firstComparables, setComparables] = useState(
    initComparables.map((record) => ({
      ...record,
      selected: true,
    })),
  );
  const comparables = firstComparables.filter((c) => c.selected);

  const avgPrice = comparables.length ? comparables.reduce((acc, comparable) => acc + comparable.price, 0) / comparables.length : 0;

  function handleSelect(id: string) {
    setComparables((prev) => {
      return prev.map((record) => {
        if (record.id === id) {
          return { ...record, selected: !record.selected };
        }
        return record;
      });
    });
  }

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      toast.success('Changes saved');
    }
  }, [fetcher.data]);

  const [landRate, setLandRate] = useState<number | ''>(storedValues.landRate?.value || '');
  const [buildRate, setBuildRate] = useState<number | ''>(storedValues.buildRate?.value || '');
  const [usage, setUsage] = useState(plot.usage);
  const [desc, setDesc] = useState(plot.plotDesc);
  const [perculiar, setPerculiar] = useState<number | ''>(storedValues.perculiar?.value || '');
  const [valuerComments, setValuerComments] = useState(plot.valuerComments || '');

  function updateState(name: string, data: unknown) {
    const stateTuple = validateStateId(name);
    if (!stateTuple) {
      return;
    }
    if (!Array.isArray(stateTuple)) {
      if (stateTuple === getNameProp('landRate').name) {
        const result = z.literal('').or(z.coerce.number()).safeParse(data);
        if (result.success) {
          setLandRate(result.data);
        }
      }
      if (stateTuple === getNameProp('buildRate').name) {
        const result = z.literal('').or(z.coerce.number()).safeParse(data);
        if (result.success) {
          setBuildRate(result.data);
        }
      }
      if (stateTuple === getNameProp('usage').name) {
        const result = z.string().safeParse(data);
        if (result.success) {
          setUsage(result.data);
        }
      }
      if (stateTuple === getNameProp('desc').name) {
        const result = z.string().safeParse(data);
        if (result.success) {
          setDesc(result.data);
        }
      }
      if (stateTuple === getNameProp('perculiar').name) {
        const result = z.literal('').or(z.coerce.number()).safeParse(data);
        if (result.success) {
          setPerculiar(result.data);
        }
      }
      if (stateTuple === getNameProp('valuerComments').name) {
        const result = z.string().safeParse(data);
        if (result.success) {
          setValuerComments(result.data);
        }
      }
      return;
    }
  }

  const handleAiSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!aiSearchQuery.trim()) return;

    setIsAiLoading(true);
    try {
      // Get all comparable properties from the database
      interface Comparable {
        id: string;
        createdAt: string; // Assuming dates are returned as ISO strings
        updatedAt: string;
        plotNumber: string;
        plotExtent: number; // Assuming this is a number
        propertyType: string;
        location: string;
        suburb: string;
        price: number;
        transactionDate: string;
        titleDeed: string;
        status: string;
        plotDesc: string;
        numAirCons: number;
        numParkingBays: number;
        numOfStructures: number;
        numToilets: number;
        numStorerooms: number;
        numBathrooms: number;
        swimmingPool: string;
        paving: string;
        boundary: string;
        garageType: string;
        kitchen: string;
        wardrobe: string;
        roofModel: string;
        ceiling: string;
        interiorWallFinish: string;
        longitude: string | null;
        latitude: string | null;
        plotAiAnalysisId: string | null;
        comparablePlotId: string | null;
      }

      console.log('Subject Plot # of structures:', plot.grcRecords.length);

      const subjectProperty = {
        plotId: plot.id,
        plotNumber: plot.plotNumber,
        plotExtent: plot.plotExtent,
        propertyType: plot.valuationType,
        location: plot.propertyLocation || '',
        address: plot.address || '',
        price: 0, // Unknown for subject
        titleDeed: plot.titleDeedNum || '',
        longitude: plot.longitude?.toString() || '',
        latitude: plot.latitude?.toString() || '',
        numberOfStructures: plot.grcRecords.length,
      };

      const queryParams = new URLSearchParams({
        propertyType: plot.classification,
        location: plot.propertyLocation ?? '',
        plotExtent: plot.plotExtent.toString(),
      }).toString();

      const allComparables = await fetch(`/api/comparables?${queryParams}`)
        .then(res => res.json()) as Comparable[];

      console.log('All comparables:', allComparables);

      const aiPrompt = `
                      Analyze these properties and select the 4 most comparable to this subject property:

                      Subject: ${JSON.stringify(subjectProperty)}

                      Available comparables: ${JSON.stringify(allComparables)}

                      Consider location, size, property type, and other relevant factors. 
                      Only include properties that have number of structures (numOfStructures) greater than 0.
                      Valid transaction dates cannot be in the future.
                      Prices of the 4 selected properties should be in the same range with about +/- 20% variance.
                      Using GPS coordinates, find the closest properties to the subject property. 
                      If there are no properties within 20% variance, select the closest ones from a another "location" but with similar properties.
                      Select the most relevant 4 properties and provide a brief explanation of your selection criteria.

                      Provide separate explanations for each selected property, including:
                      - Why it was selected
                      - How it compares to the subject property
                      - Any unique features or characteristics that make it comparable
                      - Any other relevant information that supports its selection

                      Return the result as JSON in the following format, wrapped in triple backticks:

                      \`\`\`json
                      {
                        "analysis": {
                          "comparableIds": ["id1", "id2", "id3", "id4"],
                          "plotNumbers": ["plotNumber1", "plotNumber2", "plotNumber3", "plotNumber4"],
                          "explanation": "Your explanation here"
                        }
                      }
                      \`\`\`
                      `;

      const response = await fetch('/api/ai-chat-mv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: aiPrompt, plotId: subjectProperty.plotId }),
      });

      interface AIResponse {
        error?: {
          message: string;
        };
        analysis?: {
          comparableIds: string[];
          explanation: string;
        };
        completion?: string;
      }

      const data = await response.json() as AIResponse;

      console.log('AI response:', data);

      if (data.error) {
        throw new Error(data.error.message || 'AI analysis failed');
      }

      // Ensure 'data.completion' is defined before parsing
      if (!data.completion) {
        throw new Error('AI response is missing the completion field');
      }

      // const aiResponse = JSON.parse(data.completion as string) as AIResponse;
      const aiResponse = data.completion as {
        analysis?: {
          comparableIds: string[];
          explanation: string;
        };
      };

      // Extract the selected IDs and analysis
      const selectedIds = aiResponse.analysis?.comparableIds || [];
      const analysis = aiResponse.analysis?.explanation || 'No analysis provided';

      // Update the UI with selected comparables
      // Transform the data to match the expected type
      setComparables(
        allComparables.map(record => ({
          ...record,
          selected: selectedIds.includes(record.id),
          plotExtent: Number(record.plotExtent),
          price: Number(record.price),
          size: record.plotExtent ? Number(record.plotExtent) : 0,
          imageIds: [],
          comparableImage: [],
          createdAt: record.createdAt ? record.createdAt.toString() : '',
          updatedAt: record.updatedAt ? record.updatedAt.toString() : '',
          transactionDate: record.transactionDate ? record.transactionDate.toString() : '',
          longitude: record.longitude ? record.longitude.toString() : null,
          latitude: record.latitude ? record.latitude.toString() : null,
        }))
      );

      setAiAnalysis(analysis);
    } catch (error) {
      toast.error('Failed to get AI analysis: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsAiLoading(false);
    }
  };

  const avgSize = comparables.length ? comparables.reduce((acc, record) => acc + record.size, 0) / comparables.length : 0;
  const compLandValue = avgSize * (landRate || 0);
  const marketValue = avgPrice + Number(avgPrice * (perculiar || 0) * 0.01);
  const forcedSaleValue = marketValue * 0.9;

  const items = [
    ['Average Price', formatAmount(avgPrice)],
    ['Ave. Comp. Land Value', formatAmount(compLandValue)],
  ] as const;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    fetcher.submit(event.currentTarget);
  }

  return (
    <div className="flex flex-col items-stretch gap-8">
      <fetcher.Form ref={formRef} onSubmit={handleSubmit} method="post" className="flex flex-col items-stretch gap-4">
        <ActionContextProvider {...fetcher.data} updateState={updateState} isSubmitting={isProcessing} disabled={cantEdit}>
          <div className="grid grid-cols-3 gap-6">
            <input type="hidden" {...getNameProp('comparables')} value={JSON.stringify(comparables.map((c) => c.id))} />
            <input type="hidden" name="landRate" value={landRate} />
            <div className="flex flex-row items-center gap-2">
              <span className="text-lg font-light">Land Rate: </span>
              <CustomStoredValue name="landRate" defaultValue={landRate} isCamo type="number" step={0.01} className="text-end" />
            </div>
            <input type="hidden" name="buildRate" value={buildRate} />
            <div className="flex flex-row items-center gap-2">
              <span className="text-lg font-light">Usage: </span>
              <div className="grow">
                <FormTextField {...getNameProp('usage')} defaultValue={usage} isCamo />
              </div>
            </div>
            <div className="flex flex-row items-center gap-2">
              <span className="text-lg font-light">Desc: </span>
              <div className="grow">
                <FormTextField {...getNameProp('desc')} defaultValue={desc ?? ''} isCamo />
              </div>
            </div>
          </div>
          <PrimaryButton type="submit" disabled={isProcessing} className="invisible top-0 left-0 absolute">
            {!isProcessing && 'Search'}
            {isProcessing && 'Searching...'}
          </PrimaryButton>
          <input type="hidden" {...getNameProp('landRate')} value={landRate} />
          <input type="hidden" {...getNameProp('buildRate')} value={buildRate} />
          <input type="hidden" {...getNameProp('usage')} value={usage} />
          <input type="hidden" {...getNameProp('desc')} value={desc ?? ''} />
          <input type="hidden" {...getNameProp('perculiar')} value={perculiar} />
          <input type="hidden" {...getNameProp('valuerComments')} value={valuerComments} />
        </ActionContextProvider>
      </fetcher.Form>

      <div className="flex flex-col items-stretch gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Benchmark Assets</h2>

          <form onSubmit={handleAiSearch} className="flex flex-col gap-4">
            <div className="relative">
              <input
                type="text"
                value={aiSearchQuery}
                onChange={(e) => setAiSearchQuery(e.target.value)}
                placeholder="Describe key features of the property you're looking for..."
                className="w-full p-4 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isAiLoading || cantEdit}
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              {isAiLoading && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <Spinner className="h-5 w-5 text-blue-500" />
                </div>
              )}
            </div>

            <PrimaryButton type="submit" disabled={isAiLoading || cantEdit} className="flex p-3 gap-3 self-end">
              <IconSparkles className="h-5 w-5" />
              {isAiLoading ? 'Analyzing...' : 'Find Comparables'}
            </PrimaryButton>
          </form>

          {aiAnalysis ? (
            <div className="mt-6 bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Analysis of Selected Comparables</h3>
              <p className="text-gray-700 whitespace-pre-line">{aiAnalysis}</p>
            </div>
          ) : (
            plotAiAnalysisData.map((analysis) => (
              <div key={analysis.id} className="mb-4">
                <p className="text-gray-500 text-sm">
                  <span className="font-semibold">Date:</span> {dayjs(analysis.createdAt).format('YYYY-MM-DD HH:mm')}
                </p>
                <p className="text-gray-700 whitespace-pre-line">
                  {/* {analysis.query}: */}
                  {(() => {
                    try {
                      const json = JSON.parse(analysis.analysis) as { analysis?: { explanation?: string } };
                      return (
                        <span className="block rounded p-2 mt-2 text-sm">
                          {json.analysis?.explanation || 'No explanation found.'}
                        </span>
                      );
                    } catch {
                      return <> {analysis.analysis}</>;
                    }
                  })()}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
          <h3 className='text-red-600 font-extralight text-xs'>Click on map to reveal exact location of Comparable Property</h3>
          {firstComparables.map((record, index) => (
            <Tr key={index} record={record} selected={record.selected} handleSelect={handleSelect} />
          ))}
          {!firstComparables.length && (
            <div className="col-span-2 flex flex-col justify-center items-center text-slate-600 py-6">
              Use the AI search above to find matching properties.
            </div>
          )}
        </div>
      </div>

      <fetcher.Form ref={formRef} onSubmit={handleSubmit} method="post" className="flex flex-col items-stretch gap-4">
        <ActionContextProvider {...fetcher.data} updateState={updateState} isSubmitting={isProcessing} disabled={cantEdit}>
          <input type="hidden" {...getNameProp('comparables')} value={JSON.stringify(comparables.map((c) => c.id))} />
          <div className="flex flex-row items-stretch">
            <div className="flex flex-col items-stretch grow">
              <div className="grid grid-cols-3">
                <GridCell className="text-end col-span-2 py-4 font-semibold">Analysis</GridCell>
                <GridCell className="text-end py-4 font-semibold">Values</GridCell>
              </div>
              {items.map(([analysis, value], index) => (
                <div key={index} className="grid grid-cols-3">
                  <GridCell className="font-light text-end col-span-2 py-4">{analysis}</GridCell>
                  <GridCell className="font-light text-end py-4">{value}</GridCell>
                </div>
              ))}
              <div className="grid grid-cols-3">
                <GridCell className="font-light text-end col-span-2 py-4">Adjustment for perculiar situation</GridCell>
                <GridCell className="font-light text-end py-4">
                  <div className="flex flex-row items-center gap-2">
                    <div className="flex flex-col items-stretch grow">
                      <CustomStoredValue name="perculiar" defaultValue={perculiar} isCamo type="number" step={0.01} className="text-end" />
                    </div>
                    <span className="text-xl font-light">%</span>
                  </div>
                </GridCell>
              </div>
              <div className="grid grid-cols-3">
                <GridCell className="font-light text-end col-span-2 py-4">Market Value</GridCell>
                <GridCell className="font-light text-end py-4">{formatAmount(marketValue)}</GridCell>
              </div>
              <div className="grid grid-cols-3">
                <GridCell className="font-light text-end col-span-2 py-4">Forced Sale Value</GridCell>
                <GridCell className="font-light text-end py-4">{formatAmount(forcedSaleValue)}</GridCell>
              </div>
            </div>
            <div className="flex flex-col justify-center items-center p-2 border border-stone-200">
              <SecondaryButton isIcon disabled className="invisible">
                <X size={16} />
              </SecondaryButton>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2">
            <span className="text-xl font-light">Valuer's Comments</span>
            <EditStoredValueArea name="valuerComments" defaultValue={valuerComments} />
          </div>
          <SavePanel>
            <div className="flex flex-col items-start">
              <PrimaryButton type="submit" disabled={isProcessing || cantEdit}>
                Save Changes
              </PrimaryButton>
            </div>
            <div className="flex flex-col items-end">
              <AiPlotChat plotId={plot.id} />
            </div>
          </SavePanel>
          <input type="hidden" {...getNameProp('landRate')} value={landRate} />
          <input type="hidden" {...getNameProp('buildRate')} value={buildRate} />
          <input type="hidden" {...getNameProp('usage')} value={usage} />
          <input type="hidden" {...getNameProp('desc')} value={desc ?? ''} />
          <input type="hidden" {...getNameProp('perculiar')} value={perculiar} />
          <input type="hidden" {...getNameProp('valuerComments')} value={valuerComments} />
        </ActionContextProvider>
      </fetcher.Form>
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}

interface TrProps extends Omit<ComponentProps<'tr'>, 'children'> {
  record: {
    id: string;
    plotNumber: string;
    plotExtent: number;
    propertyType: string;
    location: string;
    suburb: string;
    price: number;
    transactionDate: string;
    plotDesc: string;
    titleDeed: string;
    numAirCons: number;
    numParkingBays: number;
    numOfStructures: number;
    numToilets: number;
    numStorerooms: number;
    numBathrooms: number;
    swimmingPool: string;
    paving: string;
    boundary: string;
    garageType: string;
    kitchen: string;
    wardrobe: string;
    roofModel: string;
    ceiling: string;
    interiorWallFinish: string;
    imageIds: string[];
    longitude?: string | null;
    latitude?: string | null;
  };
  selected: boolean;
  handleSelect: (id: string) => void;
}

function Tr(props: TrProps) {
  const { className, record, selected, handleSelect, ...rest } = props;

  function handleChange() {
    handleSelect(record.id);
  }

  const cloudName = CLOUDINARY_CONFIG.CLOUD_NAME;

  const getImageUrl = (imageId: string) => {
    return `https://res.cloudinary.com/${cloudName}/image/upload/${imageId}`;
  };

  return (
    <Card className={twMerge(selected && 'bg-green-50', className)} {...rest}>
      <CardHeader className="flex flex-row items-stretch gap-4 p-2">
        <div className="grid grid-cols-5 text-sm items-stretch min-w-full p-2">
          <div className="flex flex-row font-semibold text-left">
            <b>Plot: </b> {record.plotNumber}
          </div>
          {/* <div className="flex flex-row font-semibold text-center">
            Plot Size: {record.plotExtent} m<sup>2</sup>
          </div> */}
          <div className="flex flex-col font-semibold text-center">
            Year Sold: {dayjs(record.transactionDate).format('YYYY')}
          </div>
          <div className="flex flex-col font-semibold text-center">
            P {formatAmount(record.price)}
          </div>
          <div className="flex flex-row font-semibold text-center"> </div>
          <div className="flex flex-col text-center ml-auto">
            <input
              type="checkbox"
              checked={selected}
              onChange={handleChange}
              className="w-[12px] h-[12px]"
              disabled={cantEdit}
            />
          </div>
        </div>
      </CardHeader>
      <div className="grid col-span-2 text-sm p-4 font-light">
        <div className="flex p-0 m-1">
          <div className="w-[33%]">
            <GoogleComponent latitude={Number(record.latitude) || 0} longitude={Number(record.longitude) || 0} mapLabel={record.plotNumber + ' ' + record.plotDesc} mapHeight="230px" />

            {/* {record.imageIds.length > 0 ? (
              <ImagesCarousel imageUrls={record.imageIds.map((imageId) => getImageUrl(imageId))} />
            ) : (
              <div className="bg-gray-100 h-full flex items-center justify-center text-gray-400">
                No images available
              </div>
            )} */}
          </div>

          <div className="w-[67%] pl-2">
            <div className="grid grid-cols-3 gap-6">
              <span className="font-thin">
                <div className='flex items-center gap-3'>
                  <Ruler2 className='min-w-6 max-w-6' color="black" />
                  <span>{record.plotExtent} m<sup>2</sup></span>
                </div>
              </span>
              <span className="font-thin">
                <div className='flex items-center gap-3'>
                  <BuildingEstate className='min-w-6 max-w-6' color="black" />
                  <span>{record.propertyType}</span>
                </div>
              </span>
              <span className="font-thin">
                <div className='flex items-center gap-3'>
                  <MapPin className='min-w-6 max-w-6' color="black" />
                  <span>{record.suburb}</span>
                </div>
              </span>

              {record.kitchen === 'Yes' && (
                <span className="font-thin">
                  <div className='flex items-center gap-3'>
                    <ToolsKitchen className='min-w-6 max-w-6' color="black" />
                    <span>Kitchen ({record.kitchen})</span>
                  </div>
                </span>
              )}
              {record.boundary !== 'None' && (
                <span className="font-thin">
                  <div className='flex items-center gap-3'>
                    <Wall className='min-w-6 max-w-6' color="black" />
                    <span>{record.boundary}</span>
                  </div>
                </span>
              )}
              {record.numAirCons !== 0 && (
                <span className="font-thin">
                  <div className='flex items-center gap-3'>
                    <AirConditioningDisabled className='min-w-6 max-w-6' color="black" />
                    <span>Aircon ({record.numAirCons})</span>
                  </div>
                </span>
              )}
              {record.numToilets !== 0 && (
                <span className="font-thin">
                  <div className='flex items-center gap-3'>
                    <ToiletPaperOff className='min-w-6 max-w-6' color="black" />
                    <span>Toilets ({record.numToilets})</span>
                  </div>
                </span>
              )}
              {record.numBathrooms !== 0 && (
                <span className="font-thin">
                  <div className='flex items-center gap-3'>
                    <Bath className='min-w-6 max-w-6' color="black" />
                    <span>Bathroom ({record.numBathrooms})</span>
                  </div>
                </span>
              )}
              {record.numParkingBays !== 0 && (
                <span className="font-thin">
                  <div className='flex items-center gap-3'>
                    <Parking className='min-w-6 max-w-6' color="black" />
                    <span>Parking ({record.numParkingBays})</span>
                  </div>
                </span>
              )}
              {record.swimmingPool === 'Yes' && (
                <span className="font-thin">
                  <div className='flex items-center gap-3'>
                    <Swimming className='min-w-6 max-w-6' color="black" />
                    <span>Pool ({record.swimmingPool})</span>
                  </div>
                </span>
              )}
              {record.interiorWallFinish !== 'Unknown' && (
                <span className="font-thin">
                  <div className='flex items-center gap-3'>
                    <Paint className='min-w-6 max-w-6' color="black" />
                    <span>{record.interiorWallFinish}</span>
                  </div>
                </span>
              )}
              {record.roofModel !== 'None' && (
                <span className="font-thin">
                  <div className='flex items-center gap-3'>
                    <Home className='min-w-6 max-w-6' color="black" />
                    <span>{record.roofModel}</span>
                  </div>
                </span>
              )}
            </div>
          </div>
        </div>
        {record.plotDesc !== '' && (
          <span className="font-thin">
            <div className='flex items-center gap-3 font-semibold'>
              <span>{record.plotDesc}</span>
            </div>
          </span>
        )}
        {record.longitude && record.latitude && (
          <div className="mt-2 text-xs text-gray-500">
            Location: {record.latitude}, {record.longitude}
          </div>
        )}
      </div>
    </Card>
  );
}