import * as Sentry from "@sentry/remix";

Sentry.init({
  dsn: "https://edfcdc5e6def63d86a87899ad8755f10@o4507629035454464.ingest.us.sentry.io/4508251459026944",
  tracesSampleRate: 1,
  autoInstrumentRemix: true,
});
