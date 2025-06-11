import type { ChangeEvent, DragEvent } from 'react';
import { useState, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

import { delay } from '~/models/dates';
import { getErrorMessage } from '~/models/errors';
import { handleImageUpload, type UploadState } from '~/models/imageUploading';

import { useCloudinary } from './CloudinaryContextProvider';
import { ImageUploadIcon } from './ImageUploadIcon';

interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
}

interface Props {
  handleUploadedImages: (imageIds: string[]) => void;
  singleUpload?: boolean;
}

export function AddImage(props: Props) {
  const { handleUploadedImages, singleUpload } = props;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_RESET } = useCloudinary();

  const [status, setStatus] = useState<UploadState>('idle');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [filesProgress, setFilesProgress] = useState<FileUploadProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImages = async (files: File[]) => {
    try {
      setError('');
      setStatus('uploading');

      // Initialize progress tracking for each file
      setFilesProgress(files.map(file => ({
        file,
        progress: 0,
        status: 'pending'
      })));

      const tooLargeFiles = files.filter(file => file.size > 5_000_000);
      if (tooLargeFiles.length > 0) {
        throw new Error(`Please ensure you upload images less than 5MB. Large files: ${tooLargeFiles.map(f => f.name).join(', ')}`);
      }

      if (singleUpload && files.length === 0) {
        throw new Error(`Please select an image`);
      }

      const relevantFiles = singleUpload ? [files[0]] : files;

      const results = await Promise.all(
        relevantFiles.map((file, index) => {
          return handleImageUpload(
            file,
            CLOUDINARY_CLOUD_NAME,
            CLOUDINARY_UPLOAD_RESET,
            (progressEvent) => {
              const progress = Math.round(
                (progressEvent.loaded * 100) / (progressEvent.total || 1)
              );
              setFilesProgress(prev => prev.map((item, i) =>
                i === index ? { ...item, progress, status: 'uploading' } : item
              ));
            }
          ).catch(error => {
            setFilesProgress(prev => prev.map((item, i) =>
              i === index ? {
                ...item,
                status: 'error',
                error: getErrorMessage(error)
              } : item
            ));
            throw error;
          });
        })
      );

      // Mark successfully uploaded files
      setFilesProgress(prev => prev.map((item, index) =>
        index < results.length ? { ...item, status: 'uploaded', progress: 100 } : item
      ));

      handleUploadedImages(results.map((result) => result.publicId));
      setStatus('uploaded');
      await delay(2_000);
      setStatus('idle');
      setFilesProgress([]);
      resetFileInput();
    } catch (error) {
      setError(getErrorMessage(error) || 'Something went wrong uploading image, please try again');
      setStatus('error');
    }
  };

  const retryUpload = async (file: File, index: number) => {
    try {
      setFilesProgress(prev => prev.map((item, i) =>
        i === index ? { ...item, status: 'uploading', error: undefined } : item
      ));

      const result = await handleImageUpload(
        file,
        CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_UPLOAD_RESET,
        (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setFilesProgress(prev => prev.map((item, i) =>
            i === index ? { ...item, progress, status: 'uploading' } : item
          ));
        }
      );

      setFilesProgress(prev => prev.map((item, i) =>
        i === index ? { ...item, status: 'uploaded', progress: 100 } : item
      ));

      handleUploadedImages([result.publicId]);
    } catch (error) {
      setFilesProgress(prev => prev.map((item, i) =>
        i === index ? {
          ...item,
          status: 'error',
          error: getErrorMessage(error)
        } : item
      ));
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

    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      await uploadImages(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="space-y-4">
      <label
        htmlFor={`file`}
        className={twMerge(
          'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-md p-6 group',
          'border-2 border-dashed transition-all duration-300',
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-stone-300 hover:border-stone-600',
          status === 'uploading' && 'opacity-70 cursor-not-allowed'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        aria-describedby="upload-instructions"
        aria-disabled={status === 'uploading'}
      >
        <ImageUploadIcon
          status={status}
          cursor={status === 'uploading' ? 'not-allowed' : 'pointer'}
        />
        <div className="text-center">
          <p className="font-medium" id="upload-instructions">
            {isDragging
              ? 'Drop your images here'
              : 'Drag and drop images here or click to browse'}
          </p>
          <p className="text-sm text-stone-500">
            {singleUpload ? 'Single image upload' : 'Multiple images allowed'}
          </p>
          <p className="text-xs text-stone-400">Max file size: 5MB</p>
        </div>
        {!!error && <span className="text-xs text-red-600">{error}</span>}
      </label>

      <input
        disabled={status === 'uploading'}
        onChange={handleChange}
        id="file"
        ref={fileInputRef}
        accept="image/*"
        type="file"
        multiple={!singleUpload}
        className="absolute top-0 left-0 hidden opacity-0"
        aria-label="File upload"
      />

      {filesProgress.length > 0 && (
        <div className="space-y-2">
          {filesProgress.map((fileProgress, index) => (
            <div key={`${fileProgress.file.name}-${index}`} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate" title={fileProgress.file.name}>
                  {fileProgress.file.name}
                </span>
                <span className="ml-2 text-stone-500">
                  {Math.round(fileProgress.file.size / 1024)} KB
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${fileProgress.status === 'error' ? 'bg-red-500' :
                      fileProgress.status === 'uploaded' ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                    style={{ width: `${fileProgress.progress}%` }}
                  />
                </div>
                {fileProgress.status === 'error' ? (
                  <button
                    onClick={() => retryUpload(fileProgress.file, index)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Retry
                  </button>
                ) : (
                  <span className="text-xs text-stone-500">
                    {fileProgress.progress}%
                  </span>
                )}
              </div>
              {fileProgress.error && (
                <p className="text-xs text-red-600">{fileProgress.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
