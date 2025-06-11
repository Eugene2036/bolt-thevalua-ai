import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { Editor } from 'primereact/editor';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import BackButton from '~/components/BackButton';
import { CardHeader } from '~/components/CardHeader';
import { PrimaryButton } from '~/components/PrimaryButton';
import { prisma } from '~/db.server';
import { badRequest, getValidatedId } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';

export async function loader({ params }: LoaderArgs) {
    console.log("List of received parameters: ", params);
    const id = getValidatedId(params.id);
    const sheaderid = getValidatedId(params.sheaderid);


    console.log("IDs: ", id, sheaderid);

    const rptSubHeader = await prisma.reportSubHeader.findUnique({
        where: { id: id },
        include: {
            reportBodyContent: true,
        },
    });

    const rptBodyContent = await prisma.reportBodyContent.findFirst({
        where: { subHeaderId: id },
        select: {
            id: true,
            bodyContentInfo: true,
            createdAt: true,
            updatedAt: true,
            subHeaderId: true,
        },
    });

    if (!rptSubHeader || !rptBodyContent) {
        toast.message("Tempate content not found, creating new record");
        return redirect(AppLinks.CreateReportBodyContent(id));
    }

    return json({ rptSubHeader, rptBodyContent, sheaderid, id });
}

const Schema = z.object({
    bodyContentInfo: z.string().min(1),
});

export async function action({ request, params }: ActionArgs) {
    const currentUserId = await requireUserId(request);
    const contentId = getValidatedId(params.id);
    const sheaderid = getValidatedId(params.sheaderid);

    try {
        const fields = await getRawFormFields(request);// get the form fields from the request
        const result = Schema.safeParse(fields);

        console.log("form result: ", result);

        if (!result.success) {
            return badRequest({ formError: 'Invalid form data' });
        }
        const { bodyContentInfo } = result.data;

        await prisma.$transaction(async (tx) => {

            const updated = await tx.reportBodyContent.update({
                where: { subHeaderId: contentId },
                data: { bodyContentInfo },
            });

            if (!updated) {
                throw new Error('Update failed');
            }

            await tx.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.BodyContent,
                    action: EventAction.Update,
                    recordId: updated.id,
                    recordData: JSON.stringify(updated),
                },
            });
        });

        return redirect(AppLinks.ReportSubHeaders(sheaderid));
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}

export default function EditBodyContentPage() {
    const { rptSubHeader, rptBodyContent, sheaderid, id } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();
    const { isProcessing, getNameProp } = useForm(fetcher, Schema);

    const [bodyContentInfo, setBodyContentInfo] = useState(rptBodyContent?.bodyContentInfo || '');

    const customHeader = (
        <span className="ql-formats">
            <button className="ql-bold"></button>
            <button className="ql-italic"></button>
            <button className="ql-underline"></button>
            <select className="ql-color"></select>
            <select className="ql-background"></select>
            <select className="ql-header">
                <option value="1">Heading 1</option>
                <option value="2">Heading 2</option>
                <option value="3">Heading 3</option>
                <option value="4">Heading 4</option>
                <option value="5">Heading 5</option>
                <option value="6">Heading 6</option>
                <option value="">Normal</option>
            </select>
            <button className="ql-align" value=""></button>
            <button className="ql-align" value="center"></button>
            <button className="ql-align" value="right"></button>
            <button className="ql-align" value="justify"></button>
            <button className="ql-list" value="ordered"></button>
            <button className="ql-list" value="bullet"></button>
        </span>
    );

    return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
            <span className="text-xl font-semibold">Edit Content for {rptSubHeader.subHeaderTitle}</span>
            <fetcher.Form method="post" className="flex flex-col items-stretch w-[90%]" id='frmBodyContentInfo'>
                <ActionContextProvider {...fetcher.data} fields={{ bodyContentInfo }} isSubmitting={isProcessing}>
                    <div className='font-light bg-red-300 p-3 rounded-xl'>
                        <b>NB:</b> Before editing this template data, it is important to have knowledge of basic HTML Tags, or get help from a System Administrator. This template is designed to be used with a text editor or IDE, to avoid destroying dynamic data variables etc.
                    </div>
                    <div className='grid grid-cols-1 gap-6 py-4'>
                        <div className='grid gap-2'>
                            <Editor
                                {...getNameProp('bodyContentInfo')}
                                value={bodyContentInfo}
                                headerTemplate={customHeader}
                                onTextChange={(e) => setBodyContentInfo(e.htmlValue || '')}
                            />
                        </div>
                    </div>

                    <input type="hidden" {...getNameProp('bodyContentInfo')} value={bodyContentInfo} />
                    <div className="flex flex-col items-stretch py-4">
                        <CardHeader className="flex flex-row items-center gap-4 p-6" topBorder>
                            <BackButton />
                            <div className="grow" />
                            <PrimaryButton type="submit" disabled={isProcessing} onClick={() => { toast.success(rptSubHeader.subHeaderTitle + ' Record Updated Successfully...'); }}>
                                {isProcessing ? 'Saving Changes...' : 'Save Changes'}
                            </PrimaryButton>
                        </CardHeader>
                    </div>
                </ActionContextProvider>
            </fetcher.Form>
        </div>
    );
}