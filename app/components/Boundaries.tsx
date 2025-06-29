import { isRouteErrorResponse, useNavigate, useRouteError } from '@remix-run/react';
import { useCallback } from 'react';
import { AlertTriangle, Check } from 'tabler-icons-react';

import { getErrorMessage } from '~/models/errors';
import { AppLinks } from '~/models/links';

import { PrimaryButton, PrimaryButtonLink } from './PrimaryButton';

export function ContactSupport({ preFilledMessage }: { preFilledMessage: string }) {
  return (
    <a
      className="text-indigo-600 underline"
      href={`mailto:info@thevalua.com?subject=I've encountered a problem&body=${preFilledMessage}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      contact us via email
    </a>
  );
}

export function createPrefilledMessage(message: string) {
  return encodeURIComponent(`I've encountered the following error: ${message}`);
}

interface BoundaryErrorProps {
  title: string;
  children: React.ReactNode;
  success?: boolean;
}
export function BoundaryError(props: BoundaryErrorProps) {
  const { title, children, success } = props;
  return (
    <div className="flex flex-col items-stretch justify-center gap-6 rounded-md bg-white p-6 shadow-md">
      <div className="flex flex-col items-center justify-center gap-4">
        {success && <Check size={40} color="green" />}
        {!success && <AlertTriangle size={40} color="red" />}
        <h1 className="text-2xl font-semibold text-stone-600">{title}</h1>
      </div>
      <div className="flex flex-col items-stretch justify-center gap-6 text-center">{children}</div>
    </div>
  );
}
interface RouterCatchBoundaryProps {
  error: {
    status: number;
    data: any;
    statusText: string;
  };
}
function RouteCatchBoundary(props: RouterCatchBoundaryProps) {
  const { error } = props;

  const navigate = useNavigate();

  const reload = useCallback(() => {
    navigate('.', { replace: true });
  }, [navigate]);

  const errorMessage = typeof error.data === 'string' ? error.data : error.statusText;

  switch (error.status) {
    case 400: {
      return (
        <BoundaryError title="Error 400 - Bad Request">
          {errorMessage && <span className="text-center font-light text-stone-600">"{errorMessage}"</span>}
          <span className="text-center font-light leading-8 text-stone-600">
            The system received a malformed or invalid request. <br />
            Please review your input and ensure it is valid. <br />
            If the issue persists,&nbsp;
            <ContactSupport preFilledMessage={createPrefilledMessage(errorMessage || 'Error 400 - Bad Request')} />
          </span>
          <PrimaryButton onClick={reload}>Reload</PrimaryButton>
        </BoundaryError>
      );
    }
    case 401: {
      return (
        <BoundaryError title="Error 401 - Unauthorised">
          {errorMessage && <span className="text-center font-light text-stone-600">"{errorMessage}"</span>}
          <span className="text-center font-light leading-8 text-stone-600">
            You're not authorised to access this resource. <br />
            Please ensure you're logged in before requesting for this resource. <br />
            If the issue persists,&nbsp;
            <ContactSupport preFilledMessage={createPrefilledMessage(errorMessage || 'Error 401 - Unauthorised')} />
          </span>
          <PrimaryButtonLink to={AppLinks.Login}>Open Login Page</PrimaryButtonLink>
        </BoundaryError>
      );
    }
    case 403: {
      return (
        <BoundaryError title="Error 403 - Forbidden">
          {errorMessage && <span className="text-center font-light text-stone-600">"{errorMessage}"</span>}
          <span className="text-center font-light leading-8 text-stone-600">
            You don't have permission to access this resource. <br />
            If the issue persists,&nbsp;
            <ContactSupport preFilledMessage={createPrefilledMessage(errorMessage || 'Error 403 - Forbidden')} />
          </span>
          <PrimaryButtonLink to={AppLinks.Login}>Open Login Page</PrimaryButtonLink>
        </BoundaryError>
      );
    }
    case 404: {
      return (
        <BoundaryError title="Error 404 - Resource Not Found">
          <div className="flex flex-col items-stretch justify-start gap-4 px-6">
            {errorMessage && (
              <div className="flex flex-col items-center justify-center">
                <span className="text-center font-light text-stone-600">"{errorMessage}"</span>
              </div>
            )}
            <div className="flex flex-col items-stretch gap-2 pb-6 font-light text-stone-600">
              <div className="flex flex-col items-center justify-center">
                <span className="text-center">
                  The system couldn't find that resource. <br />
                </span>
              </div>
              <div className="flex flex-col items-start justify-start gap-4 py-2">
                <span className="text-base">This could've been because of any of the following:</span>
                <ul className="list-disc text-start">
                  <li>The resource has moved.</li>
                  <li>The resource no longer exists.</li>
                  <li>You entered a slighly wrong URL, try checking for typos.</li>
                </ul>
              </div>
              <span className="text-start">
                Please review the resource address and try again. <br />
                If the issue persists,&nbsp;
                <ContactSupport preFilledMessage={createPrefilledMessage(errorMessage || 'Error 404 - Resource Not Found')} />
              </span>
            </div>
          </div>
        </BoundaryError>
      );
    }
    default: {
      throw new Error(`Unhandled error: ${error.status}, ${error.statusText}`);
    }
  }
}
export function ErrorBoundary() {
  const navigate = useNavigate();
  const error = useRouteError();

  const reload = useCallback(() => {
    navigate('.', { replace: true });
  }, [navigate]);

  const errorMessage = getErrorMessage(error) || 'Something went wrong, please reload the page';

  console.log('error', error);

  if (isRouteErrorResponse(error)) {
    return <RouteCatchBoundary error={error} />;
  }

  return (
    <BoundaryError title="Error 500 - Internal Server Error">
      <span className="text-center leading-8 text-stone-600/50">
        The system encountered an unexpected error. <br />
        We're already working on fixing it. <br />
      </span>
      {errorMessage && (
        <span className="text-center font-bold text-stone-600/50">
          "{errorMessage}" <br />
        </span>
      )}
      <span className="text-center leading-8 text-stone-600/50">
        Please try reloading the page. <br />
        If the issue persists,&nbsp;
        <ContactSupport preFilledMessage={createPrefilledMessage(errorMessage)} />
      </span>
      <PrimaryButton onClick={reload}>Reload</PrimaryButton>
    </BoundaryError>
  );
}
export function RouteErrorBoundary() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="flex max-w-screen-md flex-col items-stretch p-6">
        <ErrorBoundary />
      </div>
    </div>
  );
}

export function CustomRootBoundaryError({ error }: { error: Error }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="space-y-2 rounded-lg bg-white p-6 shadow-md">
        <h1 className="text-xl font-bold">Error 500 - Internal Server Error</h1>
        <p>
          We encountered an unexpected error. We're already working on fixing it. <br />
          {error.message && (
            <div className="py-2 font-bold">
              Detail: "{error.message}" <br />
            </div>
          )}
          Please try reloading the page. <br />
          If the issue persists, <ContactSupport preFilledMessage={createPrefilledMessage(error.message || 'Error 500 - Internal Server Error')} />
        </p>
      </div>
    </div>
  );
}
