import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { ImagesCarouselESRI } from "~/components/ImagesCarouselESRI";

export const action: ActionFunction = async ({ request }) => {
    // Handle form submissions if needed
    return json({});
};

export default function PropertyViewerRoute() {
    // Example data - replace with your actual data source
    const record = { plotNumber: "7102" };

    return (
        <div className="container mt-4">
            <h1>Property Viewer</h1>
            <ImagesCarouselESRI plotNumber={record.plotNumber} />
        </div>
    );
}