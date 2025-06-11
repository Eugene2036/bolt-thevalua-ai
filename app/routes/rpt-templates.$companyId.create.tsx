import type { ActionArgs } from "@remix-run/node";
import { json, redirect, type LoaderArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { FormEvent } from "react";
import { z } from "zod";
import { ActionContextProvider, useForm } from "~/components/ActionContextProvider";
import { AddSectionButton } from "~/components/AddSectionButton";
import { InlineAlert } from "~/components/InlineAlert";
import { PrimaryButton } from "~/components/PrimaryButton";
import { ReportContextProvider } from "~/components/ReportContextProvider";
import { TextField } from "~/components/TextField";
import { UpdatedSectionPanel } from "~/components/UpdatedSectionPanel";
import { prisma } from "~/db.server";
import { useSections } from "~/hooks/useSections";
import { badRequest, processBadRequest, safeJsonParse, StatusCode } from "~/models/core.validations";
import { getErrorMessage } from "~/models/errors";
import { getRawFormFields, hasFieldErrors, hasFormError } from "~/models/forms";
import { AppLinks } from "~/models/links";
import { requireUserId } from "~/session.server";

export async function loader({ params }: LoaderArgs) {
    if (!params.companyId) {
        throw new Error("No company ID provided");
    }
    const company = await prisma.company.findUnique({
        where: { id: params.companyId },
        select: {
            id: true,
            CompanyName: true,
        },
    });
    if (!company) {
        throw new Response("Company not found", { status: StatusCode.NotFound });
    }
    return json({ company });
}

const SubSectionSchema = z.object({
    title: z.string(),
    content: z.string()
});
const SectionSchema = z.object({
    name: z.string().min(1),
    // subSections: z.preprocess(safeJsonParse, SubSectionSchema.array()),
    subSections: SubSectionSchema.array(),
});
const Schema = z.object({
    name: z.string().min(1),
    sections: z.preprocess(safeJsonParse, SectionSchema.array()),
});
export async function action({ request, params }: ActionArgs) {
    await requireUserId(request);
    try {
        if (!params.companyId) {
            throw new Error("No company ID provided");
        }
        const fields = await getRawFormFields(request);
        const result = Schema.safeParse(fields);
        if (!result.success) {
            return processBadRequest(result.error, fields);
        }
        const { name, sections } = result.data;

        const numDuplicates = await prisma.rptTemplate.count({
            where: { name },
        });
        if (numDuplicates > 0) {
            throw new Error("Name already exists");
        }

        const { id: newTemplateId } = await prisma.rptTemplate.create({
            data: {
                companyId: params.companyId,
                name,
                sections: {
                    create: sections.map((section, index) => ({
                        refNumber: index,
                        name: section.name,
                        subSections: {
                            create: section.subSections.map((subSection) => ({
                                title: subSection.title,
                                content: subSection.content,
                            })),
                        },
                    })),
                },
            },
        });
        return redirect(AppLinks.RptTemplates(params.companyId));
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}

export default function RptTemplatesCompanyIdCreate() {
    const { company } = useLoaderData<typeof loader>();

    const fetcher = useFetcher<typeof action>();
    const { getNameProp, isProcessing } = useForm(fetcher, Schema);

    const { sections, ...sectionMethods } = useSections();

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        console.log("Handling submit...");
        const formData = new FormData(event.currentTarget);
        formData.append("sections", JSON.stringify(sections.current.map(s => {
            return {
                ...s,
                subSections: s.subSections.map(ss => {
                    return {
                        ...ss,
                        content: JSON.stringify(ss.content)
                    }
                }),
            }
        })));
        fetcher.submit(formData, { method: "post" });
    }

    return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
            <span className="text-xl font-semibold">Configure Template for {company.CompanyName}</span>
            <fetcher.Form method="post" onSubmit={handleSubmit} className="flex flex-col items-stretch w-[90%] gap-4">
                <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
                    <div className='grid grid-cols-1 gap-6 py-4'>
                        <div className='grid gap-2'>
                            <TextField
                                {...getNameProp('name')}
                                placeholder='Enter Template Name'
                                errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['name'] : undefined}
                            />
                        </div>
                    </div>
                    <ReportContextProvider sections={[]} {...sectionMethods}>
                        <div className="flex flex-col gap-4 py-4">
                            {sections.current.map((section, index) => (
                                <UpdatedSectionPanel
                                    index={index}
                                    key={index}
                                    editable={true}
                                    section={section}
                                />
                            ))}
                            <div className="flex flex-col items-start">
                                <AddSectionButton fn={sectionMethods.addSection}>
                                    + Add Section
                                </AddSectionButton>
                            </div>
                        </div>
                    </ReportContextProvider>
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
    )
}