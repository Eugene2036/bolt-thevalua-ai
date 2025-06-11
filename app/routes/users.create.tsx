import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { FormPhoneNumberTextField } from '~/components/FormPhoneNumberTextField';
import { FormTextField } from '~/components/FormTextField';
import { InlineAlert } from '~/components/InlineAlert';
import { PrimaryButton } from '~/components/PrimaryButton';
import { Select } from '~/components/Select';
import { prisma } from '~/db.server';
import { badRequest, getValidatedId, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { createUser } from '~/models/user.server';
import { requireUserId } from '~/session.server';

export async function loader({ params, request }: LoaderArgs) {
  const currentUserId = await requireUserId(request);
  console.log('uId:', currentUserId)
  const id = getValidatedId(currentUserId);
  const company = await prisma.user.findUnique({
    where: { id: id },
    include: {
      UserGroup: {
        include: {
          company: {
            select: {
              id: true,
              CompanyName: true,
            }
          }
        },
      },
    },
  });
  const user = await prisma.user.findUnique({
    where: { id: currentUserId },
  });

  const userGroups = await prisma.userGroup.findMany({ where: { companyId: company?.UserGroup?.company.id } });
  const firm = company?.UserGroup?.company.CompanyName;

  console.log("Firm:", firm)

  return json({ user, userGroups, firm });
}

const Schema = z
  .object({
    email: z.string().min(1, "Email is required").email("Invalid email format"),
    emailConfirmation: z.string().min(1, "Email confirmation is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phone: z.string().optional(),
    isSuper: z.coerce.boolean(),
    isSignatory: z.coerce.boolean(),
    userGroupId: z.string().min(1, "User group is required"),
    firm: z.string().min(1, "Company is required"),
  })
  .refine((arg) => arg.email === arg.emailConfirmation, {
    message: "Email addresses don't match",
    path: ['emailConfirmation'],
  });

export async function action({ request }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  try {
    const fields = await getRawFormFields(request);
    console.log('Form Fields:', fields);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }

    const { emailConfirmation, isSuper, ...restOfData } = result.data;
    const userCreated = await createUser({ ...restOfData, isSuper, isVerified: isSuper, emailConfirmation }, currentUserId);
    if (!userCreated) {
      return badRequest({ formError: 'User creation failed, please try again' });
    }
    toast.success('User created successfully');
    return redirect(AppLinks.Users);
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}

export default function CreateUserPage() {
  const fetcher = useFetcher<typeof action>();
  const { isProcessing, getNameProp } = useForm(fetcher, Schema);
  const { userGroups, user, firm } = useLoaderData<typeof loader>();

  const [isSignatory, setIsSignatory] = useState(false);
  const [phone, setPhone] = useState('');

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <span className="text-xl font-semibold">Create New User</span>
      <fetcher.Form method="post" className="flex flex-col items-stretch w-[80%] gap-4">
        <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
          <div className="grid grid-cols-2 gap-6 pb-6">
            <input type="hidden" {...getNameProp('firm')} required value={firm} />
            <FormTextField
              {...getNameProp('firstName')}
              label="First Name"
              errors={fetcher.data?.fieldErrors?.firstName}
            />
            <FormTextField
              {...getNameProp('lastName')}
              label="Last Name"
              errors={fetcher.data?.fieldErrors?.lastName}
            />
            <FormTextField
              {...getNameProp('email')}
              label="Email"
              type="email"
              errors={fetcher.data?.fieldErrors?.email}
            />

            <FormTextField
              {...getNameProp('emailConfirmation')}
              label="Confirm Email"
              type="email"
              errors={fetcher.data?.fieldErrors?.emailConfirmation}
            />
            <FormPhoneNumberTextField
              name=""
              label="Phone (optional)"
              value={phone}
              onChange={(phone) => setPhone(phone)}
              defaultCountry="BW"
              required
            />
            <Select

              {...getNameProp('userGroupId')}
              label="Select User Group"
              errors={fetcher.data?.fieldErrors?.userGroupId}
            >
              {userGroups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>

            {user?.isSuper === true ? (
              <Select

                {...getNameProp('isSuper')}
                label="User Type"
                errors={fetcher.data?.fieldErrors?.isSuper}
              >
                <option value="">Normal User</option>
                <option value="true">Super User</option>
              </Select>
            ) : (
              <Select
                {...getNameProp('isSuper')}
                name="isSuper"
                id="isSuper"
                label="User Type"
                errors={fetcher.data?.fieldErrors?.isSuper}
              >
                <option value="">Normal User</option>
              </Select>
            )}

            <Select
              {...getNameProp('isSignatory')}
              label="Is Signatory?"
              errors={fetcher.data?.fieldErrors?.isSignatory}
            >
              <option value="">No</option>
              <option value="true">Yes</option>
            </Select>
          </div>
          {hasFormError(fetcher.data) && (
            <div className="flex flex-col items-stretch py-4">
              <InlineAlert>{fetcher.data.formError}</InlineAlert>
            </div>
          )}
          <div className="flex flex-col items-stretch py-4">
            <Toaster />
            <PrimaryButton type="submit" disabled={isProcessing}>
              {isProcessing ? 'Creating User...' : 'Create User'}
            </PrimaryButton>
          </div>
        </ActionContextProvider>
      </fetcher.Form>
    </div>
  );
}