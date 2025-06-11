import type { Company, Password, User } from '@prisma/client';
require('dotenv').config(); // Load environment variables from .env file
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

import { prisma } from '~/db.server';

import { sendVerificationEmail } from './emails.server';
import { EventAction, EventDomain } from './events';
import { Env } from './environment';
import Error from 'next/error';

export type { User, Company } from '@prisma/client';

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

export async function CreateCompany(
    props: {
        FirstName: string;
        LastName: string;
        FullName: string;
        CompanyName: string;
        LocationAddress: string;
        PostalAddress: string;
        Phone: string;
        Mobile: string;
        Fax: string;
        Email: string;
        Website: string;
    },
    currentUserId: string,
) {
    const { FullName, CompanyName, LocationAddress, PostalAddress, Phone, Mobile, Fax, Email, Website, FirstName, LastName } = props;

    const verToken = faker.string.uuid();

    const numDupl = await prisma.company.count({
        where: { Email: Email },
    });
    if (numDupl) {
        throw new Error({ statusCode: 400, title: 'A company with that email already exists' });
    }

    const result = await prisma.$transaction(async (tx) => {
        const hashedPassword = await bcrypt.hash('default@2025', 10);

        // Create the company
        const company = await tx.company.create({
            data: {
                FullName,
                CompanyName,
                LocationAddress,
                PostalAddress,
                Phone,
                Mobile,
                Fax,
                Email,
                Website,
                headerTitle: `REAL PROPERTY VALUATION REPORT`,
                footerNote: `Report prepared by (${CompanyName})`,
            },
        });

        if (!company) {
            throw new Error('Failed to create company or it already exists' as any);
        }

        // Create the superadmin user group
        // Check if user groups already exist before creating them
        const adminGroupName = `${CompanyName} - Admin`;
        const valuerGroupName = `${CompanyName} - Valuer`;

        const existingGroups = await tx.userGroup.count({
            where: {
                OR: [
                    { name: adminGroupName },
                    { name: valuerGroupName }
                ]
            }
        });

        if (existingGroups > 0) {
            throw new Error({ message: 'User groups for this company already exist', statusCode: 400 } as any);
        }

        const superadmin = await tx.userGroup.create({
            data: {
                name: adminGroupName,
                companyId: company.id, // Ensure this is correctly referenced
                allowCompanySettings: true,
                allowCreateNewCompany: true,
                allowCreateNewUser: true,
                allowDeleteCompany: true,
                allowMarkAsReviewed: true,
                allowSetValuerTargets: true,
                allowUnvaluedProperties: true,
                allowUserActivity: true,
                allowUserManagement: true,
                allowValuationsDownload: true,
            },
        });

        if (!superadmin) {
            throw new Error({ statusCode: 400, title: 'Failed to create user group or it already exists' });
        }

        await tx.event.create({
            data: {
                userId: currentUserId,
                domain: EventDomain.UserGroup,
                action: EventAction.Create,
                recordId: superadmin.id,
                recordData: JSON.stringify(superadmin),
            },
        });

        // Create the valuer user group
        const valuerGroup = await tx.userGroup.create({
            data: {
                name: valuerGroupName,
                companyId: company.id, // Ensure this is correctly referenced
                allowCompanySettings: false,
                allowCreateNewCompany: false,
                allowCreateNewUser: false,
                allowDeleteCompany: false,
                allowMarkAsReviewed: true,
                allowSetValuerTargets: false,
                allowUnvaluedProperties: true,
                allowUserActivity: true,
                allowUserManagement: false,
                allowValuationsDownload: true,
            },
        });

        if (!valuerGroup) {
            throw new Error({ statusCode: 400, title: 'Failed to create user group or it already exists' });
        }

        await tx.event.create({
            data: {
                userId: currentUserId,
                domain: EventDomain.UserGroup,
                action: EventAction.Create,
                recordId: valuerGroup.id,
                recordData: JSON.stringify(valuerGroup),
            },
        });

        // Create the new user
        const newUser = await tx.user.create({
            data: {
                firstName: FirstName,
                lastName: LastName,
                phone: Mobile,
                email: Email,
                firm: CompanyName,
                password: { create: { hash: hashedPassword } },
                isVerified: false,
                isSuper: false,
                isBanker: false,
                isSignatory: true,
                userGroupId: superadmin.id,
                verToken: faker.string.uuid(),
            },
        });

        if (!newUser) {
            throw new Error({ statusCode: 400, title: 'Failed to create user or it already exists' });
        }

        await tx.event.create({
            data: {
                userId: currentUserId,
                domain: EventDomain.User,
                action: EventAction.Create,
                recordId: newUser.id,
                recordData: JSON.stringify(newUser),
            },
        });

        // Log the newly created Company
        await tx.event.create({
            data: {
                userId: currentUserId,
                domain: EventDomain.Company,
                action: EventAction.Create,
                recordId: company.id,
                recordData: JSON.stringify(company),
            },
        });

        // Send verification email
        const err = await sendVerificationEmail(Email, verToken, 'cm8k8t2w019uv1sp8rsvadx4b', FullName, hashedPassword, '', process.env.WEB_URL, '', '', '', '', FullName, CompanyName, Email);
        if (err) {
            throw new Error({ statusCode: 500, title: `Failed to send verification email: ${err.message}` });
        }

        // Send verification email
        const userVerification = await sendVerificationEmail(Email, verToken, 'cm87ol4wv007ko4945vtbo0ur', props.FirstName + ' ' + props.LastName, '', '', '', '', '', '', '', '', '', Email, Env.INSTANCE_URL);
        if (userVerification) {
            return userVerification;
        }

        // Finally Create Default report Templates Res and Comm
        // if (company.id) {
        //     await createDefaultResTemplate({
        //         name: `Residential (${company.id.slice(-5)})`,
        //         companyId: company.id,
        //     });
        //     await createDefaultComTemplate({
        //         name: `Commercial (${company.id.slice(-5)})`,
        //         companyId: company.id,
        //     });
        //     console.log(`Default template created for companyId: ${company.id}`);
        // }

        await tx.event.create({
            data: {
                userId: currentUserId,
                domain: EventDomain.Company,
                action: EventAction.Create,
                recordId: company.id,
                recordData: JSON.stringify(company),
            },
        });

        return company;
    }, { timeout: 10000 }); // Increase timeout to 10 seconds 

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
