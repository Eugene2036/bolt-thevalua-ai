import React, { useState } from 'react';
import { SecondaryButton } from './SecondaryButton';

const ImagePicker: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files && event.target.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('image', selectedFile);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            // console.log(data.message);
        } catch (error) {
            console.error('Error uploading image:', error);
        }
    };

    return (
        <div>
            <input className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                type="file" accept="image/*" onChange={handleImageChange} />
            <SecondaryButton onClick={handleUpload}>Upload</SecondaryButton>
        </div>
    );
};

export default ImagePicker;