import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { prisma } from "~/db.server";


export const loader: LoaderFunction = async ({ request }) => {
    try {
        const url = new URL(request.url);
        const propertyType = url.searchParams.get("propertyType") || undefined;
        const location = url.searchParams.get("location") || undefined;
        const plotExtent = url.searchParams.get("plotExtent") ? Number(url.searchParams.get("plotExtent")) : undefined;

        const comparables = await prisma.comparablePlot.findMany({
            where: {
                transactionDate: {
                    gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
                },
                propertyType,
                location,
                ...(plotExtent && {
                    plotExtent: {
                        gte: plotExtent * 0.9, // Minimum 90% of the given plotExtent
                        lte: plotExtent * 1.1, // Maximum 110% of the given plotExtent
                    },
                }),
            },
            include: {
                comparableImage: true,
            },
            orderBy: {
                transactionDate: "desc",
            },
        });

        // Check if no records were found
        if (comparables.length === 0) {
            return json(
                { message: "No comparable properties found matching the selected criteria." },
                { status: 404 }
            );
        }

        // Transform the data to match the frontend expectations
        const transformedComparables = comparables.map((record) => ({
            id: record.id,
            plotNumber: record.plotNumber,
            plotExtent: Number(record.plotExtent),
            propertyType: record.propertyType,
            location: record.location,
            suburb: record.suburb,
            price: Number(record.price),
            transactionDate: record.transactionDate.toISOString(),
            plotDesc: record.plotDesc,
            titleDeed: record.titleDeed,
            numAirCons: record.numAirCons,
            numParkingBays: record.numParkingBays,
            numOfStructures: record.numOfStructures,
            numToilets: record.numToilets,
            numStorerooms: record.numStorerooms,
            numBathrooms: record.numBathrooms,
            swimmingPool: record.swimmingPool,
            paving: record.paving,
            boundary: record.boundary,
            garageType: record.garageType,
            kitchen: record.kitchen,
            wardrobe: record.wardrobe,
            roofModel: record.roofModel,
            ceiling: record.ceiling,
            interiorWallFinish: record.interiorWallFinish,
            imageIds: record.comparableImage.map((img) => img.imageId),
            longitude: record.longitude?.toString() || null,
            latitude: record.latitude?.toString() || null,
        }));

        return json(transformedComparables, {
            headers: {
                "Cache-Control": "public, max-age=3600", // Cache for 1 hour
            },
        });
    } catch (error) {
        console.error("Failed to fetch comparable properties:", error);
        return json(
            { error: "Failed to fetch comparable properties" },
            { status: 500 }
        );
    }
};