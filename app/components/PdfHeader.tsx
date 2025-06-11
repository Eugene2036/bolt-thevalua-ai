import { Text, View } from "@react-pdf/renderer"
import PdfCompanyLogo from "./PdfCompanyLogo"
import { createTw } from "react-pdf-tailwind"
import { memo } from "react";

const tw = createTw({});

interface Props {
  headerTitle: string;
  logoPublicId: string;
}
export const PdfHeader = memo(function (props: Props) {
  const { headerTitle, logoPublicId } = props
  return (
    <View fixed style={tw("h-[75pt] w-[100%] flex flex-col justify-center items-stretch gap-2 absolute top-0 left-0 pb-[6pt] px-[40pt] pt-[4pt] shrink-0")}>
      <View style={tw("flex flex-row items-center border-b border-b-stone-200 py-1")}>
        <Text style={tw("text-red-600 text-lg font-light")}>{headerTitle}</Text>
        <View style={tw('grow')} />
        <View style={tw("flex flex-col justify-end items-center px-4")}>
          <PdfCompanyLogo publicId={logoPublicId} style="max-h-[42pt]" />
        </View>
      </View>
    </View>
  )
});