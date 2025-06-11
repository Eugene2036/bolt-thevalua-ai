import { ActionArgs, json, type LoaderArgs } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import { FormEvent, useEffect } from "react";
import { badRequest } from "remix-utils";
import { toast } from "sonner";
import { z } from "zod";
import { ActionContextProvider, useForm } from "~/components/ActionContextProvider";
import { EmptyList } from "~/components/EmptyList";
import { PrimaryButton, PrimaryButtonLink } from "~/components/PrimaryButton";
import { SecondaryButton } from "~/components/SecondaryButton";
import { prisma } from "~/db.server";
import { getValidatedId, hasSuccess, StatusCode } from "~/models/core.validations";
import { getErrorMessage } from "~/models/errors";
import { EventAction, EventDomain } from "~/models/events";
import { getRawFormFields } from "~/models/forms";
import { AppLinks } from "~/models/links";
import { createDefaultComTemplate, createDefaultResTemplate } from "~/models/report-template-res-comm-create";
import { requireUserId } from "~/session.server";

export async function loader({ params }: LoaderArgs) {
    const company = await prisma.company.findUnique({
        where: { id: params.companyId },
        select: {
            id: true,
            CompanyName: true,
            rptTemplates: {
                select: { id: true, name: true }
            }
        },
    });
    if (!company) {
        throw new Response("Company not found", { status: StatusCode.NotFound });
    }
    return json({ company });
}


const SchemaTemplate = z.object({
    companyId: z.string(),
    formAction: z.string(),
});

const Schema = z.object({
    id: z.string(),
    intent: z.string(),
});

export async function action({ request, params }: ActionArgs) {
    const currentUserId = await requireUserId(request);

    const fields = await getRawFormFields(request);
    const result = SchemaTemplate.safeParse(fields);

    if (result.success && result.data.formAction === 'generateTemplates') {
        const { companyId } = result.data;
        try {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
            });
            if (!company) {
                throw new Error('Company not found');
            }

            await createDefaultResTemplate({ name: `Residential (${companyId.slice(-5)})`, companyId });
            await createDefaultComTemplate({ name: `Commercial (${companyId.slice(-5)})`, companyId });

            return json({ success: true });
        } catch (error) {
            return badRequest({ formError: getErrorMessage(error) });
        }
    }

    // Handle delete
    const deleteResult = Schema.safeParse(fields);
    if (deleteResult.success && deleteResult.data.intent === "delete") {
        const { id } = deleteResult.data;
        const templateId = getValidatedId(id);

        try {
            const template = await prisma.rptTemplate.findUnique({
                where: { id: templateId },
            });
            if (!template) {
                throw new Error('Report Template record not found');
            }

            await prisma.$transaction(async (tx) => {
                await tx.rptTemplate.delete({
                    where: { id: templateId },
                });
                await tx.event.create({
                    data: {
                        userId: currentUserId,
                        domain: EventDomain.RptTemplate,
                        action: EventAction.Delete,
                        recordId: template.id,
                        recordData: JSON.stringify(template),
                    },
                });
            });

            return json({ success: true });
        } catch (error) {
            return badRequest({ formError: getErrorMessage(error) });
        }
    }
}

export default function RptTemplatesCompanyIdIndex() {
    const { company } = useLoaderData<typeof loader>();

    const fetcher = useFetcher<typeof action>();
    const { getNameProp, isProcessing } = useForm(fetcher, SchemaTemplate);

    useEffect(() => {
        if (hasSuccess(fetcher.data)) {
            toast('Updated successfully');
        }
    }, [fetcher.data]);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const result = window.confirm('Are You Sure?');
        console.log('Confirmationresult:', result);
        if (result) {
            fetcher.submit(event.currentTarget);
        }
    }

    return (
        <div className="flex flex-col items-center justify-start h-full gap-6 py-8">
            <span className="text-xl font-semibold">List of Templates for {company.CompanyName}</span>
            <div className="flex flex-col justify-center items-center px-6">
                {company.rptTemplates.length === 0 ? (
                    <fetcher.Form method="post"
                        onSubmit={handleSubmit}
                        className="flex flex-col items-stretch w-[90%] gap-4 mb-4">
                        <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
                            <span className="text-sm text-gray-500">Generate default report templates to Get Started.
                                <br />
                                This will create report templates for generic "Residential" and "Commercial" properties. You can edit them to suit your needs.
                                <br />
                                <span className="text-red-500">Note: This action cannot be undone.</span>
                            </span>
                            <input type="hidden" {...getNameProp('companyId')} value={company.id} />
                            <input type="hidden" {...getNameProp('formAction')} value="generateTemplates" />
                            <PrimaryButton type="submit" disabled={isProcessing}>
                                {isProcessing ? 'Generating Templates...' : 'Generate Templates'}
                            </PrimaryButton>
                        </ActionContextProvider>
                    </fetcher.Form>
                ) : (
                    <span className="text-sm text-gray-500">You can create a new template or edit an existing one</span>
                )}
            </div>
            <div className="flex flex-col items-stretch min-w-[80%] gap-4">
                <div className="flex flex-row items-center">
                    <div className="flex flex-col justify-center items-center px-4">
                        <span className="text-xl font-semibold">{company.rptTemplates.length} report template(s)</span>
                    </div>
                    <div className="grow" />
                    <div className="grow" />
                    <div className="flex flex-col justify-center items-center px-6">
                        <Link to={AppLinks.CreateRptTemplate(company.id)} className="text-teal-600 hover:underline">
                            Create Report Template
                        </Link>
                    </div>
                </div>
                {company.rptTemplates.map((reportTemplate) => (
                    <ReportTemplateListItem
                        id={reportTemplate.id}
                        Name={reportTemplate.name}
                        key={reportTemplate.id}
                        companyId={company.id}
                    />
                ))}
                {!company.rptTemplates.length && <EmptyList>No template(s) found</EmptyList>}
            </div>
        </div>
    );
}

interface TemplateListItemProps {
    id: string;
    Name: string;
    companyId: string;
}
function ReportTemplateListItem(props: TemplateListItemProps) {
    const { id, Name, companyId } = props;

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

    return (
        <div hidden={hasSuccess(fetcher.data)} key={id} className="flex flex-row gap-2 p-4 rounded-lg bg-stone-100">
            <div className="flex flex-col justify-center">
                <span className="text-base font-semibold text-black">{Name}</span>
            </div>
            <div className="grow" />
            <PrimaryButtonLink className='h-auto' to={AppLinks.EditRptTemplate(companyId, id)}>Edit Template</PrimaryButtonLink>
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
async function deleteTemplate(request: Request, templateId: string, currentUserId: string) {
    try {
        const template = await prisma.rptTemplate.findUnique({
            where: { id: templateId },
        });

        if (!template) {
            throw new Error("Report Template record not found");
        }

        await prisma.$transaction(async (tx) => {
            await tx.rptTemplate.delete({
                where: { id: templateId },
            });
            await tx.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.RptTemplate,
                    action: EventAction.Delete,
                    recordId: template.id,
                    recordData: JSON.stringify(template),
                },
            });
        });

        return json({ success: true });
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}
