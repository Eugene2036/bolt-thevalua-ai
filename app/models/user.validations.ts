import { z } from 'zod';

export enum UserKind {
  Admin = 'Admin',
  Student = 'Student',
}

export const USER_KINDS = [UserKind.Admin, UserKind.Student] as const;

export const UserKindSchema = z.enum(USER_KINDS, {
  errorMap: (issue) => {
    if (issue.code === 'invalid_type') {
      return { message: 'Provide a valid user type' };
    }
    return { message: 'Provide a valid user type' };
  },
});

export function getValidatedUserKind(data: unknown) {
  const result = UserKindSchema.safeParse(data);
  if (!result.success) {
    return undefined;
  }
  return result.data;
}
