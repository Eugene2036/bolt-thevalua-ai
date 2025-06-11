import { Image, View } from "@react-pdf/renderer";
import { createTw } from "react-pdf-tailwind";
import { toDataUri } from "~/models/images";

const tw = createTw({
    theme: {},
});

interface Props {
    images: { src: string; mimeType: string }[];
}
export function PdfValuationsImageGallery (props: Props) {
    const { images } = props;
    return (
        <View style={tw("flex flex-row flex-wrap")}>
            {images.map((base64, index) => (
                <View key={index} style={tw('w-1/2 flex flex-col justify-center items-center p-[6pt]')}>
                    <Image
                        style={tw('rounded-lg h-[200px] max-w-[100%]')}
                        src={toDataUri(base64.src, base64.mimeType)}
                    />
                </View>
            ))}
        </View>
    );
}