import { Image } from '@react-pdf/renderer';
import { memo } from 'react';
import { createTw } from 'react-pdf-tailwind';
import { twMerge } from 'tailwind-merge';
import { toDataUri } from '~/models/images';
import { useCloudinary } from './CloudinaryContextProvider';

const tw = createTw({
    theme: {},
});

interface Props {
    publicId: string;
    base64?: { src: string; mimeType: string };
    alt?: string;
    style?: string;
}
const PdfCompanyLogo = memo(function (props: Props) {
    const { publicId, base64, style, ...rest } = props;
    const { CLOUDINARY_CLOUD_NAME } = useCloudinary();
    const imageUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`;

    return (
        <Image
            src={base64 ? toDataUri(base64.src, base64.mimeType) : imageUrl}
            style={tw(twMerge('rounded-lg max-h-[120pt] max-w-[144pt]', style))}
            {...rest}
        />
    );
});

PdfCompanyLogo.displayName = 'PdfCompanyLogo';

export default PdfCompanyLogo;

