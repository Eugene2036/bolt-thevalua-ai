import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { Response, json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { InlineAlert } from '~/components/InlineAlert';
import { PrimaryButton } from '~/components/PrimaryButton';
import { Select } from '~/components/Select';
import { TextField } from '~/components/TextField';
import { prisma } from '~/db.server';
import { StatusCode, badRequest, getValidatedId, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields, hasFieldErrors, hasFields, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { createHashedPassword } from '~/models/user.server';
import { requireUserId } from '~/session.server';

export async function loader({ params }: LoaderArgs) {
  const id = getValidatedId(params.id);
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

  const userGroups = await prisma.userGroup.findMany({ where: { companyId: company?.UserGroup?.company.id } });

  console.log('User Groups: ', userGroups)

  const user = await prisma.user.findUnique({
    where: { id },
  });
  if (!user) {
    throw new Response('User record not found, please try again', {
      status: StatusCode.NotFound,
    });
  }
  return json({ user, userGroups });
}

const Schema = z
  .object({
    isSuper: z.coerce.boolean(),
    email: z.string().email().min(3),
    password: z.string(),
    passwordConfirmation: z.string(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string(),
    isVerified: z.coerce.boolean(),
    isSignatory: z.coerce.boolean().default(false),
    userGroupId: z.string(),
  })
  .refine((arg) => arg.password === arg.passwordConfirmation, {
    message: "Passwords don't match",
    path: ['passwordConfirmation'],
  });
export async function action({ request, params }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  try {
    const id = getValidatedId(params.id);
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { email, password, firstName, lastName, isSuper, isVerified, isSignatory, phone, userGroupId } = result.data;

    await prisma.$transaction(async (tx) => {
      if (password) {
        await tx.password.updateMany({
          where: { userId: id },
          data: { hash: await createHashedPassword(password) },
        });
      }
      const records = await tx.password.findMany({
        where: { userId: id },
      });
      for (let record of records) {
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Password,
            action: EventAction.Update,
            recordId: record.userId,
            recordData: JSON.stringify(record),
          },
        });
      }
      const updated = await tx.user.update({
        where: { id },
        data: {
          email,
          firstName,
          lastName,
          isSuper,
          phone,
          isVerified,
          isSignatory,
          userGroupId,
        },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.User,
          action: EventAction.Update,
          recordId: updated.id,
          recordData: JSON.stringify(updated),
        },
      });
    });

    return redirect(AppLinks.Users);
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}

export default function EditUserPage() {
  const { user, userGroups } = useLoaderData<typeof loader>();

  const fetcher = useFetcher<typeof action>();
  const { isProcessing, getNameProp } = useForm(fetcher, Schema);

  const defaultValues: Record<keyof z.infer<typeof Schema>, string> = {
    email: user.email,
    password: '',
    passwordConfirmation: '',
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    isSuper: user.isSuper.toString(),
    isVerified: user.isVerified.toString(),
    isSignatory: user.isSignatory.toString(),
    userGroupId: user.userGroupId || '',
  };

  return (
    <div className="flex flex-col items-center h-full gap-6 py-8">
      <span className="text-xl font-semibold">Edit User Details</span>
      <fetcher.Form method="post" className="flex flex-col items-stretch w-[60%]">
        <ActionContextProvider {...fetcher.data} fields={hasFields(fetcher.data) ? fetcher.data.fields : defaultValues} isSubmitting={isProcessing}>
          <div className="grid grid-cols-2 gap-6 py-4">
            <TextField
              {...getNameProp('firstName')}
              defaultValue={user.firstName}
              label="First Name"
              errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['firstName'] : undefined}
            />
            <TextField
              {...getNameProp('lastName')}
              defaultValue={user.lastName}
              label="Last Name"
              errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['lastName'] : undefined}
            />
            <TextField {...getNameProp('phone')} defaultValue={user.phone} label="Phone" errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['phone'] : undefined} />

            <TextField
              {...getNameProp('email')}
              defaultValue={user.email}
              label="Email"
              type="email"
              errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['email'] : undefined}
            />
            <TextField {...getNameProp('password')} label="Password" type="password" />
            <TextField
              {...getNameProp('passwordConfirmation')}
              label="Re-Enter Password"
              type="password"
              errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['passwordConfirmation'] : undefined}
            />
            {user.isSuper === true ? (
              <Select
                {...getNameProp('isSuper')}
                defaultValue={user.isSuper.toString()}
                label="User Type"
                errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['isSuper'] : undefined}
              >
                <option value={''}>Normal User</option>
                <option value={'true'}>Super User</option>
              </Select>
            ) : (
              <Select
                {...getNameProp('isSuper')}
                defaultValue={user.isSuper.toString()}
                label="User Type"
                errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['isSuper'] : undefined}
              >
                <option value={''}>Normal User</option>
              </Select>
            )}
            <Select
              {...getNameProp('userGroupId')}
              defaultValue={user.userGroupId || ''}
              label="Select User Group"
              errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['userGroupId'] : undefined}
            >
              {userGroups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
            <Select
              {...getNameProp('isVerified')}
              defaultValue={user.isVerified.toString()}
              label="Verified?"
              errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['isVerified'] : undefined}
            >
              <option value={''}>Not Verified</option>
              <option value={'true'}>Verified</option>
            </Select>
            <Select
              {...getNameProp('isSignatory')}
              defaultValue={user.isSignatory.toString()}
              label="Is Signatory?"
              errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['isSignatory'] : undefined}
            >
              <option value={''}>No</option>
              <option value={'true'}>Yes</option>
            </Select>
            {hasFormError(fetcher.data) && (
              <div className="flex flex-col items-stretch py-4">
                <InlineAlert>{fetcher.data.formError}</InlineAlert>
              </div>
            )}
          </div>
          <div className="flex flex-col items-stretch py-4">
            <PrimaryButton type="submit" disabled={isProcessing}>
              {isProcessing ? 'Updating User...' : 'Update User'}
            </PrimaryButton>
          </div>
        </ActionContextProvider>
      </fetcher.Form>
    </div>
  );
}
