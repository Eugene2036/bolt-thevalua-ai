import React from 'react';
import { CLOUDINARY_CONFIG } from '~/models/plots.validations';

interface ImageData {
    imageId: string;
}

interface ImageGalleryProps {
    images: ImageData[];
}

const CompanyPartners: React.FC<ImageGalleryProps> = ({ images }) => {
    const cloudName = CLOUDINARY_CONFIG.CLOUD_NAME;

    return (
        <div className="grid grid-cols-5 gap-4">
            {images.map((image, index) => (
                <div key={index} className="flex flex-col justify-center items-center overflow-hidden">
                    <img
                        alt='Property'
                        className="h-12"
                        src={`https://res.cloudinary.com/${cloudName}/image/upload/${image.imageId}`}
                    />
                </div>
            ))}
        </div>
    );
};

export default CompanyPartners;