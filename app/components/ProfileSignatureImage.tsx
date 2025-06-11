import zIndex from '@mui/material/styles/zIndex';
import { X } from 'tabler-icons-react';
import { ZodNull } from 'zod';

import { useImage } from '~/hooks/usePropertyImage';
import { CLOUDINARY_CONFIG } from '~/models/plots.validations';

interface Props {
    imageId: string;
    removeImage: () => void;
}
export function ProfileSignatureImage(props: Props) {
    const { imageId, removeImage } = props;
    const src = useImage(imageId);
    const cloudName = CLOUDINARY_CONFIG.CLOUD_NAME;  // Replace with your Cloudinary cloud name
    const imageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${imageId}`;

    console.log('Image Source: ', imageUrl);

    return (
        <div key={imageId} className="relative flex flex-col w-full">
            <button
                onClick={removeImage}
                className="cursor-pointer absolute right-2 top-2 z-20 flex flex-col justify-center items-center p-2 bg-red-100 rounded-full transition-all duration-300 hover:bg-red-200 w-6 h-6"
            >
                <X className="text-red-600" />
            </button>

            <div style={{ backgroundImage: imageUrl, backgroundPosition: 'center', background: 'cover', zIndex: 10, alignContent: 'center' }} className="h-full w-full overflow-hidden rounded-xl" >
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            </div>

        </div >
    );
}