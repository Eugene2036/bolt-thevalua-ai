import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { InlineAlert } from '~/components/InlineAlert';
import { PrimaryButton } from '~/components/PrimaryButton';
import { badRequest, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';
import { TextField } from '~/components/TextField';
import { CardHeader } from '~/components/CardHeader';
import { useState } from 'react';
import { prisma } from '~/db.server';
import { CreateReportBodyContent } from '~/models/reportbodycontent.server';
import { Editor } from 'primereact/editor';
import BackButton from '~/components/BackButton';
import { toast } from 'sonner';

export async function loader({ request, params }: LoaderArgs) {
    console.log("Received parameters: ", params);

    const { id } = params;
    const subHeader = await prisma.reportSubHeader.findUnique({
        where: { id: id },
        select: {
            id: true,
            subHeaderTitle: true,
        },
    });
    return json({ subHeader, id });
}

const Schema = z
    .object({
        bodyContentInfo: z.string(),
        subHeaderId: z.string().min(1),
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

        const { subHeaderId, ...restOfData } = result.data;
        await CreateReportBodyContent({ ...restOfData, subHeaderId: String(id) }, currentUserId);

        console.log('Area 5')
        return redirect(AppLinks.ReportHeaders(String(id)));
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}

export default function CreateReportTemplatePage() {
    const fetcher = useFetcher<typeof action>();
    const { isProcessing, getNameProp } = useForm(fetcher, Schema);

    const { subHeader, id } = useLoaderData<typeof loader>();
    const sheaderID = id;

    const [bodyContentInfo, setBodyContentInfo] = useState('');

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
            <span className="text-xl font-semibold">Configure Content for {subHeader?.subHeaderTitle}</span>
            <fetcher.Form method="post" className="flex flex-col items-stretch w-[90%] gap-4">
                <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
                    <div className='font-light bg-red-300 p-3 rounded-xl'><b>NB:</b> Before editing this template data, it is important to have knowledge of basic HTML Tags, or get help from a System Administrator. This template is designed to be used with a text editor or IDE, to avoid destroying dynamic data variables etc.</div>
                    <div className='grid grid-cols-1 gap-6 py-4'>
                        <div className='grid gap-2'>
                            <Editor
                                {...getNameProp('bodyContentInfo')}
                                placeholder='Enter Body Content'
                                headerTemplate={customHeader}
                                onTextChange={(e) => setBodyContentInfo(e.htmlValue || '')}
                            />
                        </div>
                    </div>


                    <TextField type='hidden' {...getNameProp('bodyContentInfo')} value={bodyContentInfo} />
                    <TextField type='hidden' {...getNameProp('subHeaderId')} value={sheaderID} />
                    {hasFormError(fetcher.data) && (
                        <div className="flex flex-col items-stretch py-4">
                            <InlineAlert>{fetcher.data.formError}</InlineAlert>
                        </div>
                    )}

                    <CardHeader className="flex flex-row items-stretch gap-4 p-6" topBorder>
                        <BackButton />
                        <div className="grow" />
                        <PrimaryButton type="submit" disabled={isProcessing} onClick={() => { toast.success(' Record Created for ' + subHeader?.subHeaderTitle + ' Successfully...'); }}>
                            {isProcessing ? 'Creating Record...' : 'Create Record'}
                        </PrimaryButton>
                    </CardHeader>
                </ActionContextProvider>
            </fetcher.Form>
        </div>
    );
}
