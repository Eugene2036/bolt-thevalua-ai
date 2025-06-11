import { json, type LoaderArgs } from "@remix-run/node";
import { prisma } from "~/db.server";
import { getErrorMessage } from "~/models/errors";
import { getValidatedComments } from "~/models/report-comments";

export async function loader({ params }: LoaderArgs) {
  try {
    const plotId = params.plotId;
    const plot = await prisma.plot.findUnique({
      where: { id: plotId },
      select: { reportComments: true },
    });
    if (!plot) {
      throw new Error("Plot not found");
    }
    const parsedComments = (() => {
      try {
        return getValidatedComments(JSON.parse(plot.reportComments));
      } catch (error) {
        return [];
      }
    })();
    return json({ comments: parsedComments });
  } catch (error) {
    return json({ errorMessage: getErrorMessage(error) });
  }

}