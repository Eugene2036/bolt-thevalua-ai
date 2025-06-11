import { Text, View } from "@react-pdf/renderer"
import { memo } from "react";
import { createTw } from "react-pdf-tailwind"

const tw = createTw({});

interface Props {
  footerNote: string;
}
export const PdfFooter = memo(function (props: Props) {
  const { footerNote } = props
  return (
    <View fixed style={tw("h-[75pt] w-[100%] flex flex-col justify-center gap-2 absolute bottom-0 left-0 items-stretch px-[40pt] pt-[6pt] pb-[4pt] shrink-0")}>
      <View style={tw("flex flex-row items-end border-t border-t-stone-200 py-4 gap-4 tracking-wider")}>
        <Text
          style={tw("text-red-600 text-[10pt] font-light")}
          render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} / ${totalPages}`
          )}
        />
        <Text style={tw("text-stone-800 text-[10pt] font-light")}>Private and Confidential</Text>
        <View style={tw('grow')} />
        <Text style={tw("text-stone-800 text-[10pt] font-light")}>||</Text>
        <View style={tw('grow')} />
        <View style={tw("flex flex-col justify-center items-center px-4")}>
          <Text style={tw("text-stone-800 text-[10pt] font-light")}>{footerNote}</Text>
        </View>
      </View>
    </View>
  )
})