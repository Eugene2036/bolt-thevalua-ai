import type { ThrownResponse } from '@remix-run/react';
import { Text, VStack } from '@chakra-ui/react';
import { Link } from '@remix-run/react';
import { BoundaryError, ContactSupport, createPrefilledMessage } from '~/components/BoundaryError';
import { PrimaryButton } from './PrimaryButton';

interface Props {
  reload: () => void;
  caught: ThrownResponse<number, any>;
}

export function CustomCatchBoundary(props: Props) {
  const { reload, caught } = props;
  const errorMessage = caught.data.toString();
  switch (caught.status) {
    case 400: {
      return (
        <div className="flex flex-col items-center justify-center">
          <BoundaryError title="400 - Bad Request">
            {errorMessage && <span className="text-center font-light text-stone-600">"{errorMessage}"</span>}
            <span className="text-center font-light leading-8 text-stone-600">
              The system received a malformed or invalid request. <br />
              Please review your input and ensure it is valid. <br />
              If the issue persists,&nbsp;
              <ContactSupport preFilledMessage={createPrefilledMessage(errorMessage || 'Error 400 - Bad Request')} />
            </span>
            <PrimaryButton onClick={reload}>Reload</PrimaryButton>
          </BoundaryError>
        </div>
      );
    }
    case 401: {
      return (
        <BoundaryError title="401 - Unauthorised">
          <VStack spacing={4} py={2}>
            <Text fontSize="md">
              <code>{JSON.stringify(caught.data, null, 2)}</code>
            </Text>
            <Link to={`/login`}>
              <PrimaryButton className="w-full">Go To Log In Page</PrimaryButton>
            </Link>
          </VStack>
        </BoundaryError>
      );
    }
    case 403: {
      return (
        <BoundaryError title="403 - Forbidden">
          <VStack spacing={4} py={2}>
            <Text fontSize="md">
              <code>{JSON.stringify(caught.data, null, 2)}</code>
            </Text>
            <Link to={`/login`}>
              <PrimaryButton className="w-full">Go To Log In Page</PrimaryButton>
            </Link>
          </VStack>
        </BoundaryError>
      );
    }
    case 404: {
      return (
        <BoundaryError title="404 - Not Found">
          <VStack spacing={4} py={2}>
            <Text fontSize="md">
              <code>{JSON.stringify(caught.data, null, 2)}</code>
            </Text>
            <Link to={`/`}>
              <PrimaryButton className="w-full">Go To Home Page</PrimaryButton>
            </Link>
          </VStack>
        </BoundaryError>
      );
    }
    default: {
      throw new Error(`Unhandled error: ${caught.status}`);
    }
  }
}
