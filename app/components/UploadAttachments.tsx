import React, { useState } from 'react';

const UploadToCloudinaryWithDB: React.FC = () => {
    const [files, setFiles] = useState<FileList | null>(null);
    const [uploading, setUploading] = useState<boolean>(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFiles(event.target.files);
    };

    const uploadFiles = async () => {
        if (!files) return;

        setUploading(true);
        const uploadedFileData = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'your_upload_preset'); // Replace with your Cloudinary upload preset

            try {
                const response = await fetch('https://api.cloudinary.com/v1_1/deacmcthw/upload', {
                    method: 'POST',
                    body: formData,
                });

                const data = await response.json();
                uploadedFileData.push({
                    fileName: file.name,
                    fileUrl: data.secure_url,
                });
            } catch (error) {
                console.error('Error uploading file:', error);
            }
        }

        await saveFileDataToDB(uploadedFileData);
        setUploading(false);
    };

    const saveFileDataToDB = async (fileData: Array<{ fileName: string; fileUrl: string }>) => {
        try {
            await fetch('/api/saveAttachments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ attachments: fileData }),
            });
        } catch (error) {
            console.error('Error saving file data to database:', error);
        }
    };

    return (
        <div>
            <input type="file" multiple onChange={handleFileChange} />
            <button onClick={uploadFiles} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
        </div>
    );
};

export default UploadToCloudinaryWithDB;