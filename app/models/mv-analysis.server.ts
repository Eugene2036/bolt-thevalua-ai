import { prisma } from '~/db.server';
import { getValidatedId } from '~/models/core.validations';
import { StoredValueId } from '~/models/storedValuest';

export async function getMVAnalysisData(plotId: string) {
  const plot = await prisma.plot.findUnique({
    where: { id: getValidatedId(plotId) },
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
      storedValues: { select: { id: true, identifier: true, value: true } },
      grcRecords: { select: { id: true } },
      mvRecords: true,
      longitude: true,
      latitude: true,
    },
  });

  if (!plot) {
    throw new Error('Plot not found');
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
    transactionDate: record.transactionDate
      ? new Date(record.transactionDate).toLocaleDateString('en-GB') // DD/MM/YYYY
        .replace(/\//g, '-') // DD-MM-YYYY
      : '',
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

  const avgPrice = comparables.length
    ? comparables.reduce((acc, comparable) => acc + comparable.price, 0) / comparables.length
    : 0;

  function getStoredValue(identifier: string) {
    if (!plot || !plot.storedValues) return undefined;
    const match = plot.storedValues.find((el) => el.identifier === identifier);
    return match ? { ...match, value: Number(match.value) } : undefined;
  }

  const landRate = getStoredValue(StoredValueId.LandRate);
  const buildRate = getStoredValue(StoredValueId.BuildRate);
  const perculiar = getStoredValue(StoredValueId.Perculiar);

  return {
    avgPrice,
    plot,
    comparables,
    storedValues: { landRate, buildRate, perculiar },
    plotAiAnalysisData,
  };
}