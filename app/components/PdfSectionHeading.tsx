import { Text, View } from "@react-pdf/renderer";
import { ComponentProps } from "react";
import { createTw } from "react-pdf-tailwind";
import { twMerge } from "tailwind-merge";
import { UpdateTocProps } from "./TableOfContentsProvider";

const tw = createTw({
  theme: {},
});

interface Props extends Omit<ComponentProps<typeof View>, 'children' | string> {
  children: string;
  style?: string;
  updateToc?: (props: UpdateTocProps) => void;
  tocDone?: boolean;
  index: number;
}
export function PdfSectionHeading(props: Props) {
  const { index, updateToc, tocDone, children, style: className, ...rest } = props
  return (
    <View style={tw(twMerge("border-b border-stone-600 flex flex-col items-start justify-center py-2", className))} {...rest}>
      <Text
        style={tw("hidden")}
        render={({ pageNumber }) => {
          if (!tocDone && updateToc) {
            updateToc({ pageNumber, customIndex: index })
          }
          return '';
        }}
      />
      <Text
        id={`Section_${children.split(' ').join("_")}_${index}`}
        style={tw("text-lg font-semibold text-red-600")}
      >
        {children}
      </Text>
    </View>
  )
}