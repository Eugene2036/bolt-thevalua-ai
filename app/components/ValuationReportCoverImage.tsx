import { Image } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';
import { twMerge } from 'tailwind-merge';
import { useCloudinary } from './CloudinaryContextProvider';
import { toDataUri } from '~/models/images';

const tw = createTw({});

interface Props {
    publicId: string;
    base64?: { src: string; mimeType: string };
    alt?: string;
    className?: string;
}
export default function ValuationReportCoverImage (props: Props) {
    const { base64, className, publicId, ...rest } = props;
    const { CLOUDINARY_CLOUD_NAME } = useCloudinary();
    const imageUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`;

    return (
        <Image
            src={base64 ? toDataUri(base64.src, base64.mimeType) : imageUrl}
            style={tw(twMerge('rounded-md p-1 items-center bg-stone-50', className))}
            {...rest}
        />
    );
}

