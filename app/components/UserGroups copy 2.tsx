import { Form, useLoaderData } from '@remix-run/react';
import React, { useState } from 'react';
import '~/../ContactPopupForm.css';
import { PrismaClient } from '@prisma/client';
import { json, redirect, ActionArgs, LoaderArgs } from '@remix-run/node';

interface ContactPopupFormProps {
    isOpen: boolean;
    onClose: () => void;
}


const prisma = new PrismaClient();

// Loader for fetching UserGroups
export const loader = async ({ request }: LoaderArgs) => {
    const url = new URL(request.url);
    const companyId = url.searchParams.get('companyId');
    if (!companyId) {
        throw new Error("companyId is required");
    }

    const userGroups = await prisma.userGroup.findMany({
        where: { companyId },
    });
    return json(userGroups);
};

// Action for handling CRUD operations
export const action = async ({ request }: ActionArgs) => {
    const formData = await request.formData();
    const intent = formData.get('_intent');
    const name = formData.get('name') as string;
    const id = formData.get('id') as string;
    const companyId = formData.get('companyId') as string;

    switch (intent) {
        case 'create':
            await prisma.userGroup.create({
                data: { name, companyId },
            });
            break;
        case 'update':
            await prisma.userGroup.update({
                where: { id },
                data: { name },
            });
            break;
        case 'delete':
            await prisma.userGroup.delete({
                where: { id },
            });
            break;
        default:
            throw new Error('Invalid intent');
    }

    return redirect(`/usergroups?companyId=${companyId}`);
};

const UserGroupsForm: React.FC<ContactPopupFormProps> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        company: '',
        title: '',
        email: '',
        employees: '',
        message: ''
    }
    );


    const [error, setError] = useState(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch('/contact-popup-form', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const result = await response.json();
            alert('Message sent successfully!');
        } catch (err) {
            if (err instanceof TypeError) {
                console.error('TypeError: ', err.message);
                // setError('There was a problem sending your message.');
            } else {
                console.error('An error occurred:');
                // setError('Unexpected error occurred.');
            }
        }

        setFormData({ name: '', phone: '', company: '', title: '', email: '', employees: '', message: '' }); // Reset form
        onClose(); // Close the form after submission
    };

    if (!isOpen) return null;

    const companyId = "YOUR_COMPANY_ID"; // Replace with actual companyId source
    const userGroups = useLoaderData<typeof loader>();
    return (
        <div className="popup-overlay">
            <div className="popup-content">
                <button className="close-button" onClick={onClose}>
                    &times;
                </button>
                <form onSubmit={handleSubmit} style={{ maxWidth: '100%', margin: '0 auto' }} className="contact-form">
                    <h2 className="pb-2.5">Edit User Groups</h2>
                    <input type="hidden" name="companyId" value={companyId} />
                    <input type="text" name="name" value={formData.company} placeholder="User Group Name" required />
                    <button type="submit" name="_intent" value="create">Create</button>

                    <button type="submit" style={{ marginTop: '16px' }} className="bg-black dark:bg-dark-2 border-dark dark:border-dark-2 border inline-flex items-center justify-center py-3 px-7 text-center text-base font-medium text-white hover:bg-body-color hover:border-body-color disabled:bg-gray-3 disabled:border-gray-3 disabled:text-dark-5" >Send Request</button>
                </form>
                <ul>
                    {userGroups.map((group) => (
                        <li key={group.id}>
                            <span>{group.name}</span>
                            <Form method="post">
                                <input type="hidden" name="id" value={group.id} />
                                <input type="hidden" name="companyId" value={companyId} />
                                <input type="text" name="name" defaultValue={group.name} required />
                                <button type="submit" name="_intent" value="update">Update</button>
                                <button type="submit" name="_intent" value="delete">Delete</button>
                            </Form>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default UserGroupsForm;