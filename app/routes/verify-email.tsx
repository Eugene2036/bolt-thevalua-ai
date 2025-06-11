import { json, type LoaderArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import { BoundaryError, ContactSupport, createPrefilledMessage, RouteErrorBoundary } from '~/components/Boundaries';
import { PrimaryButtonLink } from '~/components/PrimaryButton';
import { prisma } from '~/db.server';
import { getQueryParams, hasSuccess } from '~/models/core.validations';
import { EventAction, EventDomain } from '~/models/events';
import { AppLinks } from '~/models/links';

const Schema = z.object({
  token: z.string().max(255),
});
export async function loader({ request }: LoaderArgs) {
  const queryParams = getQueryParams(request.url, ['token']);
  const result = Schema.safeParse(queryParams);
  if (!result.success) {
    return json({ errorMessage: 'Invalid verification token provided' });
  }
  const { token } = result.data;

  const user = await prisma.user.findFirst({
    where: { verToken: token },
    select: { id: true },
  });
  if (!user) {
    return json({ errorMessage: 'Invalid verification token provided' });
  }

  console.log('Updating verified status of', user.id, '...');
  await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: user.id },
      data: { isVerified: true, verToken: '' },
    });
    await tx.event.create({
      data: {
        userId: user.id,
        domain: EventDomain.User,
        action: EventAction.Update,
        recordId: user.id,
        recordData: JSON.stringify(updated),
      },
    });
  });
  console.log('Updated verified status of', user.id);

  return json({ success: true });
}

export default function VerifyEmail() {
  const loaderData = useLoaderData<typeof loader>();

  if (hasSuccess(loaderData)) {
    return (
      <div className="flex flex-col justify-center items-center">
        <BoundaryError success title="Verification Successful!">
          <span className="text-center font-light leading-8 text-stone-600">Successfully verified your account! Please log in to use the system</span>
          <PrimaryButtonLink to={AppLinks.Login}>Log In</PrimaryButtonLink>
        </BoundaryError>
      </div>
    );
  }
  return (
    <div className="flex flex-col justify-center items-center">
      <BoundaryError title="Failed To Verify Account">
        <span className="text-center font-light leading-8 text-stone-600">Verification has failed with the following error message: {loaderData.errorMessage}.</span>
        <span className="text-center leading-8 text-stone-600/50">
          Please try verifying again from your email. <br />
          If the issue persists,&nbsp;
          <ContactSupport preFilledMessage={createPrefilledMessage(loaderData.errorMessage)} />
        </span>
      </BoundaryError>
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
