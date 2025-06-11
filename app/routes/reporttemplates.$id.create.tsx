import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { InlineAlert } from '~/components/InlineAlert';
import { PrimaryButton } from '~/components/PrimaryButton';
import { badRequest, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields, hasFieldErrors, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { CreateReportTemplate } from '~/models/reporttemplate.server';
import { requireUserId } from '~/session.server';
import { TextField } from '~/components/TextField';
import { prisma } from '~/db.server';

export async function loader({ request, params }: LoaderArgs) {
    const { id } = params;
    const companies = await prisma.company.findUnique({
        where: { id: id },
        select: {
            id: true,
            CompanyName: true,
        },
    });
    return json({ companies, id });
}

const Schema = z
    .object({
        companyId: z.string(),
        name: z.string().min(1),
    }
    );

export async function action({ request, params }: ActionArgs) {
    const currentUserId = await requireUserId(request);
    const { id } = params;

    console.log('Area 1')
    if (id) {
        console.log(`2. Company ID: ${id}`);
    } else {
        console.error('Company ID not found in URL');
    }
    console.log('Area 2')
    try {
        const fields = await getRawFormFields(request);
        const result = Schema.safeParse(fields);

        console.log('USER ID: ', currentUserId)
        console.log('Area 3')
        console.log('RESULT VALUE: ' + result.error)
        console.log('Area 4')
        if (!result.success) {
            return processBadRequest(result.error, fields);
        }

        const { companyId, ...restOfData } = result.data;
        await CreateReportTemplate({ ...restOfData, companyId: String(id) }, currentUserId);

        console.log('Area 5')
        return redirect(AppLinks.ReportTemplates(String(id)));
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}

export default function CreateReportTemplatePage() {
    const fetcher = useFetcher<typeof action>();
    const { isProcessing, getNameProp } = useForm(fetcher, Schema);

    const { companies, id } = useLoaderData<typeof loader>();
    const compID = id;

    return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
            <span className="text-xl font-semibold">Configure Template for {companies?.CompanyName}</span>
            <fetcher.Form method="post" className="flex flex-col items-stretch w-[90%] gap-4">
                <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
                    <div className='font-light bg-red-300 p-3 rounded-xl'><b>NB:</b> Before editing this template data, it is important to have knowledge of basic HTML Tags, or get help from a System Administrator. This template is designed to be used with a text editor or IDE, to avoid destroying dynamic data variables etc.</div>
                    <div className='grid grid-cols-1 gap-6 py-4'>
                        <div className='grid gap-2'>
                            <TextField
                                {...getNameProp('name')}
                                placeholder='Enter Template Name'
                                // value={name}
                                // onChange={(e) => setScopeOfWork(e.target.value)}
                                errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['name'] : undefined}
                            />
                        </div>
                    </div>


                    <TextField type='hidden' {...getNameProp('companyId')} value={compID} />
                    {hasFormError(fetcher.data) && (
                        <div className="flex flex-col items-stretch py-4">
                            <InlineAlert>{fetcher.data.formError}</InlineAlert>
                        </div>
                    )}
                    <div className="flex flex-col items-stretch py-4">
                        <PrimaryButton type="submit" disabled={isProcessing}>
                            {isProcessing ? 'Creating Template...' : 'Create Template'}
                        </PrimaryButton>
                    </div>
                </ActionContextProvider>
            </fetcher.Form>
        </div>
    );
}
