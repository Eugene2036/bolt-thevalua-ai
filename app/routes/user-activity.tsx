import type { ComponentProps } from 'react';

import { json, type LoaderArgs } from '@remix-run/node';
import { Form, useLoaderData, useNavigation } from '@remix-run/react';
import dayjs from 'dayjs';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { Card } from '~/components/Card';
import { CardHeader } from '~/components/CardHeader';
import { CenteredView } from '~/components/CenteredView';
import { PrimaryButton } from '~/components/PrimaryButton';
import { Select } from '~/components/Select';
import { TextField } from '~/components/TextField';
import { Toolbar } from '~/components/Toolbar';
import { prisma } from '~/db.server';
import { getQueryParams, StatusCode } from '~/models/core.validations';
import { DATE_INPUT_FORMAT } from '~/models/dates';
import { EventAction, EventDomain } from '~/models/events';
import { requireUserId } from '~/session.server';
import { useUser } from '~/utils';

const Schema = z.object({
  userId: z.string().optional(),
  domain: z.string().optional(),
  action: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);

  const queryParams = getQueryParams(request.url, ['userId', 'domain', 'action', 'from', 'to']);
  const result = Schema.safeParse(queryParams);
  if (!result.success) {
    throw new Response('Invalid search parameters, please try again', {
      status: StatusCode.BadRequest,
    });
  }
  const { userId, domain, action, from, to } = result.data;
  console.log('result data', result.data);

  const [users, events] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    prisma.event.findMany({
      where: {
        userId: userId || undefined,
        domain: domain || undefined,
        action: action || undefined,
        createdAt: from || to ? { gte: from || undefined, lte: to || undefined } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]).then(([users, events]) => {
    const refinedEvents = events.map((event) => {
      const user = users.find((user) => user.id === event.userId);
      try {
        const parsed = JSON.parse(event.recordData);
        return { ...event, parsed, user };
      } catch (error) {
        return { ...event, parsed: {}, user: undefined };
      }
    });
    return [users, refinedEvents] as const;
  });

  return json({ users, events, queryParams: result.data });
}

export default function UserActivity() {
  const currentUser = useUser();
  const loaderData = useLoaderData<typeof loader>();
  const { users, events, queryParams } = loaderData;

  const nav = useNavigation();
  const { isProcessing, getNameProp } = useForm({ data: loaderData, state: nav.state }, Schema);

  function getAuthor({ firstName, lastName, email }: { firstName: string; lastName: string; email: string }) {
    if (!firstName && !lastName) {
      return email;
    }
    return [firstName, lastName].join(', ');
  }

  const defaultValues: Record<keyof z.infer<typeof Schema>, string | undefined> = {
    userId: queryParams.userId,
    domain: queryParams.domain,
    action: queryParams.action,
    from: queryParams.from,
    to: queryParams.to,
  };

  const TABLES = [
    EventDomain.Tenant,
    EventDomain.PropertyType,
    EventDomain.Insurance,
    EventDomain.RoofType,
    EventDomain.InsuranceItem,
    EventDomain.Outgoing,
    EventDomain.Parking,
    EventDomain.ParkingType,
    EventDomain.Plot,
    EventDomain.ComparablePlot,
    EventDomain.PlotAndComparable,
    EventDomain.Image,
    EventDomain.Client,
    EventDomain.Valuer,
    EventDomain.Instruction,
    EventDomain.Grc,
    EventDomain.GrcFee,
    EventDomain.GrcDepr,
    EventDomain.Mv,
    EventDomain.Password,
    EventDomain.User,
    EventDomain.StoredValue,
    EventDomain.SavedConfig,
    EventDomain.Suburb,
  ];

  return (
    <div className="flex h-screen flex-col items-stretch">
      <Toolbar currentUserName={currentUser.email} isSuper={currentUser.isSuper} isBanker={currentUser.isBanker} isSignatory={currentUser.isSignatory} />
      <div className="flex grow flex-row items-stretch pt-6">
        <CenteredView className="w-full" innerProps={{ className: twMerge('h-full') }}>
          <div className="flex grow flex-col items-stretch rounded-lg bg-white p-0 gap-4">
            <Form method="get" className="flex flex-col items-stretch">
              <ActionContextProvider fields={defaultValues} isSubmitting={isProcessing}>
                <Card className="grid grid-cols-1 divide-x sm:grid-cols-2 md:grid-cols-6">
                  <div className="flex flex-col items-stretch justify-center p-2">
                    <Select {...getNameProp('userId')} defaultValue={defaultValues.userId} label="Filter By User">
                      <option value={''}>All Users</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {[user.firstName, user.lastName].filter(Boolean).join(', ') || user.email}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex flex-col items-stretch justify-center p-2">
                    <Select {...getNameProp('action')} label="Filter By Activity Type" defaultValue={defaultValues.action}>
                      <option value={''}>All Activity</option>
                      {[EventAction.Create, EventAction.Update, EventAction.Delete].map((kind) => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex flex-col items-stretch justify-center p-2">
                    <Select {...getNameProp('domain')} label="Filter By Data Type" defaultValue={defaultValues.domain}>
                      <option value={''}>All Data Types</option>
                      {TABLES.map((table) => (
                        <option key={table} value={table}>
                          {table}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex flex-col items-stretch justify-center p-2">
                    <TextField
                      {...getNameProp('from')}
                      type="datetime-local"
                      label="From this date and time"
                      defaultValue={defaultValues.from ? dayjs(defaultValues.from).format(DATE_INPUT_FORMAT + ' HH:mm') : ''}
                    />
                  </div>
                  <div className="flex flex-col items-stretch justify-center p-2">
                    <TextField
                      {...getNameProp('to')}
                      type="datetime-local"
                      label="To this date and time"
                      defaultValue={defaultValues.to ? dayjs(defaultValues.to).format(DATE_INPUT_FORMAT + 'HH:mm') : ''}
                    />
                  </div>
                  <div className="flex flex-col justify-center items-stretch p-2">
                    <PrimaryButton type="submit" disabled={isProcessing} className="text-sm">
                      Search
                    </PrimaryButton>
                  </div>
                </Card>
              </ActionContextProvider>
            </Form>
            <Card>
              <CardHeader>User Activity</CardHeader>
              <div className="flex flex-col items-stretch px-2 pt-4">
                <table className="table-auto border-collapse overflow-x-auto text-left">
                  <thead className="divide-y">
                    <tr className="border-b border-b-zinc-100">
                      <Th className="w-[15%]">Date & Time</Th>
                      <Th className="w-[15%]">User</Th>
                      <Th className="w-[10%]">Activity</Th>
                      <Th className="w-[10%]">Table</Th>
                      <Th className="w-[50%]">Details</Th>
                    </tr>
                  </thead>
                  <tbody className="overflow-hidden">
                    {events.map((event) => (
                      <tr key={event.id} className={twMerge('border-t border-t-zinc-100 overflow-hidden')}>
                        <Td className="px-2 py-3">{dayjs(event.createdAt).format('DD/MM/YYYY HH:mm')}</Td>
                        <Td className="px-2 py-3">{event.user ? getAuthor(event.user) : ''}</Td>
                        <Td className="px-2 py-3">{event.action}d</Td>
                        <Td className="px-2 py-3">{event.domain}</Td>
                        <Td className="px-2 py-3 overflow-hidden">
                          <div className="max-w-full flex flex-col items-stretch bg-stone-200 rounded-lg p-2 overflow-hidden">
                            <span>{JSON.stringify(event.parsed, null, 2)}</span>
                          </div>
                        </Td>
                      </tr>
                    ))}
                    {!events.length && (
                      <Td colSpan={5}>
                        <span className="text-stone-400">No events found</span>
                      </Td>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </CenteredView>
      </div>
    </div>
  );
}

function Th(props: ComponentProps<'th'>) {
  const { className, children, ...rest } = props;
  return (
    <th className={twMerge('border-b border-stone-400 font-normal p-2', className)} {...rest}>
      {children}
    </th>
  );
}

function Td(props: ComponentProps<'td'>) {
  const { className, children, ...rest } = props;
  return (
    <td className={twMerge('border-b border-stone-400 text-sm font-light', className)} {...rest}>
      {children}
    </td>
  );
}
