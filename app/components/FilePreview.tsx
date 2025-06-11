import { X } from 'tabler-icons-react';
import { FaFilePdf, FaFileImage, FaFileWord, FaFileExcel, FaFileAlt } from 'react-icons/fa';
import { CLOUDINARY_CONFIG } from '~/models/plots.validations';
import { useState } from 'react';
import CloudinaryPDFPreview from './CloudinaryPDFPreview'; // Adjust the import path as needed

interface Props {
  fileId: string;
  removeFile: () => void;
  fileType: 'image' | 'document' | 'pdf';
  fileName: string;
  hideRemoveButton?: boolean;
}

export function FilePreview(props: Props) {
  const { fileId, removeFile, fileType, fileName, hideRemoveButton = false } = props;
  const [showPreview, setShowPreview] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const cloudName = CLOUDINARY_CONFIG.CLOUD_NAME;

  const fileUrl = `https://res.cloudinary.com/${cloudName}/${fileType === 'image' ? 'image/upload' : 'raw/upload'
    }/${fileId}`;

  const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
  const isDocument = fileType === 'document';
  const isImage = fileType === 'image';
  const isPdf = fileType === 'pdf';

  const handlePreview = () => {
    setIsAnimating(true);
    setShowPreview(true);
  };

  const closePreview = () => {
    setIsAnimating(false);
    setTimeout(() => setShowPreview(false), 300); // Match this with the fade-out duration
  };

  const renderPreviewContent = () => {
    if (isImage) {
      return (
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-full max-h-[80vh] object-contain"
        />
      );
    }

    if (isPdf) {
      return (
        <CloudinaryPDFPreview
          publicId={fileId}
          width="100%"
          height="100%"
          className="w-full h-full"
        />
      );
    }

    // Handle document types
    switch (fileExtension) {
      case 'doc':
      case 'docx':
      case 'xls':
      case 'xlsx':
        return (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
            width="100%"
            height="100%"
            frameBorder="0"
            className="min-h-[70vh]"
            title={`${fileName} preview`}
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <FaFileAlt className="text-6xl text-gray-400 mb-4" />
            <p className="text-lg text-gray-600">Preview not available for this file type</p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 text-blue-600 hover:underline"
            >
              Download file
            </a>
          </div>
        );
    }
  };

  const renderFileIcon = () => {
    if (isImage) return <FaFileImage className="h-8 w-8 text-teal-600" />;
    if (isPdf) return <FaFilePdf className="h-8 w-8 text-teal-600" />;

    switch (fileExtension) {
      case 'doc':
      case 'docx':
        return <FaFileWord className="h-8 w-8 text-teal-600" />;
      case 'xls':
      case 'xlsx':
        return <FaFileExcel className="h-8 w-8 text-teal-600" />;
      default:
        return <FaFileAlt className="h-8 w-8 text-teal-600" />;
    }
  };

  return (
    <div className="grid grid-col-4 items-stretch border-2 border-dashed border-stone-400 rounded-md relative">
      {!hideRemoveButton && (
        <button
          onClick={removeFile}
          className="cursor-pointer absolute right-2 top-2 z-20 flex flex-col justify-center items-center p-2 bg-red-100 rounded-md transition-all duration-300 hover:bg-red-200"
        >
          <X className="text-red-600" />
        </button>
      )}
      <div className="h-[100px] w-full flex items-center justify-center">
        <div
          className="flex flex-col items-center justify-center h-full w-full cursor-pointer p-1"
          onClick={handlePreview}
        >
          {renderFileIcon()}
          <p className="mt-2 text-sm text-gray-600 line-clamp-2 text-center">{fileName}</p>
        </div>
      </div>

      {/* Preview Modal with fade animations */}
      {showPreview && (
        <div style={{ zIndex: 2000 }} className={`
          fixed inset-0 bg-black z-50 flex items-center justify-center p-4
          transition-opacity duration-300 ease-in-out
          ${isAnimating ? 'bg-opacity-75' : 'bg-opacity-0'}
        `}>
          <div className={`
            relative bg-white rounded-lg max-h-[90vh] w-[90%] max-w-[90%] flex flex-col
            transition-all duration-300 ease-in-out
            ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
          `}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium">{fileName}</h3>
              <button
                onClick={closePreview}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <X className="text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              {renderPreviewContent()}
            </div>
            <div className="p-4 border-t flex justify-end">
              <a
                onClick={closePreview}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Close
              </a>
              {/* <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Download
              </a> */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
