import { z } from 'zod';

export type UploadState = 'uploading' | 'uploaded' | 'error' | 'idle';

export interface ImageUploadResult {
  publicId: string;
  url: string;
  height: number;
  width: number;
}

export async function handleImageUpload(file: File, CLOUD_NAME: string, UPLOAD_RESET: string) {
  return new Promise<ImageUploadResult>((resolve, reject) => {
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
          width: z.number(),
          height: z.number(),
        });
        const result = Schema.safeParse(response);
        if (!result.success) {
          console.log('Invalid response from image upload', result.error);
          return reject(new Error('Received invalid response from image upload'));
        }
        const { public_id: publicId, url, width, height } = result.data;
        return resolve({ publicId, url, width, height });
      })
      .catch((_) => {
        reject(new Error('Upload failed'));
      });
  });
}
