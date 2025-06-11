import type { Company, Password, User, ReportTemplate } from '@prisma/client';

import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

import { prisma } from '~/db.server';

import { sendVerificationEmail } from './emails.server';
import { EventAction, EventDomain } from './events';
import { LogicNand } from 'tabler-icons-react';

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


export async function CreateReportHeader(
    props: {
        headerTitle: string;
        reportTemplateId: string;
    },
    currentUserId: string,
) {


    const { headerTitle, reportTemplateId } = props;
    const result = await prisma.$transaction(async (tx) => {

        const repHeader = await tx.reportHeader.create({
            data: {
                headerTitle, reportTemplateId
            },
        });

        await tx.event.create({
            data: {
                userId: currentUserId,
                domain: EventDomain.ReportHeader,
                action: EventAction.Create,
                recordId: repHeader.id,
                recordData: JSON.stringify(repHeader),
            },
        });
        return repHeader;
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
