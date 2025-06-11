import { RemixBrowser, useLocation, useMatches } from '@remix-run/react';
import * as Sentry from '@sentry/remix';
import { startTransition, StrictMode, useEffect } from 'react';
import { hydrateRoot } from 'react-dom/client';

Sentry.init({
  dsn: process.env.NODE_ENV === "production" ? "https://16c21a5b6cefc575b752986d997e7ac5@o4507629035454464.ingest.us.sentry.io/4507629046595584" : "",
  // dsn: 'https://16c21a5b6cefc575b752986d997e7ac5@o4507629035454464.ingest.us.sentry.io/4507629046595584',
  tracesSampleRate: 1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,

  // tracePropagationTargets: ['localhost', /^https:\/\/yourserver\.io\/api/],

  integrations: [
    Sentry.browserTracingIntegration({
      useEffect,
      useLocation,
      useMatches,
    }),
    Sentry.replayIntegration(),
  ],
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>,
  );
});
