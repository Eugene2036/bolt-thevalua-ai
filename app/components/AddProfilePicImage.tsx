import type { ChangeEvent } from 'react';

import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { delay } from '~/models/dates';
import { getErrorMessage } from '~/models/errors';
import { handleImageUpload, type UploadState } from '~/models/imageUploading';

import { useCloudinary } from './CloudinaryContextProvider';
import { ImageUploadIcon } from './ImageUploadIcon';

interface Props {
    handleUploadedImages: (imageIds: string[]) => void;
    singleUpload?: boolean;
}
export function AddProfilePicImage(props: Props) {
    const { handleUploadedImages, singleUpload } = props;
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_RESET } = useCloudinary();

    const [status, setStatus] = useState<UploadState>('idle');
    const [error, setError] = useState('');

    const uploadImages = async (files: File[]) => {
        try {
            setError('');
            setStatus('uploading');

            const tooLarge = files.some((file) => file.size > 5_000_000);
            if (tooLarge) {
                throw new Error(`Please ensure you upload images less than 5MB`);
            }

            if (singleUpload && !files.length) {
                throw new Error(`Please select an image`);
            }

            const relevantFiles = singleUpload ? [files[0]] : files;

            const results = await Promise.all(
                relevantFiles.map((file) => {
                    return handleImageUpload(file, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_RESET);
                }),
            );
            handleUploadedImages(results.map((result) => result.publicId));
            setStatus('uploaded');
            await delay(2_000);
            setStatus('idle');
        } catch (error) {
            setError(getErrorMessage(error) || 'Something went wrong uploading image, please try again');
            setStatus('error');
        }
    };

    const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length) {
            await uploadImages(Array.from(event.target.files));
        }
    };

    return (
        <>
            <label
                htmlFor={`file`}
                className={twMerge(
                    'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-full group h-48 w-48',
                    'border-2 border-dashed border-stone-300 transition-all duration-300 hover:border-stone-600',
                )}
            >
                <ImageUploadIcon status={status} cursor={'pointer'} />
                {!!error && <span className="text-xs text-red-600">{error}</span>}
            </label>
            <input
                disabled={status === 'uploading'}
                onChange={handleChange}
                id="file"
                accept="image/*"
                type="file"
                multiple={!singleUpload}
                className="absolute top-0 left-0 hidden opacity-0"
            />
        </>
    );
}
