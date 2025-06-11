import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { prisma } from "~/db.server";

export const loader: LoaderFunction = async ({ params }) => {
    const plotId = params.plotId;

    if (!plotId) {
        return json({ error: "Plot ID required" }, { status: 400 });
    }

    try {
        const plot = await prisma.plot.findUnique({
            where: { id: plotId },
            include: {
                // Existing includes
                plotAndComparables: {
                    include: {
                        comparablePlot: {
                            include: {
                                comparableImage: true
                            }
                        }
                    }
                },

                // New includes for additional tables
                tenants: {
                    include: {
                        propertyType: true
                    }
                },
                insuranceRecords: {
                    include: {
                        item: true,
                        roofType: true,
                        constructionProp: true
                    }
                },
                outgoingRecords: true,
                parkingRecords: {
                    include: {
                        parkingType: true
                    }
                },
                clients: true,
                valuers: true,
                storedValues: true,
                SavedConfig: true,
                grcRecords: {
                    include: {
                        constructionProp: true
                    }
                },
                grcFeeRecords: true,
                grcDeprRecords: true,
                mvRecords: true,
                images: true,
                company: true,
                user: true,
                valuedBy: true,
                reviewedBy: true,
                reportTemplate: true,
                sections: {
                    include: {
                        subSections: true
                    }
                },
                ValuationsHistory: true
            }
        });

        if (!plot) {
            return json({ error: "Plot not found" }, { status: 404 });
        }

        // Get additional related data that isn't directly related to Plot
        const constructionProps = await prisma.constructionProp.findMany({
            where: {
                OR: [
                    { id: { in: plot.insuranceRecords.map(i => i.constructionPropId).filter(Boolean) } },
                    { id: { in: plot.grcRecords.map(g => g.constructionPropId).filter(Boolean) } }
                ]
            },
            include: {
                items: true
            }
        });

        const yearRangeValues = await prisma.yearRangeValue.findMany();
        const suburbs = await prisma.suburb.findMany();

        const comparablePlots = plot.plotAndComparables.map(pc => pc.comparablePlot);

        return json({
            plot,
            comparablePlots,
            constructionProps,
            yearRangeValues,
            suburbs
        });

    } catch (error) {
        console.error("Failed to fetch plot context:", error);
        return json({ error: "Server error" }, { status: 500 });
    }
};

// import { json } from "@remix-run/node";
// import type { LoaderFunction } from "@remix-run/node";
// import { prisma } from "~/db.server";

// export const loader: LoaderFunction = async ({ params }) => {
//     const plotId = params.plotId;

//     if (!plotId) {
//         return json({ error: "Plot ID required" }, { status: 400 });
//     }

//     try {
//         const plot = await prisma.plot.findUnique({
//             where: { id: plotId },
//             include: {
//                 plotAndComparables: {
//                     include: {
//                         comparablePlot: true
//                     }
//                 }
//             }
//         });

//         if (!plot) {
//             return json({ error: "Plot not found" }, { status: 404 });
//         }

//         const comparablePlots = plot.plotAndComparables.map(pc => pc.comparablePlot);

//         return json({
//             plot,
//             comparablePlots
//         });

//     } catch (error) {
//         console.error("Failed to fetch plot context:", error);
//         return json({ error: "Server error" }, { status: 500 });
//     }
// };

