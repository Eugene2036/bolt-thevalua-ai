import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { Response, json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { InlineAlert } from '~/components/InlineAlert';
import { PrimaryButton } from '~/components/PrimaryButton';
import { prisma } from '~/db.server';
import { StatusCode, badRequest, getValidatedId, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';
import Checkbox from '@mui/material/Checkbox';
import { FormTextField } from '~/components/FormTextField';
import { useState } from 'react';
import { toast, Toaster } from 'sonner';

export async function loader({ params }: LoaderArgs) {
    const usergroupId = getValidatedId(params.id);

    const usergroup = await prisma.userGroup.findUnique({
        where: { id: usergroupId },
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
            isInstructor: true,
            isSuper: true,
            company: {
                select: {
                    id: true,
                    CompanyName: true,
                }
            }
        },
    });
    if (!usergroup) {
        throw new Response('User Group record not found, please try again', {
            status: StatusCode.NotFound,
        });
    }
    const compID = usergroup.company.id;

    console.log('Current Usergroup ID: ', usergroupId);
    console.log('Current Usergroup: ', usergroup.name);

    return json({ usergroup, compID });

}

const Schema = z
    .object({
        name: z.string(),
        allowCompanySettings: z.coerce.boolean(),
        allowCreateNewCompany: z.coerce.boolean(),
        allowCreateNewUser: z.coerce.boolean(),
        allowDeleteCompany: z.coerce.boolean(),
        allowMarkAsReviewed: z.coerce.boolean(),
        allowSetValuerTargets: z.coerce.boolean(),
        allowUnvaluedProperties: z.coerce.boolean(),
        allowUserActivity: z.coerce.boolean(),
        allowUserManagement: z.coerce.boolean(),
        allowValuationsDownload: z.coerce.boolean(),
        isInstructor: z.coerce.boolean(),
        isSuper: z.coerce.boolean(),
    });

export async function action({ request, params }: ActionArgs) {

    const currentUserId = await requireUserId(request);
    // const { usergroup, compID } = useLoaderData<typeof loader>();

    try {
        const id = getValidatedId(params.id);
        // const compaid = getValidatedId(params.companyId);
        // console.log('Current Company ID: ', compaid);

        const fields = await getRawFormFields(request);
        const result = Schema.safeParse(fields);
        if (!result.success) {
            return processBadRequest(result.error, fields);
        }
        const { name, allowCompanySettings, allowCreateNewCompany, allowCreateNewUser, allowDeleteCompany, allowMarkAsReviewed,
            allowSetValuerTargets, allowUnvaluedProperties, allowUserActivity, allowUserManagement, allowValuationsDownload,
            isInstructor, isSuper } = result.data;

        await prisma.$transaction(async (tx) => {

            const updated = await tx.userGroup.update({
                where: { id },
                data: {
                    name, allowCompanySettings, allowCreateNewCompany, allowCreateNewUser, allowDeleteCompany, allowMarkAsReviewed,
                    allowSetValuerTargets, allowUnvaluedProperties, allowUserActivity, allowUserManagement, allowValuationsDownload,
                    isInstructor, isSuper
                },
            });
            await tx.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.UserGroup,
                    action: EventAction.Update,
                    recordId: updated.id,
                    recordData: JSON.stringify(updated),
                },
            });
        });

        return redirect(AppLinks.Companies);
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}

export default function EditUserPage() {
    const { usergroup } = useLoaderData<typeof loader>();

    const fetcher = useFetcher<typeof action>();
    const { isProcessing, getNameProp } = useForm(fetcher, Schema);

    console.log('Setting: ', usergroup.allowCompanySettings.toString());

    const defaultValues: Record<keyof z.infer<typeof Schema>, boolean | string> = {
        name: usergroup.name,
        allowCompanySettings: Boolean(usergroup.allowCompanySettings),
        allowCreateNewCompany: Boolean(usergroup.allowCreateNewCompany),
        allowCreateNewUser: Boolean(usergroup.allowCreateNewUser),
        allowDeleteCompany: Boolean(usergroup.allowDeleteCompany),
        allowMarkAsReviewed: Boolean(usergroup.allowMarkAsReviewed),
        allowSetValuerTargets: Boolean(usergroup.allowSetValuerTargets),
        allowUnvaluedProperties: Boolean(usergroup.allowUnvaluedProperties),
        allowUserActivity: Boolean(usergroup.allowUserActivity),
        allowUserManagement: Boolean(usergroup.allowUserManagement),
        allowValuationsDownload: Boolean(usergroup.allowValuationsDownload),
        isInstructor: Boolean(usergroup.isInstructor),
        isSuper: Boolean(usergroup.isSuper),
    };

    const [name, setName] = useState(usergroup.name);
    const [allowCompanySettings, setAllowCompanySettings] = useState(usergroup.allowCompanySettings);
    const [allowCreateNewCompany, setAllowCreateNewCompany] = useState(usergroup.allowCreateNewCompany);
    const [allowCreateNewUser, setAllowCreateNewUser] = useState(usergroup.allowCreateNewUser);
    const [allowDeleteCompany, setAllowDeleteCompany] = useState(usergroup.allowDeleteCompany);
    const [allowMarkAsReviewed, setAllowMarkAsReviewed] = useState(usergroup.allowMarkAsReviewed);
    const [allowSetValuerTargets, setAllowSetValuerTargets] = useState(usergroup.allowSetValuerTargets);
    const [allowUnvaluedProperties, setAllowUnvaluedProperties] = useState(usergroup.allowUnvaluedProperties);
    const [allowUserActivity, setAllowUserActivity] = useState(usergroup.allowUserActivity);
    const [allowUserManagement, setAllowUserManagement] = useState(usergroup.allowUserManagement);
    const [allowValuationsDownload, setAllowValuationsDownload] = useState(usergroup.allowValuationsDownload);
    const [isInstructor, setIsInstructor] = useState(usergroup.isInstructor);
    const [isSuper, setIsSuper] = useState(usergroup.isSuper);

    return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
            <span className="text-xl font-semibold">Edit User Group</span>
            <fetcher.Form method="post" className="flex flex-col items-stretch w-[60%] gap-4">
                <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
                    <div className="grid grid-cols-1 gap-6 py-4">
                        <div className="flex flex-col items-stretch py-4">
                            <FormTextField
                                {...getNameProp('name')}
                                type="text"
                                label="Group Name"
                                required
                                value={String(name)} onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col items-stretch py-4">
                            {/* <Select
                                {...getNameProp('companyId')}
                                label="Select Company"
                            >
                                {companies.map((company) => (
                                    <option key={company.id} {...company} >{company.CompanyName}</option>
                                ))}
                                {!companies.length && <EmptyList>No companies found</EmptyList>}
                            </Select> */}
                        </div>
                        <div className="flex flex-col justify-center items-center px-4">
                            <span className="text-xl font-semibold">Setup Access Modules</span>
                        </div>
                        <div className="grid grid-cols-2 gap-6 py-4">
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('isInstructor')}
                                    color="secondary"
                                    defaultChecked={isInstructor}
                                    value={Boolean(isInstructor)} onChange={(e) => setIsInstructor(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="allowCompanySettings">
                                    Create Valuation Instructions
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('isSuper')}
                                    color="secondary"
                                    defaultChecked={isSuper}
                                    value={Boolean(isSuper)} onChange={(e) => setIsSuper(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="allowCompanySettings">
                                    Is Super User?
                                </label>
                            </div>

                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('allowCompanySettings')}
                                    color="secondary"
                                    defaultChecked={allowCompanySettings}
                                    value={Boolean(allowCompanySettings)} onChange={(e) => setAllowCompanySettings(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="allowCompanySettings">
                                    Company Settings
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('allowCreateNewCompany')}
                                    color="secondary"
                                    defaultChecked={allowCreateNewCompany}
                                    value={Boolean(allowCreateNewCompany)} onChange={(e) => setAllowCreateNewCompany(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="allowCreateNewCompany">
                                    Create New Company
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('allowCreateNewUser')}
                                    color="secondary"
                                    defaultChecked={allowCreateNewUser}
                                    value={Boolean(allowCreateNewUser)} onChange={(e) => setAllowCreateNewUser(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="allowCreateNewUser">
                                    Create New User
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('allowDeleteCompany')}
                                    color="secondary"
                                    defaultChecked={allowDeleteCompany}
                                    value={Boolean(allowDeleteCompany)} onChange={(e) => setAllowDeleteCompany(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="allowDeleteCompany">
                                    Delete Company
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('allowMarkAsReviewed')}
                                    color="secondary"
                                    defaultChecked={allowMarkAsReviewed}
                                    value={Boolean(allowMarkAsReviewed)} onChange={(e) => setAllowMarkAsReviewed(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="allowMarkAsReviewed">
                                    Review Valuations
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('allowSetValuerTargets')}
                                    color="secondary"
                                    defaultChecked={allowSetValuerTargets}
                                    value={Boolean(allowSetValuerTargets)} onChange={(e) => setAllowSetValuerTargets(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="allowSetValuerTargets">
                                    Set Valuer Targets
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('allowUnvaluedProperties')}
                                    color="secondary"
                                    defaultChecked={allowUnvaluedProperties}
                                    value={Boolean(allowUnvaluedProperties)} onChange={(e) => setAllowUnvaluedProperties(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="allowUnvaluedProperties">
                                    Unvalued Property
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('allowValuationsDownload')}
                                    color="secondary"
                                    defaultChecked={allowValuationsDownload}
                                    value={Boolean(allowValuationsDownload)} onChange={(e) => setAllowValuationsDownload(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="allowValuationsDownload">
                                    Valued Property
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('allowUserActivity')}
                                    color="secondary"
                                    defaultChecked={allowUserActivity}
                                    value={Boolean(allowUserActivity)} onChange={(e) => setAllowUserActivity(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="allowUserActivity">
                                    User Activity
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('allowUserManagement')}
                                    color="secondary"
                                    defaultChecked={allowUserManagement}
                                    value={Boolean(allowUserManagement)} onChange={(e) => setAllowUserManagement(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="allowUserManagement">
                                    User Management
                                </label>
                            </div>
                        </div>
                    </div>
                    {hasFormError(fetcher.data) && (
                        <div className="flex flex-col items-stretch py-4">
                            <InlineAlert>{fetcher.data.formError}</InlineAlert>
                        </div>
                    )}
                    <div className="flex flex-col items-stretch py-4">
                        <Toaster />
                        <PrimaryButton type="submit" disabled={isProcessing} onClick={() => { toast.success('User Group Updated Successfully...') }}>
                            {isProcessing ? 'Updating User Group...' : 'Update User Group'}
                        </PrimaryButton>
                    </div>
                </ActionContextProvider>
            </fetcher.Form>
        </div>
    );
}
