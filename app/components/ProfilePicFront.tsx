import zIndex from '@mui/material/styles/zIndex';
import { X } from 'tabler-icons-react';
import { ZodNull } from 'zod';

import { useImage } from '~/hooks/usePropertyImage';
import { CLOUDINARY_CONFIG } from '~/models/plots.validations';

interface Props {
    imageId: string;
    removeImage: () => void;
}
export function ProfilePicFront(props: Props) {
    const { imageId, removeImage } = props;
    const src = useImage(imageId);
    const cloudName = CLOUDINARY_CONFIG.CLOUD_NAME;  // Replace with your Cloudinary cloud name
    const imageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${imageId}`;

    console.log('Image Source: ', imageUrl);

    return (
        <div key={imageId} className="flex flex-col max-h-48 max-w-48 justify-center items-center border-2 border-dashed border-stone-400 rounded-full relative">
            <div style={{ backgroundImage: imageUrl, zIndex: 10 }} className="rounded-48 max-h-48 max-w-48 object-contain " >
                <img src={imageUrl} alt="" className="max-h-48 max-w-48 rounded-full object-contain bg-cover" />
            </div>
        </div >
    );
}