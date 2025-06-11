import { memo } from "react";
import { PdfTable } from "./PdfTable";

interface Props {
  records: {
    identifier: string;
    unit: string;
    size: number;
  }[]
}
export const PdfPlinthAreas = memo(function (props: Props) {
  const { records } = props;
  return (
    <PdfTable
      headers={['Identifier', 'Unit', 'Size']}
      data={records.map(r => ([r.identifier, r.unit || '-', String(r.size)]))}
    />
  )
})