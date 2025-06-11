import { useFetcher } from '@remix-run/react';
import React, { useEffect, useState } from 'react';
import { prisma } from '~/db.server';
import { CLOUDINARY_CONFIG } from '~/models/plots.validations';

const cloudName = CLOUDINARY_CONFIG.CLOUD_NAME; // Replace with your Cloudinary cloud name

interface Props {
    noteId: string;
}

interface Attachment {
    id: string;
    fileName: string;
    fileUrl: string;
}

const NotificationAttachments = ({ noteId }: Props) => {
    const [attachments, setAttachments] = useState<Attachment[]>([]);

    useEffect(() => {
        const loadAttachments = async () => {
            // Query the Attachment table directly for records with the given noteId
            const attachments = await prisma.attachment.findMany({
                where: { notificationId: noteId }, // Filter by notificationId
                select: {
                    id: true,
                    fileName: true,
                    fileUrl: true,
                },
            });

            if (attachments) {
                setAttachments(attachments);
            }

            console.log("List of Attachments:", attachments);
        };

        loadAttachments();
    }, [noteId]);

    if (attachments.length === 0) {
        return <div>No attachments found.</div>;
    }

    // Function to determine the file type based on the file extension
    const getFileType = (fileName: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        return extension;
    };

    return (
        <div>
            <h2>Attachments for Notification: {noteId}</h2>
            <ul>
                {attachments.map((attachment) => {
                    const fileType = getFileType(attachment.fileName);

                    return (
                        <li key={attachment.id}>
                            {fileType === 'jpg' || fileType === 'png' || fileType === 'jpeg' ? (
                                // Display images inline
                                <img
                                    src={`https://res.cloudinary.com/${cloudName}/image/upload/${attachment.fileUrl}`}
                                    alt={attachment.fileName}
                                    style={{ maxWidth: '100%', height: 'auto' }}
                                />
                            ) : fileType === 'pdf' ? (
                                // Provide a link to view/download PDFs
                                <a
                                    href={`https://res.cloudinary.com/${cloudName}/raw/upload/${attachment.fileUrl}`}
                                    target="_blank" // Open in a new tab
                                    rel="noopener noreferrer"
                                >
                                    {attachment.fileName} (PDF)
                                </a>
                            ) : (
                                // Provide a download link for other file types
                                <a
                                    href={`https://res.cloudinary.com/${cloudName}/raw/upload/${attachment.fileUrl}`}
                                    download={attachment.fileName}
                                >
                                    {attachment.fileName} (Download)
                                </a>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default NotificationAttachments;