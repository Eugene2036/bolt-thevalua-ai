import type { Password, User } from '@prisma/client';

import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

import { prisma } from '~/db.server';

import { sendVerificationEmail } from './emails.server';
import { EventAction, EventDomain } from './events';
import { AppLinks } from './links';

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

export async function CreateUserGroup(
  props: {
    Name: string;
    CompanyId: string;
    AllowCompanySettings: boolean,
    AllowCreateNewCompany: boolean,
    AllowCreateNewUser: boolean,
    AllowDeleteCompany: boolean,
    AllowMarkAsReviewed: boolean,
    AllowSetValuerTargets: boolean,
    AllowUnvaluedProperties: boolean,
    AllowUserActivity: boolean,
    AllowUserManagement: boolean,
    AllowValuationsDownload: boolean,
    IsSuper: boolean,
    IsInstructor: boolean,
  },
  currentUserId: string,
) {

  const { Name, CompanyId, AllowCompanySettings, AllowCreateNewCompany, AllowCreateNewUser, AllowDeleteCompany,
    AllowMarkAsReviewed, AllowSetValuerTargets, AllowUnvaluedProperties, AllowUserActivity, AllowUserManagement,
    AllowValuationsDownload, IsSuper, IsInstructor } = props;

  const verToken = faker.string.uuid();

  const numDupl = await prisma.userGroup.count({
    where: { name: Name },
  });
  if (numDupl) {
    throw new Error('A usergroup with that name already exists');
  }

  const result = await prisma.$transaction(async (tx) => {
    // const err = await sendVerificationEmail(Email, verToken);
    // if (err) {
    //     return err;
    // }
    const usergroup = await tx.userGroup.create({
      data: {
        name: Name,
        companyId: CompanyId,
        allowCompanySettings: AllowCompanySettings,
        allowCreateNewCompany: AllowCreateNewCompany,
        allowCreateNewUser: AllowCreateNewUser,
        allowDeleteCompany: AllowDeleteCompany,
        allowMarkAsReviewed: AllowMarkAsReviewed,
        allowSetValuerTargets: AllowSetValuerTargets,
        allowUnvaluedProperties: AllowUnvaluedProperties,
        allowUserActivity: AllowUserActivity,
        allowUserManagement: AllowUserManagement,
        allowValuationsDownload: AllowValuationsDownload,
        isSuper: IsSuper,
        isInstructor: IsInstructor,
      },
    });
    await tx.event.create({
      data: {
        userId: currentUserId,
        domain: EventDomain.UserGroup,
        action: EventAction.Create,
        recordId: usergroup.id,
        recordData: JSON.stringify(usergroup),
      },
    });
    return AppLinks.UserGroups(usergroup.companyId);
  });
  if (result instanceof Error) {
    throw result;
  }
  return result;
}

export async function deleteUserByEmail(email: User['email']) {
  return prisma.user.delete({ where: { email } });
}

export async function verifyLogin(email: User['email'], password: Password['hash']) {
  const userWithPassword = await prisma.user.findUnique({
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
    return null;
  }

  const { password: _password, ...userWithoutPassword } = userWithPassword;

  return userWithoutPassword;
}
