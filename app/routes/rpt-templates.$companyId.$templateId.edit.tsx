import { PartialBlock } from "@blocknote/core";
import { ActionArgs, json, type LoaderArgs } from "@remix-run/node";
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
import { requireUserId } from "~/session.server";

export async function loader({ params }: LoaderArgs) {
  if (!params.templateId) {
    throw new Error("No template ID provided");
  }
  const template = await prisma.rptTemplate.findUnique({
    where: { id: params.templateId },
    select: {
      id: true,
      name: true,
      sections: {
        select: {
          name: true,
          subSections: {
            select: {
              title: true,
              content: true,
            },
          },
        }
      }
    },
  });
  if (!template) {
    throw new Response("Template not found", { status: StatusCode.NotFound });
  }
  return json({ template });
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
})
export async function action({ request, params }: ActionArgs) {
  await requireUserId(request);
  try {
    if (!params.templateId) {
      throw new Error("No template ID provided");
    }
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { name, sections } = result.data;

    const numDuplicates = await prisma.rptTemplate.count({
      where: { name, id: { not: params.templateId } },
    });
    if (numDuplicates > 0) {
      throw new Error("Name already exists");
    }

    await prisma.$transaction(async (tx) => {
      const existingSections = await tx.reportTemplateSection.findMany({
        where: { templateId: params.templateId },
      });
      await tx.templateSubSection.deleteMany({
        where: { sectionId: { in: existingSections.map((section) => section.id) } },
      });
      await tx.reportTemplateSection.deleteMany({
        where: { templateId: params.templateId },
      });
      await tx.rptTemplate.update({
        where: { id: params.templateId },
        data: {
          name,
          sections: {
            // deleteMany: { templateId: params.templateId }, // Remove previous sections
            create: sections.map((section, index) => ({
              refNumber: index,
              name: section.name,
              subSections: {
                // deleteMany: { sectionId: { not: params.templateId } }, // Remove previous sub-sections
                create: section.subSections.map((subSection) => ({
                  title: subSection.title,
                  content: subSection.content,
                })),
              },
            })),
          },
        },
      });
    });
    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}

interface Section {
  name: string;
  subSections: SubSection[];
}

interface SubSection {
  hasTitle: boolean;
  title: string;
  content: PartialBlock[];
}

export default function RptTemplatesCompanyIdTemplateIdEdit() {
  const { template } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const parsedInitialSections: Section[] = (() => {
    try {
      return template.sections.map((section) => {
        return ({
          name: section.name,
          subSections: section.subSections.map(subSection => ({
            hasTitle: !!subSection.title,
            title: subSection.title || '',
            content: getParsedInitialContent(subSection.content),
          })),
        });
      });
    } catch (error) {
      return [];
    }
  })();

  function getParsedInitialContent(...data: (string | undefined | null)[]) {
    for (const datum of data) {
      if (!datum) {
        continue;
      }
      try {
        return JSON.parse(datum) as PartialBlock[];
      } catch (error) {
        continue;
      }
    }
    return [];
  }

  const { sections, ...sectionMethods } = useSections(parsedInitialSections);

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
      <span className="text-xl font-semibold">Edit Template</span>
      <fetcher.Form method="post" onSubmit={handleSubmit} className="flex flex-col items-stretch w-[90%] gap-4">
        <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
          <div className='grid grid-cols-1 gap-6 py-4'>
            <div className='grid gap-2'>
              <TextField
                {...getNameProp('name')}
                defaultValue={template.name}
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
                  Add Section
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
              {isProcessing ? 'Updating Template...' : 'Update Template'}
            </PrimaryButton>
          </div>
        </ActionContextProvider>
      </fetcher.Form>
    </div>
  )
}