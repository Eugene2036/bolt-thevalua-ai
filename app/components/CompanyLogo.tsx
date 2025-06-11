import React, { ComponentProps } from 'react';
import { twMerge } from 'tailwind-merge';
import { CLOUDINARY_CONFIG } from '~/models/plots.validations';

interface CloudinaryImageProps extends ComponentProps<'img'> {
    publicId: string;
    alt?: string;
}
const CompanyLogo: React.FC<CloudinaryImageProps> = (props) => {
    const { publicId, alt = 'Image', className, ...rest } = props;
    const cloudName = CLOUDINARY_CONFIG.CLOUD_NAME;  // Replace with your Cloudinary cloud name
    const imageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`;

    return (
        <img
            src={imageUrl}
            alt={alt}
            className={twMerge('rounded-lg max-h-40 max-w-48', className)}
            {...rest}
        />
    );
};

export default CompanyLogo;