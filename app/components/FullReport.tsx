import { ComponentProps } from "react";
import { CustomReport } from "./CustomReport";
import { TableOfContentsProvider, TocEntry, UpdateTocProps } from "./TableOfContentsProvider";

interface Props extends ComponentProps<typeof CustomReport> {
  tableOfContents: TocEntry[];
  updateToc: (props: UpdateTocProps) => void;
}
export function FullReport(props: Props) {
  const { tableOfContents, updateToc, ...rest } = props;

  return (
    <TableOfContentsProvider tableOfContents={tableOfContents} updateToc={updateToc}>
      <CustomReport {...rest} />
    </TableOfContentsProvider>
  )
}