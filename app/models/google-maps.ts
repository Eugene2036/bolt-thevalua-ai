interface StaticMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  width?: number;
  height?: number;
  apiKey: string;
}
function getStaticMapUrl(props: StaticMapProps) {
  const { lat, lng, zoom = 14, width = 600, height = 400, apiKey } = props;

  const baseUrl = "https://maps.googleapis.com/maps/api/staticmap";
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: zoom.toString(),
    size: `${width}x${height}`,
    markers: `color:red|${lat},${lng}`,
    key: apiKey
  });
  return `${baseUrl}?${params.toString()}`;
}

interface FetchProps {
  lat: number;
  lng: number;
  zoom?: number;
  width?: number;
  height?: number;
  apiKey: string;
}
export async function fetchMapImageAsBase64(props: FetchProps) {
  const url = getStaticMapUrl(props);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch map image: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = response.headers.get("content-type") || "image/png";

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
