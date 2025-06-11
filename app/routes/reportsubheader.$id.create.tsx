import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { InlineAlert } from '~/components/InlineAlert';
import { PrimaryButton } from '~/components/PrimaryButton';
import { badRequest, getValidatedId, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields, hasFieldErrors, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';
import { TextField } from '~/components/TextField';
import { CardHeader } from '~/components/CardHeader';
import { prisma } from '~/db.server';
import BackButton from '~/components/BackButton';
import { EventAction, EventDomain } from '~/models/events';

export async function loader({ request, params }: LoaderArgs) {
    console.log("Create SubHeader Params: ", params);

    const { id } = params;
    const headerId = getValidatedId(params.id)

    const reportHeader = await prisma.reportHeader.findUnique({
        where: { id: id },
        select: {
            id: true,
            headerTitle: true,
        },
    });
    return json({ reportHeader, id, headerId });
}

const Schema = z
    .object({
        subHeaderTitle: z.string(),
        reportHeaderId: z.string().min(1),

    }
    );

export async function action({ request, params }: ActionArgs) {
    const currentUserId = await requireUserId(request);
    const { id, headerId } = params;


    console.log('Area 1')
    if (id) {
        console.log(`2. Header ID: ${id}`);
    } else {
        console.error('Header ID not found in URL');
    }
    console.log('Area 2')
    try {
        const templateId = getValidatedId(params.id);
        const fields = await getRawFormFields(request);
        const result = Schema.safeParse(fields);

        console.log('REPORT TEMPLATE ID: ' + templateId);
        console.log('QUERY ERROR RESULT: ' + result.error + '\n QUERY SUCCESS RESULT: ' + result.success);

        if (!result.success) {
            return processBadRequest(result.error, fields);
        }
        const { subHeaderTitle, reportHeaderId } = result.data;

        await prisma.$transaction(async (tx) => {

            const updated = await tx.reportSubHeader.create({
                data: {
                    subHeaderTitle,
                    reportHeaderId,
                },
            });
            await tx.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.SubHeader,
                    action: EventAction.Create,
                    recordId: updated.id,
                    recordData: JSON.stringify(updated),
                },
            });
        });

        return redirect(AppLinks.ReportHeaders(String(headerId)));
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }

}

export default function CreateSubHeaderPage() {
    const fetcher = useFetcher<typeof action>();
    const { isProcessing, getNameProp } = useForm(fetcher, Schema);

    const { reportHeader, id, headerId } = useLoaderData<typeof loader>();
    const compID = id;

    return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
            <span className="text-xl font-semibold">Create New SubHeader for {reportHeader?.headerTitle}</span>
            <fetcher.Form method="post" className="flex flex-col items-stretch w-[90%] gap-4">
                <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
                    <div className='font-light bg-red-300 p-3 rounded-xl'><b>NB:</b> Before editing this template data, it is important to have knowledge of basic HTML Tags, or get help from a System Administrator. This template is designed to be used with a text editor or IDE, to avoid destroying dynamic data variables etc.</div>
                    <div className='grid grid-cols-1 gap-6 py-4'>
                        <div className='grid gap-2'>
                            <TextField
                                {...getNameProp('subHeaderTitle')}
                                placeholder='SubHeader Title'
                                // value={name}
                                // onChange={(e) => setScopeOfWork(e.target.value)}
                                errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['name'] : undefined}
                            />
                        </div>
                    </div>


                    <TextField type='hidden' {...getNameProp('reportHeaderId')} value={headerId} />
                    {hasFormError(fetcher.data) && (
                        <div className="flex flex-col items-stretch py-4">
                            <InlineAlert>{fetcher.data.formError}</InlineAlert>
                        </div>
                    )}
                    <div className="flex flex-col items-stretch py-4">
                        <CardHeader className="flex flex-row items-center gap-4" topBorder>
                            <BackButton />
                            <div className="grow" />
                            <PrimaryButton type="submit" disabled={isProcessing}>
                                {isProcessing ? 'Creating SubHeader...' : 'Create SubHeader'}
                            </PrimaryButton>
                        </CardHeader>
                    </div>
                </ActionContextProvider>
            </fetcher.Form>
        </div>
    );
}
