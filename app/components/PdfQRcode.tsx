import { Image, View, Text } from "@react-pdf/renderer";
import { createTw } from "react-pdf-tailwind";

const tw = createTw({});

interface Props {
  base64: string;
}
export function PdfQRcode(props: Props) {
  if (!props.base64) {
    return null; // Ensure it doesn't render if no QR Code is provided
  }
  return (
    <View style={tw('flex flex-col justify-center items-center')}>
      <Image
        src={`data:image/png;base64,${props.base64}`} // Ensure the base64 is prefixed correctly
        style={tw('rounded-md p-1 items-center bg-stone-50 h-32 w-32')}
      />
      <View style={tw('flex flex-col items-center justify-center')}>
        <Text style={tw('text-xs text-center')}>Scan QR Code</Text>
        <Text style={tw('text-xs text-center')}>for more information</Text>
      </View>
    </View>
  );
}