import { sendVerificationEmail } from '../../models/emails.server';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const {
            email,
            verToken,
            transactionId,
            PlotNumber,
            fileUrl,
            senderCompany,
            valuerCompany
        } = req.body;

        console.log('Request body:', req.body);
        console.info('sendVerificationEmail exists?', typeof sendVerificationEmail);

        const err = await sendVerificationEmail(
            email,
            verToken,
            transactionId,
            '',
            '',
            PlotNumber,
            fileUrl,
            '',
            senderCompany,
            valuerCompany,
            '',
            '',
            '',
            '',
        );
        if (err) {
            throw new Error(`Failed to send verification email: ${err.message}`);
        }

        console.log('Email sent successfully');
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Failed to send email' });
    }
}