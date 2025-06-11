import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { Response, json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import BackButton from '~/components/BackButton';
import { CardHeader } from '~/components/CardHeader';
import { PrimaryButton } from '~/components/PrimaryButton';
import { TextField } from '~/components/TextField';
import { prisma } from '~/db.server';
import { StatusCode, badRequest, getValidatedId, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields, hasFieldErrors, hasFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
// import { createHashedPassword } from '~/models/user.server';
import { requireUserId } from '~/session.server';

export async function loader({ params }: LoaderArgs) {
    console.log("Report SubHeader Params: ", params);

    const id = getValidatedId(params.id);

    const rptHeader = await prisma.reportHeader.findUnique({
        where: { id: id },
        select: {
            headerTitle: true,
            id: true,
        },
    });
    const rptSubHeader = await prisma.reportSubHeader.findFirst({
        where: { id: id },
        select: {
            id: true,
            subHeaderTitle: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    const rptheaderId = rptHeader?.id;

    if (!rptSubHeader) {
        throw new Response('Report SubHeader record not found, please try again or create create a new SubHeader record', {
            status: StatusCode.NotFound,
        });
    }
    return json({ rptHeader, rptSubHeader, id, rptheaderId });
}

const Schema = z
    .object({
        subHeaderTitle: z.string().min(1),
        // id: z.string(),
        // intent: z.string(),
    });

export async function action({ request, params }: ActionArgs) {
    const currentUserId = await requireUserId(request);
    const headerId = getValidatedId(params.rptheaderId)
    try {
        const templateId = getValidatedId(params.id);
        const fields = await getRawFormFields(request);
        const result = Schema.safeParse(fields);

        console.log('REPORT TEMPLATE ID: ' + templateId)
        console.log('QUERY ERROR RESULT: ' + result.error + '\n QUERY SUCCESS RESULT: ' + result.success)

        if (!result.success) {
            return processBadRequest(result.error, fields);
        }
        const { subHeaderTitle } = result.data;

        await prisma.$transaction(async (tx) => {

            const updated = await tx.reportSubHeader.update({
                where: { id: templateId },
                data: {
                    subHeaderTitle
                },
            });
            await tx.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.SubHeader,
                    action: EventAction.Update,
                    recordId: updated.id,
                    recordData: JSON.stringify(updated),
                },
            });
        });

        return redirect(AppLinks.ReportHeaders(headerId));
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}

function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = date.getUTCFullYear();

    return `${day}/${month}/${year}`;
}

export default function EditSubHeaderPage() {

    const { rptHeader, rptSubHeader } = useLoaderData<typeof loader>();
    // const compID = id;

    const fetcher = useFetcher<typeof action>();
    const { isProcessing, getNameProp } = useForm(fetcher, Schema);

    const defaultValues: Record<keyof z.infer<typeof Schema>, string> = {
        subHeaderTitle: rptSubHeader.subHeaderTitle,

    };

    const [reportName, setReportName] = useState(rptSubHeader.subHeaderTitle);

    return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
            <span className="text-xl font-semibold">Edit SubHeader</span>
            <fetcher.Form method="post" className="flex flex-col items-stretch w-[90%]">
                <ActionContextProvider {...fetcher.data} fields={hasFields(fetcher.data) ? fetcher.data.fields : defaultValues} isSubmitting={isProcessing}>
                    <div className='font-light bg-red-300 p-3 rounded-xl'><b>NB:</b> Before editing this template data, it is important to have knowledge of basic HTML Tags, or get help from a System Administrator. This template is designed to be used with a text editor or IDE, to avoid destroying dynamic data variables etc.</div>
                    <div className='grid grid-cols-1 gap-6 py-4'>
                        <div className='grid gap-2'>
                            <TextField
                                {...getNameProp('subHeaderTitle')}
                                placeholder='Enter Template Name'
                                value={reportName}
                                onChange={(e) => setReportName(e.target.value)}
                                errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['subHeaderTitle'] : undefined}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col items-stretch py-4">
                        <CardHeader className="flex flex-row items-center gap-4" topBorder>
                            <BackButton />
                            <div className="grow" />
                            <PrimaryButton type="submit" disabled={isProcessing} onClick={() => { toast.success("Record Updated Successfully") }}>
                                {isProcessing ? 'Saving Changes...' : 'Save Changes'}
                            </PrimaryButton>
                        </CardHeader>
                    </div>
                </ActionContextProvider>
            </fetcher.Form>
        </div>
    );
}


