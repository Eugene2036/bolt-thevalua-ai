import type { LoaderArgs } from '@remix-run/node';
import type { z } from 'zod';
import type { StoredValuesSchma } from '~/models/core.validations';

import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';

import councilLogo from '~/../public/images/council_logo.jpeg';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { CenteredView } from '~/components/CenteredView';
import { PrimaryButtonLink } from '~/components/PrimaryButton';
import { prisma } from '~/db.server';
import { useImage } from '~/hooks/usePropertyImage';
import { StatusCode, formatAmount, getQueryParams, getValidatedId, roundDown } from '~/models/core.validations';
import { AppLinks } from '~/models/links';
import { ValuationType } from '~/models/plots.validations';
import { StoredValueId } from '~/models/storedValuest';
import { capitalize } from '~/models/strings';
import { requireUserId } from '~/session.server';

export async function loader({ request, params }: LoaderArgs) {
  const currentUserId = await requireUserId(request);
  const plotId = getValidatedId(params.plotId);
  const { hasBeenValued } = getQueryParams(request.url, ['hasBeenValued']);

  const plot = await prisma.plot
    .findUnique({
      where: { id: plotId },
      select: {
        id: true,
        plotExtent: true,
        inspectionDate: true,
        analysisDate: true,
        valuerComments: true,
        address: true,
        valuationType: true,
        plotNumber: true,
        propertyLocation: true,
        coverImageId: true,
        images: { select: { imageId: true } },
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
        grcFeeRecords: {
          select: {
            id: true,
            identifier: true,
            perc: true,
          },
        },
        grcDeprRecords: {
          select: {
            id: true,
            identifier: true,
            perc: true,
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
      },
    })
    .then((plot) => {
      if (!plot) {
        return undefined;
      }
      return {
        ...plot,
        plotExtent: Number(plot.plotExtent),
        inspectionDate: dayjs(plot.inspectionDate).format('YYYY-MM-DD'),
        analysisDate: dayjs(plot.analysisDate).format('YYYY-MM-DD'),
        grcRecords: plot.grcRecords.map((record) => ({
          ...record,
          bull: record.bull || false,
          size: Number(record.size),
          rate: Number(record.rate),
        })),
        grcFeeRecords: plot.grcFeeRecords.map((record) => ({
          ...record,
          perc: Number(record.perc),
        })),
        mvRecords: plot.mvRecords.map((record) => ({
          ...record,
          size: Number(record.size),
          // date: dayjs(record.date).format('YYYY-MM-DD'),
          price: Number(record.price),
        })),
        grcDeprRecords: (() => {
          const records = plot.grcDeprRecords.map((record) => ({
            ...record,
            perc: Number(record.perc),
          }));
          if (records.length) {
            return records;
          }
          return [{ id: '', identifier: '', perc: 0 }];
        })(),
      };
    });
  if (!plot) {
    throw new Response('Plot record not found', {
      status: StatusCode.NotFound,
    });
  }

  if (hasBeenValued) {
    await prisma.plot.update({
      where: { id: plotId },
      data: { valuedById: currentUserId },
    });
  }

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

  const subjectLandValue = (landRate?.value || 0) * plot.plotExtent;

  const subjectBuildValue = plot.grcRecords.filter((el) => el.bull).reduce((acc, record) => acc + record.size, 0) * (buildRate?.value || 0);

  const projectedValue = subjectLandValue + subjectBuildValue;

  const marketValue = projectedValue + projectedValue * (perculiar?.value || 0);
  // const sayMarket = Math.round(marketValue / 100_000) * 100_000;
  const sayMarket = roundDown(marketValue, -5);

  const grcTotal = plot.grcRecords.reduce((acc, record) => acc + record.rate * record.size, 0);
  console.log('grcTotal', grcTotal);

  const netTotal =
    grcTotal +
    plot.grcFeeRecords.reduce((acc, record) => {
      const rowTotal = Number((record.perc * 0.01 * grcTotal).toFixed(2));
      return acc + rowTotal;
    }, 0);
  console.log('net total', netTotal);

  const deprTotal =
    netTotal -
    plot.grcDeprRecords.reduce((acc, record) => {
      const rowTotal = record.perc * 0.01 * grcTotal;
      // const rowTotal = roundDown(record.perc * 0.01 * grcTotal, -5);
      return acc + rowTotal;
    }, 0);
  console.log('depr total', deprTotal);

  const capitalValue = subjectLandValue + deprTotal;
  const improvementsValue = deprTotal;

  return json({
    plot,
    subjectLandValue,
    sayMarket,
    capitalValue,
    improvementsValue,
  });
}

export type StoredValues = z.infer<typeof StoredValuesSchma>;

/*
These arrays are indexed to the number that each element represents
*/
const ones = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine '];
const teen = ['ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
const tens = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const high = ['hundred ', 'thousand ', 'million ', 'billion '];
// Helper function - a simple logger

/*
This function takes 2 numbers and matches the first parameter to the index of the 
tens or teen array. The second parameter matches to the index of the ones array. 
A word number between 1 and 99 is returned. 
*/
const tensOnes = (t: any, o: any) => (+t == 0 ? ones[+o] : +t == 1 ? teen[+o] : +t > 1 && +o == 0 ? tens[+t - 2] : tens[+t - 2] + '-' + ones[+o]);

// function takes a number and returns a string number with 2 decimals
const fltN = (float: any) => [...parseFloat(float).toFixed(2)];

/* 
This function takes an array created by moneyToEng() function and returns a word
version of the given number. A switch() with 10 cases (9,999,999,999 is max) is 
used to call tensOnes() function. Before the string is returned, there are a few
fixes to make it grammatically correct.
*/
const stepper = (array: any) => {
  const D = array[0];
  const C = array[1];
  let size = D.length;
  let word;
  switch (size) {
    case 0:
      word = C;
      break;
    case 1:
      word = tensOnes(0, D[0]) + 'pula ' + C;
      break;
    case 2:
      word = tensOnes(D[1], D[0]) + 'pula ' + C;
      break;
    case 3:
      word = tensOnes(0, D[2]) + high[0] + tensOnes(D[1], D[0]) + 'pula ' + C;
      break;
    case 4:
      word = tensOnes(0, D[3]) + high[1] + tensOnes(0, D[2]) + high[0] + tensOnes(D[1], D[0]) + 'pula ' + C;
      break;
    case 5:
      word = tensOnes(D[4], D[3]) + high[1] + tensOnes(0, D[2]) + high[0] + tensOnes(D[1], D[0]) + 'pula ' + C;
      break;
    case 6:
      word = tensOnes(0, D[5]) + high[0] + tensOnes(D[4], D[3]) + high[1] + tensOnes(0, D[2]) + high[0] + tensOnes(D[1], D[0]) + 'pula ' + C;
      break;
    case 7:
      word = tensOnes(0, D[6]) + high[2] + tensOnes(0, D[5]) + high[0] + tensOnes(D[4], D[3]) + high[1] + tensOnes(0, D[2]) + high[0] + tensOnes(D[1], D[0]) + 'pula ' + C;
      break;
    case 8:
      word = tensOnes(D[7], D[6]) + high[2] + tensOnes(0, D[5]) + high[0] + tensOnes(D[4], D[3]) + high[1] + tensOnes(0, D[2]) + high[0] + tensOnes(D[1], D[0]) + 'pula ' + C;
      break;
    case 9:
      word =
        tensOnes(0, D[8]) +
        high[0] +
        tensOnes(D[7], D[6]) +
        high[2] +
        tensOnes(0, D[5]) +
        high[0] +
        tensOnes(D[4], D[3]) +
        high[1] +
        tensOnes(0, D[2]) +
        high[0] +
        tensOnes(D[1], D[0]) +
        'pula ' +
        C;
      break;
    case 10:
      word =
        tensOnes(0, D[9]) +
        high[3] +
        tensOnes(0, D[8]) +
        high[0] +
        tensOnes(D[7], D[6]) +
        high[2] +
        tensOnes(0, D[5]) +
        high[0] +
        tensOnes(D[4], D[3]) +
        high[1] +
        tensOnes(0, D[2]) +
        high[0] +
        tensOnes(D[1], D[0]) +
        'pula ' +
        C;
      break;
    default:
      break;
  }
  word = word.trim();
  word =
    word == 'one pula'
      ? 'one pula'
      : word == 'pula and one cent'
        ? 'one cent'
        : word == 'one pula and one cent'
          ? 'one pula and one cent'
          : word == 'and undefined-undefinedcents'
            ? ''
            : word;
  word = word
    .replace(/(thousand|million)\s(hundred)/g, '$1')
    .replace(/(million)\s(thousand)/g, '$1')
    .replace(/(tycents)/g, 'ty cents')
    .replace(/(typula)/g, 'ty pula');
  return word;
};

function moneyToEng(number: number) {
  let R = fltN(number);
  let dec, c, cents;
  dec = R.splice(-3, 3);
  c = tensOnes(dec[1], dec[2]);
  cents = c == 'one ' ? 'and one cent' : c == '' ? '' : `and ${c}cents`;
  return stepper([R.reverse(), cents]);
}

export default function PlotMVPage() {
  const { plot, subjectLandValue, sayMarket, capitalValue, improvementsValue } = useLoaderData<typeof loader>();

  const coverImageSrc = useImage(plot.coverImageId);
  const internalImageSrc = useImage(plot.images[0]?.imageId || undefined);
  const internalImageSrc2 = useImage(plot.images[1]?.imageId || undefined);

  // const words = (moneyToEng(12345.67) as string)
  const words = (moneyToEng(sayMarket) as string)
    .split(' ')
    .map((word) => {
      return word
        .split('-')
        .map((word) => capitalize(word))
        .join('-');
    })
    .join(' ');
  console.log('words', words);

  return (
    <CenteredView>
      <CenteredView>
        <div className="flex flex-col items-stretch shadow-xl border border-stone-200 rounded-xl p-6">
          <div className="flex flex-row items-center gap-2 py-6">
            <img src={councilLogo} alt="Council" className="rounded w-24" />
            {/* <div className="w-24 h-24 bg-slate-200 rounded" /> */}
            <div className="grow" />
            <span className="text-xl text-center font-normal">
              GENERAL VALUATION OF RATEABLE PROPERTIES, MAINTENANCE AND PRODUCTION OF VALUATION ROLL IN THE CITY OF FRANCISTOWN, 2023
            </span>
            <div className="grow" />
            {/* <img
              src={apexLogo}
              alt="Apex Properties"
              className="rounded w-24"
            /> */}
            {/* <div className="w-24 h-24 bg-slate-200 rounded" /> */}
          </div>
          <div className="flex flex-col justify-center items-center border-y border-slate-600 py-6">
            <span className="text-xl font-semibold">VALUATION CARD</span>
          </div>
          <div className="grid grid-cols-3 gap-4 py-6">
            <div className="flex flex-col items-start gap-1">
              <span className="text-base font-semibold">Address</span>
              <span className="text-base font-light">{[plot.plotNumber, plot.address].join(' ')}</span>
              <span className="text-base font-light">Botswana</span>
              {!!plot.propertyLocation && <span className="text-base font-light">{plot.propertyLocation}</span>}
              {/* plot number, neighbourhood, location */}
              {/* <span className="text-base font-light">{plot.address}</span> */}
            </div>
            <div className="flex flex-col items-start gap-1 col-span-2">
              <span className="text-base font-semibold">Property Type</span>
              <span className="text-base font-light">{plot.valuationType}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-y border-stone-400 py-6">
            {!!coverImageSrc && <img src={coverImageSrc} alt="Cover" className="rounded" />}
            {!coverImageSrc && <div className="w-72 h-72 bg-slate-200 rounded" />}
            {!!internalImageSrc && <img src={internalImageSrc} alt="Internal" className="rounded" />}
            {!internalImageSrc && <div className="w-72 h-72 bg-slate-200 rounded" />}
            {!!internalImageSrc2 && <img src={internalImageSrc2} alt="Internal" className="rounded" />}
            {!internalImageSrc2 && <div className="w-72 h-72 bg-slate-200 rounded" />}
          </div>
          <div className="grid grid-cols-3 gap-4 py-6 border-y border-stone-400">
            <div className="flex flex-col items-start gap-1">
              <span className="text-base font-semibold">Apex Properties</span>
              <span className="text-base font-light">Opinion of Market Value</span>
            </div>
            <div className="flex flex-col items-start gap-1 col-span-2">
              <span className="text-base font-semibold">P {formatAmount(sayMarket)}</span>
              {!!sayMarket && <span className="text-base font-semibold">({words})</span>}
              {/* <span className="text-base font-semibold">({words})</span> */}
              <span className="text-base font-light">Date of Valuation: {plot.analysisDate}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 py-6 border-y border-stone-400">
            <div className="flex flex-col items-start">
              <span className="text-base font-semibold">
                Rating
                <br /> Valuation
              </span>
            </div>
            <div className="grid grid-cols-2 gap-6 col-span-2">
              <span className="text-base font-light">Capital Value</span>
              <span className="text-base">BWP {formatAmount(capitalValue)}</span>
              <span className="text-base font-light">Land Value</span>
              <span className="text-base">BWP {formatAmount(subjectLandValue)}</span>
              <span className="text-base font-light">Value of Improvements</span>
              <span className="text-base">BWP {formatAmount(improvementsValue)}</span>
              <span className="text-base font-light">Effective Date</span>
              <span className="text-base">{dayjs().format('DD/MM/YYYY')}</span>
              <span className="text-base font-light">Valuation Reference</span>
              <span className="text-base">COFC/Rate/{plot.plotNumber}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center items-center py-6">
          <PrimaryButtonLink to={AppLinks.SearchCouncilPlot(ValuationType.Residential)}>Search Plots</PrimaryButtonLink>
        </div>
      </CenteredView>
    </CenteredView>
  );
}
export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
