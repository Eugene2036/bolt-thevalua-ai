import React from 'react';
import { saveAs } from 'file-saver';
import { CLOUDINARY_CONFIG } from '~/models/plots.validations';

interface CloudinaryImageProps {
  publicId: string;
  alt?: string;
}

const DownloadFileFromCloudinary: React.FC<CloudinaryImageProps> = ({ publicId, alt = 'Image' }) => {
  const handleDownload = async () => {
    try {
      // Direct URL to the file
      const cloudName = CLOUDINARY_CONFIG.CLOUD_NAME;  // Replace with your Cloudinary cloud name
      const url = `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${publicId}`;

      // Fetch the file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      // Extract the file name from the URL or Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = 'downloaded_file'; // Default file name

      if (contentDisposition && contentDisposition.includes('filename=')) {
        // Extract filename from the Content-Disposition header
        fileName = contentDisposition
          .split('filename=')[1]
          .split(';')[0]
          .replace(/['"]/g, ''); // Remove quotes
      } else {
        // Fallback: Extract file name from the URL
        const urlParts = url.split('/');
        fileName = urlParts[urlParts.length - 1]; // Use the last part of the URL as the file name
      }

      // Trigger the download
      const blob = await response.blob();
      saveAs(blob, fileName);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  return (
    <div onClick={handleDownload} style={{ cursor: 'pointer' }} aria-label="Download file">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </div>
  );
};

export default DownloadFileFromCloudinary;