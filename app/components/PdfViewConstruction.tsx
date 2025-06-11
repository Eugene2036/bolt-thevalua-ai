import { ConstructionItem } from "~/models/con-items"
import { PdfTable } from "./PdfTable"
import { memo } from "react"

interface Props {
  items: ConstructionItem[]
}
export const PdfViewConstruction = memo(function (props: Props) {
  const { items } = props
  return (
    <PdfTable
      headers={['Item', "Comment"]}
      data={items.map(i => [i.identifier, i.comment || '-'])}
    />
  )
})