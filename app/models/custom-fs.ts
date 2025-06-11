import { writeFile } from 'fs/promises';

import { getErrorMessage } from './errors';

export async function writeToFile(path: string, content: string) {
  try {
    await writeFile(path, content);
  } catch (error) {
    return new Error(getErrorMessage(error));
  }
}
