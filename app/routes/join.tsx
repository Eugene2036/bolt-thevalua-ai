import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { json } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { FormTextField } from '~/components/FormTextField';
import { InlineAlert } from '~/components/InlineAlert';
import { PrimaryButton } from '~/components/PrimaryButton';
import { SecondaryButtonLink } from '~/components/SecondaryButton';
import { badRequest, processBadRequest } from '~/models/core.validations';
import { getRawFormFields, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { createUser, getUserByEmail } from '~/models/user.server';
import { createUserSession, getUserId } from '~/session.server';

export const loader = async ({ request }: LoaderArgs) => {
  await getUserId(request);
  return json({});
};

const Schema = z
  .object({
    email: z.string().email().min(4).max(50),
    password: z.string().min(1).max(200),
    passwordConfirmation: z.string().min(1).max(200),
  })
  .refine((arg) => arg.password === arg.passwordConfirmation, {
    message: "Passwords don't match",
    path: ['passwordConfirmation'],
  });
export const action = async ({ request }: ActionArgs) => {
  const currentUserId = await getUserId(request);
  const fields = await getRawFormFields(request);
  const result = Schema.safeParse(fields);
  if (!result.success) {
    return processBadRequest(result.error, fields);
  }
  const { email, password } = result.data;

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return badRequest({ fieldErrors: { email: ['Email already in use'] } });
  }

  const user = await createUser(
    {
      email,
      password,
      firstName: '',
      lastName: '',
      isSuper: false,
      isVerified: false,
    },
    currentUserId || '',
  );

  return createUserSession({
    redirectTo: '/',
    remember: false,
    request,
    userId: user.id,
  });
};

export default function Join() {
  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  return (
    <div className="flex min-h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-md px-8">
        <fetcher.Form method="post" className="flex flex-col items-stretch gap-6">
          <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
            <div className="flex flex-col justify-center items-center">
              <h1 className="text-2xl font-semibold">Valua</h1>
            </div>
            <FormTextField {...getNameProp('email')} type="email" label="Email" required />
            <FormTextField {...getNameProp('password')} type="password" label="Passsword" required />
            <FormTextField {...getNameProp('passwordConfirmation')} type="password" label="Re-Enter Passsword" required />
            {hasFormError(fetcher.data) && <InlineAlert>{fetcher.data.formError}</InlineAlert>}
            <div className="flex flex-col items-stretch py-2 gap-6">
              <PrimaryButton type="submit">{isProcessing ? 'Creating Account...' : 'Create Account'}</PrimaryButton>
              <SecondaryButtonLink to={AppLinks.Login}>Already have an account</SecondaryButtonLink>
            </div>
          </ActionContextProvider>
        </fetcher.Form>
      </div>
    </div>
  );
}
