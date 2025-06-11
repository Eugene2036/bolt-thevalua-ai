import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { FormEvent } from 'react';

import { json } from '@remix-run/node';
import { Link, useFetcher, useLoaderData } from '@remix-run/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import { useForm } from '~/components/ActionContextProvider';
import { EmptyList } from '~/components/EmptyList';
import { PrimaryButtonLink } from '~/components/PrimaryButton';
import { SecondaryButton } from '~/components/SecondaryButton';
import { prisma } from '~/db.server';
import { badRequest, hasSuccess, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';

type Company = {
  CompanyName: string;
};

type UserGroup = {
  company: Company;
};

type User = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  isSuper: boolean;
  isSuspended: boolean;
  isBanker: boolean;
  isSignatory: boolean;
  UserGroup: UserGroup[];
};

type LoaderData = {
  users: User[];
};

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
}

const Schema = z.object({
  id: z.string(),
  intent: z.string(),
});
export async function action({ request }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  try {
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { id, intent } = result.data;

    const user = await prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new Error('User record not found');
    }

    if (intent === 'suspend') {
      console.log('Handling suspend intent');
      await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { isSuspended: !user.isSuspended },
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
      console.log('toggled isSuspensed to', !user.isSuspended);
      return json({ success: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.delete({
        where: { id },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.User,
          action: EventAction.Delete,
          recordId: user.id,
          recordData: JSON.stringify(user),
        },
      });
    });

    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}

export default function PlotIndexPage() {
  const { users } = useLoaderData<typeof loader>() as unknown as LoaderData;

  return (
    <div className="flex flex-col items-center justify-start h-full gap-6 py-8">
      <div className="flex flex-col items-stretch min-w-[65%] gap-4">
        <div className="flex flex-row items-center">
          <div className="flex flex-col justify-center items-center px-4">
            <span className="text-xl font-semibold">{users.length} user(s)</span>
          </div>
          <Link to={AppLinks.SetTargets} className="text-teal-600 hover:underline">
            Set Valuer Targets
          </Link>
          <div className="grow" />
          <div className="flex flex-col justify-center items-center px-6">
            <Link to={AppLinks.CreateUser} className="text-teal-600 hover:underline">
              Create New User
            </Link>
          </div>
        </div>
        {users.map((user) => (
          <UserListItem
            key={user.id}
            id={user.id}
            firstName={user.firstName}
            lastName={user.lastName}
            email={user.email}
            isSuper={user.isSuper}
            isSuspended={user.isSuspended}
            isBanker={user.isBanker}
            isSignatory={user.isSignatory}
            companyName={user.UserGroup.length > 0 ? user.UserGroup[0].company.CompanyName : undefined}
          />
        ))}
        {!users.length && <EmptyList>No users found</EmptyList>}
      </div>
    </div>
  );
}

interface UserListItemProps {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  isSuper: boolean;
  isSuspended: boolean;
  isBanker: boolean;
  isSignatory: boolean;
  companyName?: string;
}
function UserListItem(props: UserListItemProps) {
  const { id, firstName, lastName, email, isSuper, isSuspended, isBanker, isSignatory, companyName } = props;

  const fetcher = useFetcher<typeof action>();
  const { isProcessing, getNameProp } = useForm(fetcher, Schema);

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      toast('Updated successfully');
    }
  }, [fetcher.data]);

  const fullName = [firstName, lastName].filter((el) => el).join(' ') || email;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = window.confirm('Are You Sure?');
    if (result) {
      fetcher.submit(event.currentTarget);
    }
  }

  return (
    <div hidden={hasSuccess(fetcher.data)} key={id} className="flex flex-row gap-2 p-4 rounded-lg bg-stone-100">
      <div className="flex flex-col justify-center">
        <span className="text-base font-semibold text-black">{fullName}</span>
        <span className="text-sm font-light text-stone-600">
          {/* {companyName || 'No Company'} - */}
          {isSuper ? ' Super-user' : ''}
          {isBanker ? ' Banker' : ''}
          {isSignatory ? ' Signatory' : ''}
          {isSuspended ? ' Suspended' : ''}
        </span>
      </div>
      <div className="grow" />
      <PrimaryButtonLink to={AppLinks.EditUser(id)}>Edit Details</PrimaryButtonLink>
      <fetcher.Form method="post" onSubmit={handleSubmit}>
        <input type="hidden" {...getNameProp('id')} value={id} />
        <input type="hidden" {...getNameProp('intent')} value="suspend" />
        <SecondaryButton type="submit" disabled={isProcessing} className={twMerge('text-orange-600 border border-orange-600', isSuspended && 'text-blue-600 border-blue-600')}>
          {isSuspended ? 'Reactivate' : 'Suspend'}
        </SecondaryButton>
      </fetcher.Form>
      <fetcher.Form method="post" onSubmit={handleSubmit}>
        <input type="hidden" {...getNameProp('id')} value={id} />
        <input type="hidden" {...getNameProp('intent')} value="delete" />
        <SecondaryButton type="submit" disabled={isProcessing} className="text-red-600 border border-red-600">
          Delete
        </SecondaryButton>
      </fetcher.Form>
    </div>
  );
}