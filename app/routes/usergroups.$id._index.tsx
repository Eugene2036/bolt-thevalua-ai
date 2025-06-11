import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { json } from '@remix-run/node';
import { Link, useFetcher, useLoaderData } from '@remix-run/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { useForm } from '~/components/ActionContextProvider';
import { EmptyList } from '~/components/EmptyList';
import { PrimaryButtonLink } from '~/components/PrimaryButton';
import { SecondaryButton } from '~/components/SecondaryButton';
import { prisma } from '~/db.server';
import { badRequest, getValidatedId, hasSuccess, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';
import { useUser } from '~/utils';


export async function loader({ request, params }: LoaderArgs) {

    const { id } = params;

    const companies = await prisma.company.findUnique({
        where: { id: id },
        select: {
            id: true,
            CompanyName: true,
        },
    });

    const usergroups = await prisma.userGroup.findMany({
        where: { companyId: id },
        select: {
            id: true,
            name: true,
            companyId: true,
            allowCompanySettings: true,
            allowCreateNewCompany: true,
            allowCreateNewUser: true,
            allowDeleteCompany: true,
            allowMarkAsReviewed: true,
            allowSetValuerTargets: true,
            allowUnvaluedProperties: true,
            allowUserActivity: true,
            allowUserManagement: true,
            allowValuationsDownload: true,
            company: {
                select: {
                    CompanyName: true,
                }
            }
        },
    });

    console.log('Fetched user groups with company details:', JSON.stringify(usergroups, null, 2));

    return json({ usergroups });
}


const Schema = z.object({
    id: z.string(),
    intent: z.string(),
});
export async function action({ request, params }: ActionArgs) {
    const currentUserId = await requireUserId(request);
    const usergroupId = getValidatedId(params.id);

    try {
        const fields = await getRawFormFields(request);
        const result = Schema.safeParse(fields);
        if (!result.success) {
            return processBadRequest(result.error, fields);
        }
        const { id, intent } = result.data;

        const company = await prisma.userGroup.findUnique({
            where: { id: usergroupId }, // user group id
        });

        console.log('CURRENT USERGROUP ID: ' + company)

        if (!company) {
            throw new Error('User Group record not found');
        }

        await prisma.$transaction(async (tx) => {
            await tx.userGroup.delete({
                where: { id },
            });
            await tx.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.UserGroup,
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

export default function UserGroupsIndexPage() {
    const { usergroups } = useLoaderData<typeof loader>();
    const currentUser = useUser();

    return (
        <div className="flex flex-col items-center justify-start h-full gap-6 py-8">
            <div className="flex flex-col items-stretch min-w-[65%] gap-4">
                <div className="flex flex-row items-center">
                    <div className="flex flex-col justify-center items-center px-4">
                        <span className="text-xl font-semibold">{usergroups.length} group(s)</span>
                    </div>
                    <div className="grow" />
                    <div className="flex flex-col justify-center items-center px-6">

                        <Link to={AppLinks.CreateUserGroup} className="text-teal-600 hover:underline">
                            Create New User Group
                        </Link>
                    </div>
                </div>
                {usergroups.map((usergroup) => (
                    <GroupListItem key={usergroup.id} {...usergroup} />
                ))}
                {!usergroups.length && <EmptyList>No user groups found</EmptyList>}
            </div>
        </div>
    );
}

interface Company {
    CompanyName: string;
}

interface GroupListItemProps {
    id: string;
    name: string;
    companyId: string;
    allowCompanySettings: boolean;
    allowCreateNewCompany: boolean;
    allowCreateNewUser: boolean;
    allowDeleteCompany: boolean;
    allowMarkAsReviewed: boolean;
    allowSetValuerTargets: boolean;
    allowUnvaluedProperties: boolean;
    allowUserActivity: boolean;
    allowUserManagement: boolean;
    allowValuationsDownload: boolean;
    company: Company;
}

function GroupListItem(props: GroupListItemProps) {
    const { id, name, companyId, allowCompanySettings, allowCreateNewCompany, allowCreateNewUser, allowDeleteCompany, allowMarkAsReviewed, allowSetValuerTargets, allowUnvaluedProperties, allowUserActivity, allowUserManagement, allowValuationsDownload, company } = props;

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
                <span className="text-base font-semibold text-black">{name}</span>
                <span className="text-sm font-light text-stone-600 text-wrap">Company: {company.CompanyName}</span>
                {/* <span className="text-sm font-light text-stone-600">{Email}  {Phone}</span> */}
            </div>
            <div className="grow" />
            <PrimaryButtonLink className='h-auto' to={AppLinks.EditUserGroup(id)}>Edit Group</PrimaryButtonLink>
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

