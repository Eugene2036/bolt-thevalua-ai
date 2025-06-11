// app/routes/api.plot-ai-analyses.ts
import { json } from "@remix-run/node";
import { prisma } from "~/db.server";
import type { LoaderFunction } from "@remix-run/node";

export const loader: LoaderFunction = async ({ request }) => {
    const url = new URL(request.url);
    const plotId = url.searchParams.get("plotId");

    if (!plotId) {
        return json({ error: "Plot ID is required" }, { status: 400 });
    }

    try {
        const analyses = await prisma.plotAiAnalysis.findMany({
            where: { plotId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                query: true,
                analysis: true,
                createdAt: true,
            },
        });

        return json(analyses);
    } catch (error) {
        console.error("Failed to fetch AI analyses:", error);
        return json({ error: "Failed to fetch analyses" }, { status: 500 });
    }
};