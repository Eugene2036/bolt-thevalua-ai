import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { Response, json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import BackButton from '~/components/BackButton';
import { CardHeader } from '~/components/CardHeader';
import { EmptyList } from '~/components/EmptyList';
import { InlineAlert } from '~/components/InlineAlert';
import { PrimaryButton, PrimaryButtonLink } from '~/components/PrimaryButton';
import { SecondaryButton } from '~/components/SecondaryButton';
import { TextField } from '~/components/TextField';
import { prisma } from '~/db.server';
import { StatusCode, badRequest, getValidatedId, hasSuccess, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields, hasFieldErrors, hasFields, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';

export async function loader({ params }: LoaderArgs) {
    const id = getValidatedId(params.id);
    const reportTemplate = await prisma.reportTemplate.findUnique({
        where: { id: id },
        include: {
            reportHeader: true,
        },
    });
    const repHeaders = await prisma.reportHeader.findMany({
        where: { reportTemplateId: id },
        select: {
            id: true,
            headerTitle: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    if (!reportTemplate) {
        throw new Response('Report Template record not found, please try again or create create a new template record', {
            status: StatusCode.NotFound,
        });
    }

    return json({ reportTemplate, repHeaders });
}

const Schema = z
    .object({
        name: z.string().min(1),
        // id: z.string(),
        // intent: z.string(),
    });


export async function action({ request, params }: ActionArgs) {
    const currentUserId = await requireUserId(request);
    const templateId = getValidatedId(params.id);
    const headerID = getValidatedId(params.rptheaderId);

    try {
        const fields = await getRawFormFields(request);
        const result = Schema.safeParse(fields);

        console.log('REPORT TEMPLATE ID: ' + templateId)
        console.log('QUERY ERROR RESULT: ' + result.error + '\n QUERY SUCCESS RESULT: ' + result.success)

        if (!result.success) {
            return processBadRequest(result.error, fields);
        }
        const { name } = result.data;

        await prisma.$transaction(async (tx) => {

            const updated = await tx.reportTemplate.update({
                where: { id: templateId },
                data: {
                    name
                },
            });
            await tx.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.ReportTemplate,
                    action: EventAction.Update,
                    recordId: updated.id,
                    recordData: JSON.stringify(updated),
                },
            });
        });

        return redirect(AppLinks.Companies);
    } catch (error) {
        console.log("Error:", JSON.stringify(error, null, 2));
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

export default function EditReportTemplatePage() {

    const { reportTemplate, repHeaders } = useLoaderData<typeof loader>();
    // const compID = id;

    const fetcher = useFetcher<typeof action>();
    const { isProcessing, getNameProp } = useForm(fetcher, Schema);

    const defaultValues: Record<keyof z.infer<typeof Schema>, string> = {
        name: reportTemplate.name,

    };

    const [reportName, setReportName] = useState(reportTemplate.name);

    return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
            <span className="text-xl font-semibold">Edit Report Headers</span>
            <fetcher.Form method="post" className="flex flex-col items-stretch w-[90%]">
                <ActionContextProvider {...fetcher.data} fields={hasFields(fetcher.data) ? fetcher.data.fields : defaultValues} isSubmitting={isProcessing}>
                    <div className='font-light bg-red-300 p-3 rounded-xl'><b>NB:</b> Before editing this template data, it is important to have knowledge of basic HTML Tags, or get help from a System Administrator. This template is designed to be used with a text editor or IDE, to avoid destroying dynamic data variables etc.</div>
                    <div className='grid grid-cols-1 gap-6 py-4'>
                        <div className='grid gap-2'>
                            <TextField
                                {...getNameProp('name')}
                                placeholder='Enter Template Name'
                                value={reportName}
                                onChange={(e) => setReportName(e.target.value)}
                                errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['name'] : undefined}
                            />
                        </div>
                    </div>
                    {repHeaders.map((reportHeader) => (
                        <ReportHeaderListItem Name={reportHeader.headerTitle} key={reportHeader.id} {...reportHeader} />
                    ))}
                    {!repHeaders.length && <EmptyList>No record(s) found</EmptyList>}

                    {hasFormError(fetcher.data) && (
                        <div className="flex flex-col items-stretch py-4">
                            <InlineAlert>{fetcher.data.formError}</InlineAlert>
                        </div>
                    )}

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



interface HeaderListItemProps {
    id: string;
    Name: string;
    createdAt: string;
    updatedAt: string;
}

function ReportHeaderListItem(props: HeaderListItemProps) {
    const { id, Name, createdAt, updatedAt } = props;
    const { reportTemplate, repHeaders } = useLoaderData<typeof loader>();
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
                <span className="text-base font-semibold text-black">{Name}</span>
                {/* <span className="text-sm font-light text-stone-600 text-wrap">{createdAt}</span> */}
                <span className="text-sm font-light text-stone-600">Created: {formatDate(createdAt)} - Last Updated: {formatDate(updatedAt)}</span>
            </div>
            <div className="grow" />
            <PrimaryButtonLink
                to={AppLinks.ReportSubHeaders(id)}>Sub Headers</PrimaryButtonLink>

            {/* <PrimaryButtonLink className='h-auto' to={AppLinks.EditReportTemplate(id)}>Edit Header</PrimaryButtonLink> */}

            {/* <PrimaryButtonLink className='h-auto' to={AppLinks.UserGroups}>Edit Groups</PrimaryButtonLink> */}
            {/* <UserGroupsForm
                isOpen={isPopupOpen}
                onClose={() => setPopupOpen(false)} /> */}

            <fetcher.Form method="post" onSubmit={handleSubmit}>
                {/* <input type="hidden" {...getNameProp('id')} value={id} />
                <input type="hidden" {...getNameProp('intent')} value="delete" /> */}
                <SecondaryButton type="submit" disabled={isProcessing} className="text-red-600 border border-red-600">
                    Delete
                </SecondaryButton>
            </fetcher.Form>
        </div>
    );
}