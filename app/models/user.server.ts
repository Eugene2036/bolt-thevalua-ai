import type { Password, User } from '@prisma/client';

import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

import { prisma } from '~/db.server';

import { sendVerificationEmail } from './emails.server';
import { EventAction, EventDomain } from './events';
import { Env } from './environment';
import { getErrorMessage } from './errors';

export type { User } from '@prisma/client';

export async function getUserById(id: User['id']) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: User['email']) {
  return prisma.user.findUnique({ where: { email } });
}

export function createHashedPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function createUser(
  props: {
    email: User['email'];
    emailConfirmation: User['email'];
    firstName: string;
    lastName: string;
    isSuper: boolean;
    isSignatory: boolean;
    userGroupId: string;
    isVerified: boolean;
    firm?: string;
  },
  currentUserId: string,
) {
  const { email, emailConfirmation, firstName, lastName, isSuper, isSignatory, isVerified, userGroupId, firm } = props;

  // Validate input parameters
  if (!email || !firstName || !lastName || !firm) {
    throw new Error('Missing required fields');
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email format');
  }

  const verToken = faker.string.uuid();

  // Check for existing user with the same email
  const existingUser = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error('A user with that email already exists');
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Send verification email
      const err = await sendVerificationEmail(email, verToken, 'cm87ol4wv007ko4945vtbo0ur', firstName + ' ' + lastName, '', '', '', '', '', '', '', '', '', email, Env.INSTANCE_URL);
      if (err) {
        return err;
      }

      // Create the user
      const user = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          isSuper,
          isSignatory,
          isVerified,
          userGroupId,
          verToken,
          firm,
        },
      });

      // Log the creation event
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.User,
          action: EventAction.Create,
          recordId: user.id,
          recordData: JSON.stringify(user),
        },
      });

      return user;
    });

    return result;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error(getErrorMessage(error));
  }
}

export async function deleteUserByEmail(email: User['email']) {
  return prisma.user.delete({ where: { email } });
}

export async function verifyLogin(email: User['email'], password: Password['hash']) {
  const userWithPassword = await prisma.user.findFirst({
    where: { email },
    include: { password: true },
  });

  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }
  if (userWithPassword.isSuspended || !userWithPassword.isVerified) {
    return null;
  }

  const isValid = await bcrypt.compare(password, userWithPassword.password.hash);

  if (!isValid) {
    console.log("Wrong password for user:", email);
    return null;
  }

  const { password: _password, ...userWithoutPassword } = userWithPassword;

  return userWithoutPassword;
}


/**
 * Handles first-time login or password reset with validation.
 * @param userId - User ID (or email if token-based).
 * @param newPassword - New password.
 * @param options - Optional: verification token, skip verification, or enforce strength check.
 * @returns Updated user or throws error.
 */
export async function firstTimeLoginSetPassword(
  userId: User['id'] | User['email'],
  newPassword: string,
  options?: {
    verToken?: string | null;
    skipVerification?: boolean;
    enforceStrength?: boolean;
  },
) {
  // Input validation
  if (!userId || !newPassword) {
    throw new Error('User ID and new password are required.');
  }

  if (options?.enforceStrength && !isPasswordStrong(newPassword)) {
    throw new Error(
      'Password must be at least 8 characters with 1 number, 1 symbol, and mixed case.',
    );
  }

  // Find user with optional token verification
  const whereClause = options?.verToken && !options.skipVerification
    ? {
      OR: [{ id: userId as string }, { email: userId as string }],
      verToken: options.verToken,
    }
    : {
      OR: [{ id: userId as string }, { email: userId as string }],
    };

  const user = await prisma.user.findFirst({
    where: whereClause,
  });

  if (!user) {
    throw new Error(options?.verToken
      ? 'Invalid or expired verification token.'
      : 'User not found.');
  }

  // Update password and clear token
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  try {
    await prisma.$transaction([
      prisma.password.upsert({
        where: { userId: user.id },
        update: { hash: hashedPassword },
        create: { userId: user.id, hash: hashedPassword },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          verToken: '',
        },
      }),
      prisma.event.create({
        data: {
          userId: user.id,
          domain: EventDomain.User,
          action: EventAction.Update,
          recordId: user.id,
          recordData: JSON.stringify({ action: 'password_reset' }),
        },
      }),
    ]);

    return user;
  } catch (error) {
    console.error('Password update failed:', error);
    throw new Error('Failed to update password. Please try again.');
  }
}

function isPasswordStrong(password: string): boolean {
  const minLength = 8;
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);

  return (
    password.length >= minLength &&
    hasNumber &&
    hasSymbol &&
    hasUpperCase &&
    hasLowerCase
  );
}