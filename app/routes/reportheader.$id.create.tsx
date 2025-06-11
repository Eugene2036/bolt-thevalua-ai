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
import { requireUserId } from '~/session.server';
import { TextField } from '~/components/TextField';
import { prisma } from '~/db.server';
import { CreateReportHeader } from '~/models/reportheader.server';

export async function loader({ request, params }: LoaderArgs) {

    const { id } = params;
    const reportTemplate = await prisma.reportTemplate.findUnique({
        where: { id: id },
        select: {
            id: true,
            name: true,
        },
    });
    return json({ reportTemplate, id });
}

const Schema = z
    .object({
        headerTitle: z.string().min(1),
        reportTemplateId: z.string(),
    }
    );

export async function action({ request, params }: ActionArgs) {
    const currentUserId = await requireUserId(request);
    const { id, reportTemplate } = params;
    // const reportTemplateId = params.reportTemplateId;

    console.log('Area 1')
    if (id) {
        console.log(`2. Report Template ID: ${id}`);
    } else {
        console.error('Template ID not found in URL');
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

        const { reportTemplateId, ...restOfData } = result.data;
        await CreateReportHeader({ ...restOfData, reportTemplateId: String(id) }, currentUserId);

        console.log('Area 5')
        return redirect(AppLinks.ReportHeaders(String(id)));
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}

export default function CreateReportTemplatePage() {
    const fetcher = useFetcher<typeof action>();
    const { isProcessing, getNameProp } = useForm(fetcher, Schema);

    const { reportTemplate, id } = useLoaderData<typeof loader>();
    const compID = id;

    return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
            <span className="text-xl font-semibold">Configure Header for {reportTemplate?.name}</span>
            <fetcher.Form method="post" className="flex flex-col items-stretch w-[90%] gap-4">
                <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
                    <div className='font-light bg-red-300 p-3 rounded-xl'><b>NB:</b> Before editing this template data, it is important to have knowledge of basic HTML Tags, or get help from a System Administrator. This template is designed to be used with a text editor or IDE, to avoid destroying dynamic data variables etc.</div>
                    <div className='grid grid-cols-1 gap-6 py-4'>
                        <div className='grid gap-2'>
                            <TextField
                                {...getNameProp('headerTitle')}
                                placeholder='Enter Header Name'
                                // value={name}
                                // onChange={(e) => setScopeOfWork(e.target.value)}
                                errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['name'] : undefined}
                            />
                        </div>
                    </div>


                    <TextField type='hidden' {...getNameProp('reportTemplateId')} value={id} />
                    {hasFormError(fetcher.data) && (
                        <div className="flex flex-col items-stretch py-4">
                            <InlineAlert>{fetcher.data.formError}</InlineAlert>
                        </div>
                    )}
                    <div className="flex flex-col items-stretch py-4">
                        <PrimaryButton type="submit" disabled={isProcessing}>
                            {isProcessing ? 'Creating Header...' : 'Create Header'}
                        </PrimaryButton>
                    </div>
                </ActionContextProvider>
            </fetcher.Form>
        </div>
    );
}

