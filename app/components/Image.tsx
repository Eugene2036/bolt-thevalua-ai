import { X } from 'tabler-icons-react';
import { useImage } from '~/hooks/usePropertyImage';
import { CLOUDINARY_CONFIG } from '~/models/plots.validations';

interface Props {
  imageId: string;
  disabled?: boolean;
  removeImage: () => void;
}
export function Image(props: Props) {
  const { imageId, removeImage, disabled } = props;
  const src = useImage(imageId);
  const cloudName = CLOUDINARY_CONFIG.CLOUD_NAME;  // Replace with your Cloudinary cloud name
  const imageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${imageId}`;

  console.log('Image Source: ', imageUrl);

  return (
    <div key={imageId} className="flex flex-col items-stretch border-2 border-dashed border-stone-400 rounded-md relative">
      {
        !disabled && (
          <button
            onClick={removeImage}
            className="cursor-pointer absolute right-2 top-2 z-20 flex flex-col justify-center items-center p-2 bg-red-100 rounded-md transition-all duration-300 hover:bg-red-200"
          >
            <X className="text-red-600" />
          </button>
        )
      }
      <div style={{ backgroundImage: imageUrl, zIndex: 10 }} className="h-[240px] object-contain " >
        <img src={imageUrl} alt="Property" className="h-[240px] object-contain bg-cover bg-center" />
      </div>
    </div >
  );
}
