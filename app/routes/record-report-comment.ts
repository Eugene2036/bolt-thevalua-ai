import { json, type ActionArgs } from "@remix-run/node";
import { prisma } from "~/db.server";
import { badRequest, processBadRequest } from "~/models/core.validations";
import { getErrorMessage } from "~/models/errors";
import { getRawFormFields } from "~/models/forms";
import { getValidatedComments, ReportCommentSchema } from "~/models/report-comments";

export async function action({ request }: ActionArgs) {
  try {
    const fields = await getRawFormFields(request);
    const result = ReportCommentSchema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }

    const plot = await prisma.plot.findUnique({
      where: { id: result.data.plotId },
      select: { reportComments: true },
    });
    if (!plot) {
      throw new Error("Plot not found");
    }
    const existingComments = (() => {
      try {
        return getValidatedComments(JSON.parse(plot.reportComments));
      } catch (error) {
        return [];
      }
    })();

    const updatedComments = [...existingComments, result.data];

    await prisma.plot.update({
      where: { id: result.data.plotId },
      data: { reportComments: JSON.stringify(updatedComments) },
    });
    
    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}