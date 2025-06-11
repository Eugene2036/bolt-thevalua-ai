import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { ChangeEvent, ComponentProps } from 'react';

import { json } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { PrimaryButton } from '~/components/PrimaryButton';
import { TableCell } from '~/components/TableCell';
import { TableHeading } from '~/components/TableHeading';
import { TextField } from '~/components/TextField';
import { prisma } from '~/db.server';
import { badRequest, getFullName, hasSuccess, preprocessJSON, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields } from '~/models/forms';
import { requireUser, requireUserId } from '~/session.server';

export async function loader({ request }: LoaderArgs) {
  const userId = await requireUserId(request);

  // First, get the logged-in user's company ID
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      UserGroup: {
        select: {
          companyId: true,
        },
      },
    },
  });

  if (!currentUser || !currentUser.UserGroup) {
    throw new Response("User or company not found", { status: 404 });
  }

  const companyId = currentUser.UserGroup.companyId;

  if (currentUser.isSignatory === true) {
    // Then get all users in the same company
    const users = await prisma.user.findMany({
      where: {
        UserGroup: {
          companyId: companyId,
        },
        isSuspended: false,
      },
      include: {
        UserGroup: {
          include: {
            company: {
              select: {
                CompanyName: true,
              },
            },
          },
        },
      },
    });

    return json({ users });
  } else if (currentUser.isSuper === true) {
    // If the user is a super user, get all users
    const users = await prisma.user.findMany({
      where: { isSuspended: false },
      include: {
        UserGroup: {
          include: {
            company: {
              select: {
                CompanyName: true,
              },
            },
          },
        },
      },
    });

    return json({ users });
  }
  // const users = await prisma.user.findMany({
  //   where: { isSuspended: false },
  // });
  // return json({ users });
}

const UsersSchema = z.object({ id: z.string(), target: z.number().int() }).array();
const Schema = z.object({
  users: preprocessJSON(UsersSchema),
});
export async function action({ request }: ActionArgs) {
  const currentUser = await requireUser(request);
  try {
    if (!currentUser.isSuper) {
      throw new Error("You're not authorised to set valuer targets");
    }
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { users } = result.data;

    await Promise.all(
      users.map((user) => {
        return prisma.user.update({
          where: { id: user.id },
          data: { target: user.target },
        });
      }),
    );

    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}

export default function UsersSetTargets() {
  const { users: initUsers } = useLoaderData<{ users: Array<{ id: string; firstName: string; lastName: string; email: string; target: number }> }>();
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const [users, setUsers] = useState<(z.infer<typeof UsersSchema>[number] & { username: string })[]>(
    initUsers.map((user) => ({
      id: user.id,
      username: getFullName(user.firstName, user.lastName) || user.email,
      target: user.target,
    })),
  );

  function handleTargetChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const newValue = event.currentTarget.value;
    const result = z.coerce.number().safeParse(newValue);
    if (result.success) {
      setUsers((prev) => {
        const copy = [...prev];
        copy[index].target = result.data;
        return copy;
      });
    }
  }

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      const result = toast.success('Changes saved');
      console.log('result', result);
    }
  }, [fetcher.data]);

  const targetTotal = users.reduce((acc, user) => acc + user.target, 0);

  return (
    <div className="flex flex-col items-center justify-start h-full gap-6 py-8">
      <fetcher.Form method="post" className="flex flex-col items-stretch gap-6 w-full md:w-[60%] lg:w-[40%]">
        <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
          <input type="hidden" {...getNameProp('users')} value={JSON.stringify(users)} />
          <div className="flex flex-row items-center gap-2">
            <h1>Set Valuation Targets</h1>
            <div className="grow" />
            <div className="bg-stone-100 rounded-xl px-4 py-1">
              <span className="text-stone-800 font-light">
                Target Total: <b>{targetTotal.toLocaleString()}</b>
              </span>
            </div>
          </div>
          <table>
            <thead>
              <CustomTableHeading className="w-1/2">Valuer</CustomTableHeading>
              <CustomTableHeading>Target</CustomTableHeading>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    <TextField value={user.target} onChange={(e) => handleTargetChange(index, e)} type="number" isCamo required />
                  </TableCell>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <TableCell colSpan={2}>No users found</TableCell>
                </tr>
              )}
            </tbody>
          </table>
          <div className="flex flex-col items-start py-4">
            <PrimaryButton type="submit" disabled={isProcessing}>
              {isProcessing ? 'Saving...' : 'Save Targets'}
            </PrimaryButton>
          </div>
        </ActionContextProvider>
      </fetcher.Form>
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}

export function CustomTableHeading(props: ComponentProps<typeof TableHeading>) {
  const { className, ...rest } = props;
  return <TableHeading className={twMerge('bg-stone-400 rounded-t overflow-hidden', className)} {...rest} />;
}
