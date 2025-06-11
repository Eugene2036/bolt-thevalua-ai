import type { LinksFunction, LoaderArgs } from "@remix-run/node";

import { Cloudinary } from "@cloudinary/url-gen";
import { cssBundleHref } from "@remix-run/css-bundle";
import { json } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { withSentry, captureRemixErrorBoundaryError } from "@sentry/remix";
import { useMemo } from "react";
import { Toaster } from "sonner";

import { getUser } from "~/session.server";
import stylesheet from "~/tailwind.css";

import { CustomRootBoundaryError } from "./components/Boundaries";
import { CloudinaryContextProvider } from "./components/CloudinaryContextProvider";
import { getErrorMessage } from "./models/errors";

import reportWebVitals from 'reportWebVitals';

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;500;600;700&display=swap",
  },
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
];

export const loader = async ({ request }: LoaderArgs) => {
  const user = await getUser(request);
  try {
    const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
    const UPLOAD_RESET = process.env.CLOUDINARY_UPLOAD_RESET || "";
    return json({ user, CLOUD_NAME, UPLOAD_RESET });
  } catch (error) {
    throw new Response(getErrorMessage(error), { status: 500 });
  }
};

// export default function App() {
function App() {
  const { CLOUD_NAME, UPLOAD_RESET } = useLoaderData<typeof loader>();

  const CloudinaryUtil = useMemo(() => {
    return new Cloudinary({ cloud: { cloudName: CLOUD_NAME } });
  }, [CLOUD_NAME]);

  return (
    <html lang="en" className="h-full bg-white">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body
        className="h-full"
        style={{ fontFamily: '"Poppins", sans-serif !important' }}
      >
        <CloudinaryContextProvider
          CLOUDINARY_CLOUD_NAME={CLOUD_NAME}
          CLOUDINARY_UPLOAD_RESET={UPLOAD_RESET}
          CloudinaryUtil={CloudinaryUtil}
        >
          <Outlet />
          <Toaster />
        </CloudinaryContextProvider>
        <Toaster />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
        <a
          className="text-sm font-light text-stone-600/80 invisible"
          href="https://thevalua.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Developed By Eugene Maraura
        </a>
        <div
          className="cf-turnstile"
          data-sitekey="0x4AAAAAABDfNmJsW5wCMjbA"
          data-callback="javascriptCallback"
        ></div>
      </body>
    </html>
  );
}

export default withSentry(App);

export function ErrorBoundary({ error }: { error: Error }) {
  console.error("error", error);

  // const error = useRouteError();

  captureRemixErrorBoundaryError(error);

  reportWebVitals();

  return (
    <html lang="en" className="h-full">
      <head>
        <title>Something went wrong</title>
        <Meta />
        <Links />
      </head>
      <body
        className="h-full"
        style={{
          fontFamily: "'Montserrat', sans-serif",
          backgroundColor: "#e1e1e1",
        }}
      >
        <CustomRootBoundaryError error={error} />
        <Scripts />
      </body>
    </html>
  );
}
