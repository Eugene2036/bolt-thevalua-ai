import { ActionArgs, json, LoaderArgs, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import React, { useEffect, useState } from 'react';
import '~/../InstructorPopupForm.css';
import { prisma } from '~/db.server';
import { badRequest, getValidatedId, processBadRequest, StatusCode } from '~/models/core.validations';
import { requireUserId } from '~/session.server';
import { InlineAlert } from './InlineAlert';
import { SecondaryButton } from './SecondaryButton';
import { ActionContextProvider, useForm } from './ActionContextProvider';
import { CardHeader } from './CardHeader';
import { TextField } from './TextField';
import { TextArea } from './TextArea';
import { FormFields, getRawFormFields, hasFormError } from '~/models/forms';
import { Select } from './Select';
import { toast } from 'sonner';
import { z } from 'zod';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { AppLinks } from '~/models/links';

interface ContactPopupFormProps {
    isOpen: boolean;
    selectedNoteId: string;
    onClose: () => void;
}

export async function loader({ params }: LoaderArgs) {
    const savedNoteId = getValidatedId(params.selectedNoteId);
    const notifications = await prisma.notification.findUnique({
        where: { noteId: savedNoteId },
        select: {
            noteId: true,
            plotNum: true,
            firstName: true,
            lastName: true,
            email: true,
            telephone: true,
            neighbourhood: true,
            location: true,
            message: true,
            messageBody: true,
            userId: true,
            createdById: true,
            accepted: true,
        }
    });

    console.log('Loader Data: ', notifications);

    if (!notifications) {
        throw new Response('Notification record not found, please try again', {
            status: StatusCode.NotFound,
        });
    }
    return json({ notifications });
}

const Schema = z
    .object({
        plotNum: z.coerce.string().min(1),
        firstName: z.coerce.string().min(1),
        lastName: z.coerce.string().min(1),
        email: z.coerce.string().min(1),
        telephone: z.coerce.string().min(1),
        neighbourhood: z.coerce.string().min(1),
        location: z.coerce.string().min(1),
        message: z.coerce.string().min(1),
        messageBody: z.coerce.string(),
        accepted: z.coerce.string(),
    });

export async function action({ request, params }: ActionArgs) {
    const currentUserId = await requireUserId(request);
    const noteId = getValidatedId(currentUserId)

    console.log('My Notification ID:', noteId);

    try {
        const id = getValidatedId(params.id);
        const fields = await getRawFormFields(request);
        const result = Schema.safeParse(fields);
        if (!result.success) {
            return processBadRequest(result.error, fields);
        }
        const { accepted } = result.data;

        await prisma.$transaction(async (tx) => {

            const updated = await tx.notification.update({
                where: { noteId },
                data: {
                    accepted
                },
            });
            await tx.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.Notification,
                    action: EventAction.Update,
                    recordId: updated.noteId,
                    recordData: JSON.stringify(updated),
                },
            });
        });
        // return redirect(AppLinks.Users);
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}


const InstructionDetailsForm: React.FC<ContactPopupFormProps> = ({ isOpen, onClose }) => {
    const { notifications } = useLoaderData<typeof loader>();

    if (!notifications) {
        return <div>Loading or Error fetching notifications...</div>; // Handle the case where data isn't available
    }

    const fetcher = useFetcher<typeof useState>();
    const { getNameProp, isProcessing } = useForm(fetcher, Schema);

    const defaultValues: Record<keyof z.infer<typeof Schema>, boolean | string> = {
        plotNum: notifications.plotNum,
        firstName: notifications.firstName,
        lastName: notifications.lastName,
        email: notifications.email,
        telephone: notifications.telephone,
        neighbourhood: notifications.neighbourhood,
        location: notifications.location,
        message: notifications.message,
        messageBody: notifications.messageBody || '',
        accepted: notifications.accepted,
    };

    const [plotNum, setPlotNum] = useState(notifications.plotNum);
    const [firstName, setFirstName] = useState(notifications.firstName);
    const [lastName, setLastName] = useState(notifications.lastName);
    const [telephone, setTelephone] = useState(notifications.telephone);
    const [email, setEmail] = useState(notifications.email);
    const [neighbourhood, setNeighbourhood] = useState(notifications.neighbourhood);
    const [location, setLocation] = useState(notifications.location);
    const [message, setMessage] = useState(notifications.message);
    const [messageBody, setMessageBody] = useState(notifications.messageBody || '');
    const [accepted, setAccepted] = useState(notifications.accepted);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            useEffect(() => {
                prisma.notification.update({
                    where: { noteId: notifications?.noteId },
                    data: {
                        accepted: true
                    }
                })
            }, [accepted])


            if (!accepted) {
                throw new Error(toast.error('Error updating notification').toString());
            }

            toast.success('Updated successfully');
            AppLinks.UserProfile(notifications.userId)
        } catch (err) {
            if (err instanceof TypeError) {
                console.error('TypeError: ', err.message);
                toast.error('There was a problem sending your message.');
            } else {
                console.error('An error occurred:');
                toast.error('Unexpected error occurred.');
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="popup-overlay">
            <div className="popup-content">
                <button className="close-button" onClick={onClose}>
                    &times;
                </button>
                <fetcher.Form onSubmit={handleSubmit} className="flex flex-col items-stretch w-[100%] gap-2">
                    <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
                        <CardHeader className="flex flex-row items-center gap-4 p-2 w-full">
                            <h1 >Valuation Instruction</h1>
                        </CardHeader>
                        <div className="font-light flex flex-row items-center gap-6 border-b border-b-stone-400 pb-2">
                            <div className='grid grid-cols-2 gap-6 py-4 w-full'>
                                <TextField
                                    name='firstName'
                                    label="First Name"
                                    readOnly
                                    value={firstName}
                                />
                                <TextField
                                    name='lastName'
                                    label="Last Name"
                                    readOnly
                                    value={lastName}
                                />
                                <TextField
                                    name='telephone'
                                    label="Phone"
                                    readOnly
                                    value={telephone}
                                />
                                <TextField
                                    name='email'
                                    label="Email"
                                    readOnly
                                    value={email}
                                />
                                <TextField
                                    name='message'
                                    label="Purpose of Valuation"
                                    readOnly
                                    value={message}
                                />
                                <TextField
                                    name='plotNum'
                                    label="Plot Number"
                                    readOnly
                                    value={plotNum}
                                />
                                <TextField
                                    name='neighbourhood'
                                    label="Neighbourhood"
                                    readOnly
                                    value={neighbourhood}
                                />
                                <TextField
                                    name='location'
                                    label="Location"
                                    readOnly
                                    value={location}
                                />
                                <Select
                                    {...getNameProp('accepted')}
                                    label="Select Option"
                                    onChange={() => setAccepted(accepted)}
                                >
                                    <option value='false'>
                                        Reject Instruction
                                    </option>
                                    <option value='true'>
                                        Accept Instruction
                                    </option>
                                </Select>
                                <TextArea
                                    name='messageBody'
                                    label="Additional Information"
                                    readOnly
                                    value={messageBody}
                                />

                                {/* <input {...getNameProp('noteId')} value={String()} ></input> */}
                            </div>
                        </div>

                        {hasFormError(fetcher.data) && (
                            <div className="flex flex-col items-stretch py-4">
                                <InlineAlert>{fetcher.data.formError}</InlineAlert>
                            </div>
                        )}
                        <div className="flex flex-row items-stretch py-0">
                            <CardHeader className="flex flex-row items-center gap-4 p-0 w-full">
                                {/* <BackButton /> */}
                                <div className="grow" />
                                <SecondaryButton type="submit" isIcon disabled={isProcessing} >
                                    {isProcessing ? 'Saving...' : 'Save'}
                                </SecondaryButton>
                            </CardHeader>
                        </div>
                    </ActionContextProvider>
                </fetcher.Form>
            </div>
        </div>
    );
};

export default InstructionDetailsForm;