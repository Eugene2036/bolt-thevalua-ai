import type { Password, User, ReportBodyContent } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '~/db.server';
import { EventAction, EventDomain } from './events';
export type { User } from '@prisma/client';

export async function getUserById(id: User['id']) {
    return prisma.user.findUnique({ where: { id } });
}

export async function getBodyContentById(id: ReportBodyContent['id']) {
    return prisma.reportBodyContent.findUnique({ where: { id } });
}

export async function CreateReportBodyContent(
    props: {
        bodyContentInfo: string;
        subHeaderId: string;
    },
    currentUserId: string,
) {

    const { bodyContentInfo, subHeaderId } = props;

    const result = await prisma.$transaction(async (tx) => {

        const repTemplate = await tx.reportBodyContent.create({
            data: {
                bodyContentInfo, subHeaderId
            },
        });
        await tx.event.create({
            data: {
                userId: currentUserId,
                domain: EventDomain.BodyContent,
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

export async function deleteBodyContentById(id: ReportBodyContent['id']) {
    return prisma.reportBodyContent.delete({ where: { id } });
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
