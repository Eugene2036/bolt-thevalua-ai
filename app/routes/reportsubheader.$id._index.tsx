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
import { PrimaryButton, PrimaryButtonLink } from '~/components/PrimaryButton';
import { SecondaryButton } from '~/components/SecondaryButton';
import { prisma } from '~/db.server';
import { badRequest, getValidatedId, hasSuccess, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';
import BackButton from '~/components/BackButton';
import { CardHeader } from '~/components/CardHeader';

export async function loader({ request, params }: LoaderArgs) {
    console.log("List of parameters: ", params);

    const { id } = params;

    const rptHeader = await prisma.reportHeader.findUnique({
        where: { id: id },
        select: {
            headerTitle: true,
            id: true,
        }
    });

    const repSubHeaders = await prisma.reportSubHeader.findMany({
        where: { reportHeaderId: id },
        include: {
            reportBodyContent: true,
        },
    });
    const headerId = getValidatedId(params.id);

    return json({ rptHeader, repSubHeaders, id, headerId });
}

const Schema = z.object({
    id: z.string(),
    intent: z.string(),
});

function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = date.getUTCFullYear();

    return `${day}/${month}/${year}`;
}

export async function action({ request, params }: ActionArgs) {
    const currentUserId = await requireUserId(request);
    const templateId = getValidatedId(params.id);
    try {
        const fields = await getRawFormFields(request);
        const result = Schema.safeParse(fields);
        if (!result.success) {
            return processBadRequest(result.error, fields);
        }
        const { id, intent } = result.data;

        const company = await prisma.reportTemplate.findUnique({
            where: { id: templateId },
        });

        console.log('CURRENT Template ID: ' + company)

        if (!company) {
            throw new Error('Report Template record not found');
        }

        await prisma.$transaction(async (tx) => {
            await tx.reportTemplate.delete({
                where: { id },
            });
            await tx.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.ReportTemplate,
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

export default function ReportTemplateIndexPage() {
    const fetcher = useFetcher<typeof action>();
    const { isProcessing, getNameProp } = useForm(fetcher, Schema);

    const { rptHeader, repSubHeaders, id } = useLoaderData<typeof loader>();
    const headerID = id;

    // Log the ID
    console.log(`Headers ID: ${headerID}`);

    return (
        <div className="flex flex-col items-center justify-start h-full gap-6 py-8">
            <span className="text-xl font-semibold">Report Sub Headers for {rptHeader?.headerTitle}</span>
            <div className="flex flex-col items-stretch min-w-[90%] gap-4">
                <div className="flex flex-row items-center">
                    <div className="flex flex-col justify-center items-center px-4">
                        <span className="text-xl font-semibold">{repSubHeaders.length} sub-header(s)</span>
                    </div>
                    <div className="grow" />
                    {/* <div className="flex flex-col justify-center items-center px-6">
                        <Link to={AppLinks.UserGroups} className="text-teal-600 hover:underline">
                            Manage User Groups
                        </Link>
                    </div> */}
                    <div className="flex flex-col justify-center items-center px-6">
                        <Link to={AppLinks.CreateReportSubHeader(headerID as string)} className="text-teal-600 hover:underline">
                            Create SubHeader
                        </Link>
                    </div>
                </div>

                {repSubHeaders.map((subheader) => (
                    <ReportTemplateListItem Name={subheader.subHeaderTitle} key={subheader.id} {...subheader} />
                ))}
                {!repSubHeaders.length && <EmptyList>No record(s) found</EmptyList>}
            </div>
            <div className="flex flex-col items-stretch py-4">
                <CardHeader className="flex flex-row items-center gap-4" topBorder>
                    <BackButton />
                    <div className="grow" />
                    <PrimaryButton type="submit" disabled={isProcessing} >
                        {isProcessing ? 'Continuing...' : 'Continue'}
                    </PrimaryButton>
                </CardHeader>
            </div>
        </div>
    );
}

interface TemplateListItemProps {
    id: string;
    Name: string;
    createdAt: string;
    updatedAt: string;
}

function ReportTemplateListItem(props: TemplateListItemProps) {
    const { id, Name, createdAt, updatedAt } = props;
    const { rptHeader, repSubHeaders } = useLoaderData<typeof loader>();
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
            <PrimaryButtonLink className='h-auto' to={AppLinks.EditReportBodyContent(id, String(rptHeader?.id))}>Edit Content</PrimaryButtonLink>
            {/* <PrimaryButtonLink className='h-auto' to={AppLinks.EditReportSubHeader(id)}>Rename</PrimaryButtonLink> */}

            {/* <SecondaryButton
                onClick={() => setPopupOpen(true)}>Groups</SecondaryButton> */}
            {/* <PrimaryButtonLink className='h-auto' to={AppLinks.UserGroups}>Edit Groups</PrimaryButtonLink> */}
            {/* <UserGroupsForm
                isOpen={isPopupOpen}
                onClose={() => setPopupOpen(false)} /> */}
            <input type="hidden" name="headerId" value={id} />
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
