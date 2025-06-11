import { json } from "@remix-run/node";
import sgMail from "@sendgrid/mail";
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const action = async ({ request }) => {
    try {
        const formData = await request.json();
        const { firstName, lastName, workEmail, role, workPhone, businessSector, message } = formData;

        const msg = {
            to: 'info@thevalua.com', // Change to your recipient
            from: workEmail, // Change to your verified sender
            subject: `New Contact Us Message from ${firstName} ${lastName}`,
            text: `
            Business Sector: ${businessSector}
        Message:
        ${message}
      `,
            html: `
        <strong>Role:</strong> ${role}<br><br>
        <strong>Work Phone:</strong> ${workPhone}<br><br>
        <strong>Business Sector:</strong> ${businessSector}<br><br>
        <strong>Message:</strong><br>${message}
      `
        };

        await sgMail.send(msg);

        return json({ success: true });
    } catch (error) {
        console.error('Error in sending email:', error);
        return json({ success: false, error: error.message }, { status: 500 });
    }
};