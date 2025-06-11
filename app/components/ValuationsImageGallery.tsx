import { CLOUDINARY_CONFIG } from "~/models/plots.validations";

interface Props {
    images: string[];
}
export function ValuationsImageGallery(props: Props) {
    const { images } = props;

    const cloudName = CLOUDINARY_CONFIG.CLOUD_NAME;

    return (
        <div className="grid grid-cols-2 gap-6">
            {images.map((imageId) => (
                <img key={imageId}
                    src={`https://res.cloudinary.com/${cloudName}/image/upload/${imageId}`}
                    alt='Property' className='rounded-lg'
                />
            ))}
        </div>
    );
}