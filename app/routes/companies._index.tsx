import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, useFetcher, useLoaderData } from '@remix-run/react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import { useForm } from '~/components/ActionContextProvider';
import { EmptyList } from '~/components/EmptyList';
import { PrimaryButtonLink } from '~/components/PrimaryButton';
import { SecondaryButton, SecondaryButtonLink } from '~/components/SecondaryButton';
import { prisma } from '~/db.server';
import { badRequest, hasSuccess, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';
import { useUser } from '~/utils';

export interface companyID {
    id: string;
}

export async function loader({ request, params }: LoaderArgs) {

    const userId = await requireUserId(request);

    console.log('userId', userId);

    const company = await prisma.user.findUnique({
        where: { id: userId },
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
    const companyId = company?.UserGroup?.company.id;
    console.log('companyId', company?.UserGroup?.company.id);

    if (!companyId) {
        throw new Error('Company record not found');
    }
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            firstName: true,
            lastName: true,
            email: true,
            isBanker: true,
            isSuper: true,
        },
    });
    if (!user) {
        throw new Error('User record not found');
    }
    console.log(user?.firstName + ' ' + user?.lastName, user?.email, user?.isBanker, user?.isSuper);

    if (user?.isBanker === true || user?.isSuper === true) {
        const companies = await prisma.company.findMany({
            select: {
                id: true,
                FullName: true,
                CompanyName: true,
                LocationAddress: true,
                PostalAddress: true,
                Phone: true,
                Mobile: true,
                Fax: true,
                Email: true,
                Website: true,
                LogoLink: true,
                isSuspended: true,
            },
        });

        console.log('Companies 1:', companyId);
        return json({ companies });
    } else {
        const companies = await prisma.company.findMany({
            where: { id: company?.UserGroup?.company.id },
            select: {
                id: true,
                FullName: true,
                CompanyName: true,
                LocationAddress: true,
                PostalAddress: true,
                Phone: true,
                Mobile: true,
                Fax: true,
                Email: true,
                Website: true,
                LogoLink: true,
                isSuspended: true,
            },
        });

        console.log('Companies 2:', companyId);
        return json({ companies });
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

        const company = await prisma.company.findUnique({
            where: { id },
        });
        if (!company) {
            throw new Error('Company record not found');
        }

        if (intent === 'suspend') {
            console.log('Handling suspend intent');
            await prisma.$transaction(async (tx) => {
                const updated = await tx.company.update({
                    where: { id },
                    data: { isSuspended: !company.isSuspended },
                });
                await tx.event.create({
                    data: {
                        userId: currentUserId,
                        domain: EventDomain.Company,
                        action: EventAction.Update,
                        recordId: updated.id,
                        recordData: JSON.stringify(updated),
                    },
                });
            });
            console.log('toggled isSuspensed to', !company.isSuspended);
            return json({ success: true });
        }

        if (!company) {
            throw new Error('Company record not found');
        }

        await prisma.$transaction(async (tx) => {
            await tx.company.delete({
                where: { id },
            });
            await tx.userGroup.deleteMany({
                where: { companyId: id },
            });

            await tx.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.Company,
                    action: EventAction.Delete,
                    recordId: company.id,
                    recordData: JSON.stringify(company),
                },
            });
        });

        return json({ success: true });
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}

export default function CompaniesIndexPage() {
    const { companies } = useLoaderData<typeof loader>();
    const currentUser = useUser();

    return (
        <div className="flex flex-col items-center justify-start h-full gap-6 py-8">
            <div className="flex flex-col items-stretch min-w-[90%] gap-4">
                <div className="flex flex-row items-center">
                    <div className="flex flex-col justify-center items-center px-4">
                        <span className="text-xl font-semibold">{companies.length} company(s)</span>
                    </div>
                    <div className="grow" />
                    <div className="flex flex-col justify-center items-center px-6">

                        {/* <Link to={AppLinks.UserGroups} className="text-teal-600 hover:underline">
                            Manage User Groups
                        </Link> */}
                    </div>
                    <div className="flex flex-col justify-center items-center px-6">
                        {(currentUser.isBanker === true) && (
                            <Link to={AppLinks.CreateCompany} className="text-teal-600 hover:underline">
                                Create New Company
                            </Link>
                        )}
                    </div>
                </div>
                {companies.map((company) => (
                    <CompanyListItem key={company.id} {...company} />
                ))}
                {!companies.length && <EmptyList>No companies found</EmptyList>}
            </div>
        </div>
    );
}

interface CompanyListItemProps {
    id: string;
    FullName: string;
    CompanyName: string;
    LocationAddress: string;
    PostalAddress: string;
    Phone: string;
    Mobile: string;
    Fax: string | null;
    Email: string;
    Website: string | null;
    isSuspended: boolean;
}

function CompanyListItem(props: CompanyListItemProps) {
    const { id, FullName, CompanyName, LocationAddress, PostalAddress, Phone, Mobile, Fax, Email, Website, isSuspended } = props;
    const currentUser = useUser();

    const fetcher = useFetcher<typeof action>();
    const { isProcessing, getNameProp } = useForm(fetcher, Schema);

    useEffect(() => {
        if (hasSuccess(fetcher.data)) {
            toast('Updated successfully');
        }
    }, [fetcher.data]);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const result = window.confirm('Are You Sure?');
        if (result) {

            fetcher.submit(event.currentTarget);
        }
    }

    const [isPopupOpen, setPopupOpen] = useState(false);

    return (
        <div hidden={hasSuccess(fetcher.data)} key={id} className="flex flex-row gap-2 p-4 rounded-lg bg-stone-100">
            <div className="flex flex-col justify-center">
                <span className="text-base font-semibold text-black">{CompanyName}</span>
                {/* <span className="text-sm font-light text-stone-600 text-wrap">{LocationAddress}</span> */}
                <span className="text-sm font-light text-stone-600">{Email}  {Phone}</span>
            </div>
            <div className="grow" />
            {
                currentUser.isBanker === false && (
                    <>
                        <SecondaryButtonLink to={AppLinks.RptTemplates(id)}>Report Templates</SecondaryButtonLink>
                        <SecondaryButtonLink to={AppLinks.UserGroups(id)}>User Groups</SecondaryButtonLink>
                    </>
                )
            }
            < PrimaryButtonLink className='h-auto' to={AppLinks.EditCompany(id)}>Edit Company</PrimaryButtonLink>
            <fetcher.Form method="post" onSubmit={handleSubmit}>
                <input type="hidden" {...getNameProp('id')} value={id} />
                <input type="hidden" {...getNameProp('intent')} value="suspend" />
                {
                    currentUser.isBanker === true && (
                        <SecondaryButton type="submit" disabled={isProcessing} className={twMerge('text-orange-600 border border-orange-600', isSuspended && 'text-blue-600 border-blue-600')}>
                            {isSuspended ? 'Reactivate' : 'Suspend'}
                        </SecondaryButton>
                    )
                }
            </fetcher.Form>

            <fetcher.Form method="post" onSubmit={handleSubmit}>
                <input type="hidden" {...getNameProp('id')} value={id} />
                <input type="hidden" {...getNameProp('intent')} value="delete" />
                <SecondaryButton type="submit" disabled={isProcessing} className="text-red-600 border border-red-600">
                    Delete
                </SecondaryButton>
            </fetcher.Form>
        </div >
    );
}