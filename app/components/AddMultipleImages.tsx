import type { ChangeEvent, DragEvent } from 'react';

import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { delay } from '~/models/dates';
import { getErrorMessage } from '~/models/errors';
import { handleImageUpload, type UploadState } from '~/models/imageUploading';

import { useCloudinary } from './CloudinaryContextProvider';
import { ImageUploadIcon } from './ImageUploadIcon';

interface Props {
  handleUploadedImages: (imageIds: string[]) => void;
}
export function AddMultipleImages(props: Props) {
  const { handleUploadedImages } = props;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_RESET } = useCloudinary();

  const [status, setStatus] = useState<UploadState>('idle');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const uploadImages = async (files: File[]) => {
    try {
      setError('');
      setStatus('uploading');

      const tooLarge = files.some((file) => file.size > 5_000_000);
      if (tooLarge) {
        throw new Error(`Please ensure you upload images less than 5MB`);
      }

      if (!files.length) {
        throw new Error(`Please select an image`);
      }

      if (files.length > 8) {
        throw new Error(`You can upload a maximum of 8 images`);
      }

      const relevantFiles = files;

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

  const handleDragEnter = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadImages(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <>
      <label
        htmlFor={`multiple_files`}
        className={twMerge(
          'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-md group',
          'border-2 border-dashed border-stone-300 transition-all duration-300 hover:border-stone-600',
          isDragging && 'border-stone-600 bg-stone-100',
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <ImageUploadIcon status={status} cursor={'pointer'} />
        {!!error && <span className="text-xs text-red-600">{error}</span>}
        <span className="text-sm text-stone-500">
          {isDragging ? 'Drop images here' : 'Drag & drop images here or click to browse'}
        </span>
      </label>
      <input
        disabled={status === 'uploading'}
        onChange={handleChange}
        id="multiple_files"
        accept="image/*"
        type="file"
        multiple
        className="absolute top-0 left-0 hidden opacity-0"
      />
    </>
  );
}
