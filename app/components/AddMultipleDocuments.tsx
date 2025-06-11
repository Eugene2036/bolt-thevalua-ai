import { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { delay } from '~/models/dates';
import { getErrorMessage } from '~/models/errors';
import { handleFileUpload, type UploadState } from '~/models/fileUploading';
import { useCloudinary } from './CloudinaryContextProvider';

interface Props {
    handleUploadedFiles?: (fileNames: string[], fileUrls: string[], fileTypes: string[]) => void;
    maxFileSize?: number; // in bytes
    acceptedFileTypes?: string[];
    maxFiles?: number;
}

export function AddMultipleDocuments({
    handleUploadedFiles = () => { },
    maxFileSize = 5_000_000, // 5MB default
    acceptedFileTypes = ['.pdf', '.docx', '.doc', '.xls', '.xlsx', 'image/*'],
    maxFiles = 10,
}: Props) {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_RESET } = useCloudinary();

    const [status, setStatus] = useState<UploadState>('idle');
    const [error, setError] = useState('');
    const [fileUrls, setFileUrls] = useState<{
        url: string;
        fileType: 'image' | 'document' | 'pdf';
        fileName: string
    }[]>([]);
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

        if (files.length > maxFiles) {
            throw new Error(`You can upload a maximum of ${maxFiles} files at once`);
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
                    .join(', ')}. Accepted types: ${acceptedFileTypes.join(', ')}`
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
                    handleFileUpload(file, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_RESET)
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
                filesWithDetails.map((file) => file.fileType)
            );

            setFileUrls(prev => [...prev, ...filesWithDetails]);
            setStatus('uploaded');
            await delay(2000);
            setStatus('idle');
        } catch (error) {
            setError(getErrorMessage(error));
            setStatus('error');
        }
    };

    const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.length) {
            await uploadFiles(Array.from(event.target.files));
            event.target.value = ''; // Reset input
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
        // Optionally call handleUploadedFiles with updated list if needed
    };

    return (
        <div className="space-y-2">
            <div className='grid grid-cols-2 gap-4'>
                <div className="flex flex-col items-stretch">
                    <label
                        htmlFor="multiple_files"
                        className={twMerge(
                            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md p-2',
                            ' transition-all duration-300 bg-teal-600 h-36',
                            isDragging
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-stone-300 hover:border-stone-600',
                            status === 'uploading' && 'opacity-70 cursor-not-allowed'
                        )}
                        onDragEnter={handleDragEvents}
                        onDragOver={handleDragEvents}
                        onDragLeave={handleDragEvents}
                        onDrop={handleDrop}
                    >
                        {/* <FileUploadIcon className='text-white' status={status} cursor="pointer" /> */}
                        <div className="text-center">
                            <p className="font-light text-white">
                                {isDragging
                                    ? 'Drop files here'
                                    : 'Click to browse or drag and drop files'}
                            </p>
                            <p className="text-sm text-white">
                                Accepted: {acceptedFileTypes.join(', ')} (max {maxFileSize / 1_000_000}MB each)
                            </p>
                            {maxFiles > 1 && (
                                <p className="text-sm text-white">
                                    Max {maxFiles} files
                                </p>
                            )}
                        </div>
                        {error && (
                            <span className="text-xs text-red-600 max-w-xs text-center">
                                {error}
                            </span>
                        )}
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
                            <h3 className="text-sm font-extralight">Uploaded files ({fileUrls.length}):</h3>
                            <ul className="divide-y divide-stone-200 rounded-md border border-stone-200">
                                {fileUrls.map((file, index) => (
                                    <li
                                        key={`${file.url}-${index}`}
                                        className="flex items-center justify-between p-3 hover:bg-stone-50"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-sm truncate" title={file.fileName}>
                                                {file.fileName}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="text-red-500 hover:text-red-700 p-1"
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





// import { useState } from 'react';
// import { twMerge } from 'tailwind-merge';
// import { delay } from '~/models/dates';
// import { getErrorMessage } from '~/models/errors';
// import { handleFileUpload, type UploadState } from '~/models/fileUploading';
// import { useCloudinary } from './CloudinaryContextProvider';
// import { FileUploadIcon } from './FileUploadIcon';

// interface Props {
//     handleUploadedFiles?: (fileNames: string[], fileUrls: string[], fileTypes: string[]) => void;
// }

// export function AddMultipleDocuments({ handleUploadedFiles = (fileNames: string[], fileUrls: string[], fileTypes: string[]) => { } }: Props) {
//     const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_RESET } = useCloudinary();

//     const [status, setStatus] = useState<UploadState>('idle');
//     const [error, setError] = useState('');
//     const [fileUrls, setFileUrls] = useState<{ url: string; fileType: 'image' | 'document' | 'pdf'; fileName: string }[]>([]);

//     const getFileType = (file: File): 'image' | 'document' | 'pdf' => {
//         if (file.type.startsWith('image/')) {
//             return 'image';
//         } else if (file.type === 'application/pdf') {
//             return 'pdf';
//         } else {
//             return 'document';
//         }
//     };

//     const uploadFiles = async (files: File[]) => {
//         try {
//             setError('');
//             setStatus('uploading');

//             const tooLarge = files.some((file) => file.size > 5_000_000);
//             if (tooLarge) {
//                 throw new Error('Please ensure you upload files less than 5MB');
//             }

//             if (!files.length) {
//                 throw new Error('Please select at least one file');
//             }

//             const results = await Promise.all(
//                 files.map((file) => handleFileUpload(file, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_RESET))
//             );
//             const publicIds = results.map((result) => result.publicId);

//             const filesWithDetails = files.map((file, index) => ({
//                 url: publicIds[index], // Store only the publicId (asset ID) instead of the full URL
//                 fileType: getFileType(file),
//                 fileName: file.name,
//             }));

//             handleUploadedFiles(
//                 filesWithDetails.map((file) => file.fileName),
//                 filesWithDetails.map((file) => file.url), // Pass only the asset ID
//                 filesWithDetails.map((file) => file.fileType)
//             );
//             setFileUrls(filesWithDetails);
//             setStatus('uploaded');
//             await delay(2000);
//             setStatus('idle');
//         } catch (error) {
//             setError(getErrorMessage(error) || 'Something went wrong uploading files, please try again');
//             setStatus('error');
//         }
//     };

//     const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
//         if (event.target.files && event.target.files.length) {
//             await uploadFiles(Array.from(event.target.files));
//         }
//     };

//     const removeFile = (index: number) => {
//         const updatedFiles = fileUrls.filter((_, i) => i !== index);
//         setFileUrls(updatedFiles);
//     };

//     return (
//         <div>
//             <label
//                 htmlFor="multiple_files"
//                 className={twMerge(
//                     'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-md group',
//                     'border-2 border-dashed border-stone-300 transition-all duration-300 hover:border-stone-600',
//                 )}
//             >
//                 <FileUploadIcon status={status} cursor="pointer" />
//                 {error && <span className="text-xs text-red-600">{error}</span>}
//             </label>
//             <input
//                 disabled={status === 'uploading'}
//                 onChange={handleChange}
//                 id="multiple_files"
//                 accept=".pdf, .docx, .doc, .xls, .xlsx, image/*"
//                 type="file"
//                 multiple
//                 className="absolute top-0 left-0 hidden opacity-0"
//             />
//         </div>
//     );
// }


