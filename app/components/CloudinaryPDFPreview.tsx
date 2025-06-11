import React, { useState, useEffect } from 'react';
import { CLOUDINARY_CONFIG } from '~/models/plots.validations';

interface PDFPreviewProps {
  publicId: string;
  width?: number | string;
  height?: number | string;
  className?: string;
}

const CloudinaryPDFPreview: React.FC<PDFPreviewProps> = ({
  publicId,
  width = '100%',
  height = '100vh',
  className = '',
}) => {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicId) {
      setError('Public ID is required');
      return;
    }

    // Construct the Cloudinary PDF URL without version number
    const cloudinaryUrl = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.CLOUD_NAME}/image/upload/${publicId}.pdf`;

    setPdfUrl(cloudinaryUrl);
    setLoading(false);
  }, [publicId]);

  if (error) {
    return <div className={`pdf-preview-error ${className}`}>Error: {error}</div>;
  }

  if (loading) {
    return <div className={`pdf-preview-loading ${className}`}>Loading PDF...</div>;
  }

  return (
    <div className={`pdf-preview-container ${className}`}>
      <iframe
        src={`${pdfUrl}#view=fitH`}
        width={width}
        height={height}
        title="Report Preview"
        style={{ border: 'none', height: '100vh' }}
      />
    </div>
  );
};

export default CloudinaryPDFPreview;

