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
import { PrimaryButtonLink } from '~/components/PrimaryButton';
import { SecondaryButton } from '~/components/SecondaryButton';
import { prisma } from '~/db.server';
import { badRequest, getValidatedId, hasSuccess, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';

export async function loader({ request, params }: LoaderArgs) {

    const { id } = params;

    const companies = await prisma.company.findUnique({
        where: { id: id },
        select: {
            id: true,
            CompanyName: true,
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
    return json({ repHeaders, companies, id });
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

    const { repHeaders, companies, id } = useLoaderData<typeof loader>();
    const compID = id;

    // Log the ID
    console.log(`1. Company ID: ${id}`);

    return (
        <div className="flex flex-col items-center justify-start h-full gap-6 py-8">
            <span className="text-xl font-semibold">List of Report Headers for {companies?.CompanyName}</span>
            <div className="flex flex-col items-stretch min-w-[65%] gap-4">
                <div className="flex flex-row items-center">
                    <div className="flex flex-col justify-center items-center px-4">
                        <span className="text-xl font-semibold">{repHeaders.length} report template(s)</span>
                    </div>
                    <div className="grow" />
                    {/* <div className="flex flex-col justify-center items-center px-6">
                        <Link to={AppLinks.UserGroups} className="text-teal-600 hover:underline">
                            Manage User Groups
                        </Link>
                    </div> */}
                    <div className="flex flex-col justify-center items-center px-6">
                        <Link to={AppLinks.CreateReportTemplate(compID as string)} className="text-teal-600 hover:underline">
                            Create Report Template
                        </Link>
                    </div>
                </div>
                {repHeaders.map((reportTemplate) => (
                    <ReportTemplateListItem Name={reportTemplate.headerTitle} key={reportTemplate.id} {...reportTemplate} />
                ))}
                {!repHeaders.length && <EmptyList>No record(s) found</EmptyList>}
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
            <PrimaryButtonLink className='h-auto' to={AppLinks.EditReportTemplate(id)}>Edit Details</PrimaryButtonLink>

            {/* <SecondaryButton
                onClick={() => setPopupOpen(true)}>Groups</SecondaryButton> */}
            {/* <PrimaryButtonLink className='h-auto' to={AppLinks.UserGroups}>Edit Groups</PrimaryButtonLink> */}
            {/* <UserGroupsForm
                isOpen={isPopupOpen}
                onClose={() => setPopupOpen(false)} /> */}

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
