import { Image, View } from "@react-pdf/renderer";
import { createTw } from "react-pdf-tailwind";

const tw = createTw({});

interface Props {
  base64: string;
}
export function PdfMap(props: Props) {
  if (!props.base64) {
    return null;
  }
  return (
    <View style={tw('flex flex-col justify-center items-center')}>
      <Image
        src={props.base64}
        style={tw('rounded-md p-1 items-center bg-stone-50')}
      />
    </View>
  )
}