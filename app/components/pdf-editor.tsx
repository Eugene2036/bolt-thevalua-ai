
import { PartialBlock } from "@blocknote/core";
import { View } from "@react-pdf/renderer";
// import { Text, View } from "@react-pdf/renderer";
import { memo } from "react";
import { createTw } from "react-pdf-tailwind";
import { blocksToPdfComponents } from "~/models/mapper";

const tw = createTw({
  theme: {},
});

interface Props {
  content: PartialBlock[];
}
export default memo(function PdfEditorClient(props: Props) {
  // export default memo(function PdfEditorClient() {
  const { content } = props;
  return (
    <View style={tw("flex flex-col items-stretch gap-4")}>
      {blocksToPdfComponents(content)}
    </View>
  );
})