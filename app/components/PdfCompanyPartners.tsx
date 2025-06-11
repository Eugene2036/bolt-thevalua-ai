import { Image, View } from '@react-pdf/renderer';
import { memo } from 'react';
import { createTw } from 'react-pdf-tailwind';
import { toDataUri } from '~/models/images';

const tw = createTw({
    theme: {},
});

interface Props {
    images: { src: string; mimeType: string; }[];
}
const PdfCompanyPartners = memo((props: Props) => {
    const { images } = props;
    return images.map((base64, index) => (
        <View key={index} style={tw("p-2 w-[20%] flex flex-col justify-center items-center overflow-hidden")}>
            <Image
                style={tw("h-[48px] rounded-md")}
                src={toDataUri(base64.src, base64.mimeType)}
            />
        </View>
    ))
});

PdfCompanyPartners.displayName = 'PdfCompanyPartners';

export default PdfCompanyPartners;