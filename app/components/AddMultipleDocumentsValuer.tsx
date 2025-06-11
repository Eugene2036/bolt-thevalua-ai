import { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { delay } from '~/models/dates';
import { getErrorMessage } from '~/models/errors';
import { handleFileUpload, type UploadState } from '~/models/fileUploading';
import { useCloudinary } from './CloudinaryContextProvider';
import { FileUploadIcon } from './FileUploadIcon';

interface Props {
    handleUploadedFiles?: (
        fileNames: string[],
        fileUrls: string[],
        fileTypes: string[],
        createdBy: string[]
    ) => void;
    maxFileSize?: number; // in bytes
    acceptedFileTypes?: string[];
}

export function AddMultipleDocumentsValuer({
    handleUploadedFiles = () => { },
    maxFileSize = 5_000_000, // 5MB default
    acceptedFileTypes = ['.pdf', '.docx', '.doc', '.xls', '.xlsx', 'image/*'],
}: Props) {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_RESET } = useCloudinary();
    const [status, setStatus] = useState<UploadState>('idle');
    const [error, setError] = useState('');
    const [fileUrls, setFileUrls] = useState<
        { url: string; fileType: 'image' | 'document' | 'pdf'; fileName: string }[]
    >([]);
    const [isDragging, setIsDragging] = useState(false);

    const getFileType = (file: File): 'image' | 'document' | 'pdf' => {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type === 'application/pdf') return 'pdf';
        return 'document';
    };

    const validateFiles = (files: File[]) => {
        if (!files.length) {
            throw new Error('Please select at least one file');
        }

        const invalidFiles = files.filter(
            (file) => !acceptedFileTypes.some((type) => {
                if (type === 'image/*') return file.type.startsWith('image/');
                return file.name.toLowerCase().endsWith(type);
            })
        );

        if (invalidFiles.length) {
            throw new Error(
                `Invalid file type(s): ${invalidFiles
                    .map((f) => f.name)
                    .join(', ')}`
            );
        }

        const tooLargeFiles = files.filter((file) => file.size > maxFileSize);
        if (tooLargeFiles.length) {
            throw new Error(
                `Files too large (max ${maxFileSize / 1_000_000}MB): ${tooLargeFiles
                    .map((f) => f.name)
                    .join(', ')}`
            );
        }
    };

    const uploadFiles = async (files: File[]) => {
        try {
            setError('');
            setStatus('uploading');
            validateFiles(files);

            const results = await Promise.all(
                files.map((file) =>
                    handleFileUpload(
                        file,
                        CLOUDINARY_CLOUD_NAME,
                        CLOUDINARY_UPLOAD_RESET
                    )
                )
            );

            const filesWithDetails = files.map((file, index) => ({
                url: results[index].publicId,
                fileType: getFileType(file),
                fileName: file.name,
            }));

            handleUploadedFiles(
                filesWithDetails.map((file) => file.fileName),
                filesWithDetails.map((file) => file.url),
                filesWithDetails.map((file) => file.fileType),
                ['Valuer'] // You might want to pass actual creator info here
            );

            setFileUrls(filesWithDetails);
            setStatus('uploaded');
            await delay(2000);
            setStatus('idle');
        } catch (error) {
            setError(getErrorMessage(error));
            setStatus('error');
        }
    };

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            await uploadFiles(Array.from(e.target.files));
            e.target.value = ''; // Reset input to allow re-uploading same files
        }
    };

    const handleDragEvents = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    };

    const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files?.length) {
            await uploadFiles(Array.from(e.dataTransfer.files));
        }
    };

    const removeFile = (index: number) => {
        const updatedFiles = fileUrls.filter((_, i) => i !== index);
        setFileUrls(updatedFiles);
        // You might want to also call handleUploadedFiles with the updated list
    };

    return (
        <div className="space-y-2">
            <div className='grid grid-cols-1 gap-4 w-full'>
                <div className="flex flex-col items-stretch">
                    <label
                        htmlFor="multiple_files"
                        className={twMerge(
                            'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-md p-8',
                            'border-2 border-dashed transition-all duration-300',
                            isDragging
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-stone-300 hover:border-stone-600',
                            status === 'uploading' && 'opacity-70'
                        )}
                        onDragEnter={handleDragEvents}
                        onDragOver={handleDragEvents}
                        onDragLeave={handleDragEvents}
                        onDrop={handleDrop}
                    >
                        <FileUploadIcon status={status} cursor="pointer" />
                        <div className="text-center">
                            <p className="font-medium">
                                {isDragging
                                    ? 'Drop files here'
                                    : 'Click to browse or drag and drop files'}
                            </p>
                            <p className="text-sm text-stone-500">
                                Accepted: {acceptedFileTypes.join(', ')} (max {maxFileSize / 1_000_000}MB)
                            </p>
                        </div>
                        {error && <span className="text-xs text-red-600">{error}</span>}
                    </label>

                    <input
                        disabled={status === 'uploading'}
                        onChange={handleChange}
                        id="multiple_files"
                        accept={acceptedFileTypes.join(',')}
                        type="file"
                        multiple
                        className="absolute top-0 left-0 hidden opacity-0"
                    />
                </div>
                {/* <div className="flex flex-col items-stretch">
                    {fileUrls.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-teal-600">Uploaded files:</h3>
                            <ul className="divide-y divide-stone-200 rounded-md border border-stone-200">
                                {fileUrls.map((file, index) => (
                                    <li
                                        key={file.url}
                                        className="flex items-center justify-between p-2 text-sm font-extralight text-teal-600"
                                    >
                                        <span className="truncate">{file.fileName}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="text-red-500 hover:text-red-700"
                                            aria-label={`Remove ${file.fileName}`}
                                        >
                                            ×
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div> */}
            </div>
        </div>
    );
}