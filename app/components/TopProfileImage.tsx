import { useImage } from '~/hooks/usePropertyImage';
import { CLOUDINARY_CONFIG } from '~/models/plots.validations';

interface Props {
  imageId: string;
  removeImage: () => void;
}
export function TopProfileImage(props: Props) {
  const { imageId, removeImage } = props;
  const src = useImage(imageId);
  const cloudName = CLOUDINARY_CONFIG.CLOUD_NAME;  // Replace with your Cloudinary cloud name
  const imageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${imageId}`;

  console.log('Image Source: ', imageUrl);

  return (
    <div key={imageId} className="relative flex flex-col h-[50px] w-[50px]">
      <div className="h-full w-full overflow-hidden rounded-full">
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          defaultValue="https://asset.cloudinary.com/deacmcthw/8a8be013acf0642d965ab2e4de6d944f"
        />
      </div>
    </div>
  );
}
