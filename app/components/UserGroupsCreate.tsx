import React, { useState } from 'react';
import '~/../ContactPopupForm.css';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';
import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { z } from 'zod';
import { requireCompanyId, requireUserId } from '~/session.server';
import { getRawFormFields } from '~/models/forms';
import { badRequest, processBadRequest } from '~/models/core.validations';
import { EventAction, EventDomain } from '~/models/events';
import { getErrorMessage } from '~/models/errors';
import CreateUserGroupPage from '~/routes/usergroups.create';


interface ContactPopupFormProps {
    isOpen: boolean;
    onClose: () => void;
}

// Load user groups
export async function loader({ request }: LoaderArgs) {
    const user_Groups = await prisma.userGroup.findMany({
        select: {
            id: true,
            name: true,
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
    return json({ user_Groups });
}

const Schema = z.object({
    id: z.string(),
    intent: z.string(),
});

export async function action({ request }: ActionArgs) {
    const currentCompanyId = await requireCompanyId(request);
    const currentUserId = await requireUserId(request);
    try {
        const fields = await getRawFormFields(request);
        const result = Schema.safeParse(fields);
        if (!result.success) {
            return processBadRequest(result.error, fields);
        }
        const { id, intent } = result.data;

        const usergroup = await prisma.userGroup.findUnique({
            where: { id },
        });

        console.log('CURRENT COMPANY ID: ' + usergroup)

        if (!usergroup) {
            throw new Error('Company record not found');
        }

        await prisma.$transaction(async (tx) => {
            await tx.userGroup.delete({
                where: { id },
            });
            await tx.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.Company,
                    action: EventAction.Delete,
                    recordId: usergroup.id,
                    recordData: JSON.stringify(usergroup),
                },
            });
        });

        return json({ success: true });
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}

const UserGroupsForm: React.FC<ContactPopupFormProps> = ({ isOpen, onClose }) => {
    const { user_Groups } = useLoaderData<typeof loader>();


    const [error, setError] = useState(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { user_Groups } = useLoaderData<typeof loader>();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="popup-overlay">
            <div className="popup-content">
                <button className="close-button" onClick={onClose}>
                    &times;
                </button>
                <form onSubmit={handleSubmit} style={{ maxWidth: '100%', margin: '0 auto' }} className="contact-form">
                    <h2 className="pb-2.5">User Groups</h2>
                    <div className="flex flex-col items-center justify-start h-full gap-6 py-8">
                        <div className="flex flex-col items-stretch min-w-[65%] gap-4">
                            <CreateUserGroupPage />
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserGroupsForm;

