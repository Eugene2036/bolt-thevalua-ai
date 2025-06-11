import type { Company, Password, User } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import { prisma } from '~/db.server';
import { EventAction, EventDomain } from './events';
export type { User } from '@prisma/client';
export async function getUserById(id: User['id']) {
    return prisma.user.findUnique({ where: { id } });
}
export async function getCompanyById(id: Company['id']) {
    return prisma.company.findUnique({ where: { id } });
}
export async function getUserByEmail(email: User['email']) {
    return prisma.user.findUnique({ where: { email } });
}
export async function getCompanyByEmail(Email: Company['Email']) {
    return prisma.company.findUnique({ where: { Email } });
}
export function createHashedPassword(password: string) {
    return bcrypt.hash(password, 10);
}
export async function CreateReportSubHeader(
    props: {
        subHeaderTitle: string;
        reportHeaderId: string;
    },
    currentUserId: string,
) {
    const { subHeaderTitle, reportHeaderId } = props;
    const result = await prisma.$transaction(async (tx) => {
        const repTemplate = await tx.subHeader.create({
            data: {
                subHeaderTitle, reportHeaderId
            },
        });
        await tx.event.create({
            data: {
                userId: currentUserId,
                domain: EventDomain.SubHeader,
                action: EventAction.Create,
                recordId: repTemplate.id,
                recordData: JSON.stringify(repTemplate),
            },
        });
        return repTemplate;
    });
    if (result instanceof Error) {
        throw result;
    }
    return result;
}

export async function deleteUserByEmail(email: User['email']) {
    return prisma.user.delete({ where: { email } });
}

export async function deleteCompanyByEmail(Email: Company['Email']) {
    return prisma.company.delete({ where: { Email } });
}

export async function deleteCompanyById(id: Company['id']) {
    return prisma.company.delete({ where: { id } });
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
