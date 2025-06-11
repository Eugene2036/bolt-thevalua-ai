import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { FormSelect } from '~/components/FormSelect';
import { FormTextField } from '~/components/FormTextField';
import { InlineAlert } from '~/components/InlineAlert';
import { PrimaryButton } from '~/components/PrimaryButton';
import { badRequest, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { CreateUserGroup } from '~/models/usergroup.server';
import { requireCompanyId, requireUserId } from '~/session.server';
import { Checkbox } from '@mui/material';
import { prisma } from '~/db.server';
import { EmptyList } from '~/components/EmptyList';
import { useState } from 'react';
import { toast, Toaster } from 'sonner';


export async function loader({ request }: LoaderArgs) {
    const companies = await prisma.company.findMany({
        select: {
            id: true,
            CompanyName: true,
        },
    });
    return json({ companies });
}

const Schema = z
    .object({
        Name: z.coerce.string().min(1),
        CompanyId: z.coerce.string().min(1),
        AllowCompanySettings: z.coerce.boolean().default(false),
        AllowCreateNewCompany: z.coerce.boolean().default(false),
        AllowCreateNewUser: z.coerce.boolean().default(false),
        AllowDeleteCompany: z.coerce.boolean().default(false),
        AllowMarkAsReviewed: z.coerce.boolean().default(false),
        AllowSetValuerTargets: z.coerce.boolean().default(false),
        AllowUnvaluedProperties: z.coerce.boolean().default(false),
        AllowUserActivity: z.coerce.boolean().default(false),
        AllowUserManagement: z.coerce.boolean().default(false),
        AllowValuationsDownload: z.coerce.boolean().default(false),
        IsSuper: z.coerce.boolean().default(false),
        IsInstructor: z.coerce.boolean().default(false),
    });

export async function action({ request }: ActionArgs) {
    const currentUserId = await requireUserId(request);
    const currentCompanyId = await requireCompanyId(request);
    try {
        const fields = await getRawFormFields(request);
        const result = Schema.safeParse(fields);

        console.log('USER ID: ' + currentUserId)
        console.log('RESULT VALUE: ' + result.error)

        if (!result.success) {
            return processBadRequest(result.error, fields);
        }

        const { ...restOfData } = result.data;
        await CreateUserGroup({ ...restOfData }, currentUserId);

        return redirect(AppLinks.UserGroups(currentCompanyId!));
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}

export default function CreateGroupPage() {
    const fetcher = useFetcher<typeof action>();
    const { isProcessing, getNameProp } = useForm(fetcher, Schema);
    const { companies } = useLoaderData<typeof loader>();

    const [Name, setName] = useState('');
    const [AllowCompanySettings, setAllowCompanySettings] = useState(false);
    const [AllowCreateNewCompany, setAllowCreateNewCompany] = useState(false);
    const [AllowCreateNewUser, setAllowCreateNewUser] = useState(false);
    const [AllowDeleteCompany, setAllowDeleteCompany] = useState(false);
    const [AllowMarkAsReviewed, setAllowMarkAsReviewed] = useState(false);
    const [AllowSetValuerTargets, setAllowSetValuerTargets] = useState(false);
    const [AllowUnvaluedProperties, setAllowUnvaluedProperties] = useState(false);
    const [AllowUserActivity, setAllowUserActivity] = useState(false);
    const [AllowUserManagement, setAllowUserManagement] = useState(false);
    const [AllowValuationsDownload, setAllowValuationsDownload] = useState(false);
    const [IsSuper, setIsSuper] = useState(false);
    const [IsInstructor, setIsinstructor] = useState(false);

    // console.log('allowCompanySettings: ', AllowCompanySettings);

    return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
            <span className="text-xl font-semibold">Create New User Group</span>
            <fetcher.Form method="post" className="flex flex-col items-stretch w-[60%] gap-4">
                <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
                    <div className="grid grid-cols-1 gap-6 py-4">
                        <div className="flex flex-col items-stretch py-4">
                            <FormTextField
                                {...getNameProp('Name')}
                                // value={formData.name}
                                // onChange={handleChange}
                                label="Group Name"
                                required
                                value={String(Name)} onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col items-stretch py-4">
                            <FormSelect
                                {...getNameProp('CompanyId')}
                                label="Select Company"
                            >
                                {companies.map((company) => (
                                    <option key={company.id} value={company.id}>{company.CompanyName}</option>
                                ))}
                                {!companies.length && <EmptyList>No companies found</EmptyList>}
                            </FormSelect>
                        </div>
                        <div className="flex flex-col justify-center items-center px-4">
                            <span className="text-xl font-semibold">Setup Modules Access</span>
                        </div>
                        <div className="grid grid-cols-2 gap-6 py-4">
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('IsSuper')}
                                    color="secondary"
                                    value={Boolean(IsSuper)}
                                    onChange={(e) => setIsSuper(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="checkboxDefault">
                                    Is a Super User?
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('IsInstructor')}
                                    color="secondary"
                                    value={Boolean(IsInstructor)}
                                    onChange={(e) => setIsinstructor(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="checkboxDefault">
                                    Create Valuation Instructions
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('AllowCompanySettings')}
                                    color="secondary"
                                    value={Boolean(AllowCompanySettings)}
                                    onChange={(e) => setAllowCompanySettings(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="checkboxDefault">
                                    Company Settings
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('AllowCreateNewCompany')}
                                    color="secondary"
                                    value={Boolean(AllowCreateNewCompany)}
                                    onChange={(e) => setAllowCreateNewCompany(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="checkboxDefault">
                                    Create New Company
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('AllowCreateNewUser')}
                                    color="secondary"
                                    value={Boolean(AllowCreateNewUser)}
                                    onChange={(e) => setAllowCreateNewUser(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="checkboxDefault">
                                    Create New User
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('AllowDeleteCompany')}
                                    color="secondary"
                                    value={Boolean(AllowDeleteCompany)}
                                    onChange={(e) => setAllowDeleteCompany(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="checkboxDefault">
                                    Delete Company
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('AllowMarkAsReviewed')}
                                    color="secondary"
                                    value={Boolean(AllowMarkAsReviewed)}
                                    onChange={(e) => setAllowMarkAsReviewed(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="checkboxDefault">
                                    Review Valuations
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('AllowSetValuerTargets')}
                                    color="secondary"
                                    value={Boolean(AllowSetValuerTargets)}
                                    onChange={(e) => setAllowSetValuerTargets(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="checkboxDefault">
                                    Set Valuer Targets
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('AllowUnvaluedProperties')}
                                    color="secondary"
                                    value={Boolean(AllowUnvaluedProperties)}
                                    onChange={(e) => setAllowUnvaluedProperties(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="checkboxDefault">
                                    Unvalued Property
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('AllowUserActivity')}
                                    color="secondary"
                                    value={Boolean(AllowUserActivity)}
                                    onChange={(e) => setAllowUserActivity(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="checkboxDefault">
                                    View User Activity
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('AllowUserManagement')}
                                    color="secondary"
                                    value={Boolean(AllowUserManagement)}
                                    onChange={(e) => setAllowUserManagement(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="checkboxDefault">
                                    User Management
                                </label>
                            </div>
                            <div className="mb-[0.125rem] block min-h-[1.5rem] ps-[1.5rem]">
                                <Checkbox
                                    {...getNameProp('AllowValuationsDownload')}
                                    color="secondary"
                                    value={Boolean(AllowValuationsDownload)}
                                    onChange={(e) => setAllowValuationsDownload(e.target.checked)}
                                />
                                <label
                                    className="inline-block font-light text-sm ps-[0.15rem] hover:cursor-pointer"
                                    htmlFor="checkboxDefault">
                                    Valuation Downloads
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
                        <PrimaryButton type="submit" disabled={isProcessing} onClick={() => { toast.success("User Group Updated Successfully...") }}>
                            {isProcessing ? 'Creating User Group...' : 'Create User Group'}
                        </PrimaryButton>
                    </div>
                </ActionContextProvider>
            </fetcher.Form>
        </div>
    );
}

