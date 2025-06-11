import { z } from 'zod';

export type UploadState = 'uploading' | 'uploaded' | 'error' | 'idle';

export interface FileUploadResult {
    publicId: string;
    url: string;
    height?: number;
    width?: number;
}

export async function handleFileUpload(file: File, CLOUD_NAME: string, UPLOAD_RESET: string) {
    return new Promise<FileUploadResult>((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_RESET);
        formData.append('tags', 'rte');
        formData.append('context', '');

        const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;

        fetch(url, { method: 'POST', body: formData })
            .then((response) => response.json())
            .then((response) => {
                const Schema = z.object({
                    public_id: z.string(),
                    url: z.string(),
                    width: z.number().optional(),
                    height: z.number().optional(),
                });
                const result = Schema.safeParse(response);
                if (!result.success) {
                    console.log('Invalid response from file upload', result.error);
                    return reject(new Error('Received invalid response from file upload'));
                }
                const { public_id: publicId, url, width, height } = result.data;
                return resolve({ publicId, url, width, height });
            })
            .catch((_) => {
                reject(new Error('Upload failed'));
            });
    });
}