import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '~/db.server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { filesWithTypes, notificationId } = req.body;

        try {
            console.log("filesWithTypes Data:, ", filesWithTypes);

            const attachments = await prisma.attachment.createMany({
                data: filesWithTypes.map((file: any) => ({
                    fileName: file.fileName,
                    fileUrl: file.url,
                    fileType: file.fileType,
                    notificationId: notificationId,
                })),
            });

            res.status(200).json({ success: true, attachments });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to create attachments' });
        }
    } else {
        res.status(405).json({ success: false, error: 'Method not allowed' });
    }
}