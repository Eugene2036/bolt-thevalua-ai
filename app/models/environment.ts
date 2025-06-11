import { z } from 'zod';

import { PresentStringSchema } from './core.validations';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  SESSION_SECRET: PresentStringSchema,
  LOOPS_API_KEY: PresentStringSchema,
  LOOPS_HOST: PresentStringSchema,
  CLOUDINARY_API_KEY: PresentStringSchema,
  CLOUDINARY_API_SECRET: PresentStringSchema,
  CLOUDINARY_CLOUD_NAME: PresentStringSchema,
  CLOUDINARY_UPLOAD_RESET: PresentStringSchema,
  INSTANCE_URL: PresentStringSchema,
  ESRI_USERNAME: PresentStringSchema,
  ESRI_PASSWORD: PresentStringSchema,
  ESRI_FILE_PATH: PresentStringSchema,
  ESRI_STRUCTURE_PATH: PresentStringSchema,
});

const result = EnvSchema.safeParse(process.env);
if (!result.success) {
  console.error('Env Var Errors:', result.error.flatten());
  process.exit(1);
}
export const Env = result.data;
