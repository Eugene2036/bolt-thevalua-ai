import { json } from "@remix-run/node";
import sgMail from "@sendgrid/mail";
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const action = async ({ request }) => {
    try {
        const formData = await request.json();
        const { name, phone, company, title, email, employees, message } = formData;

        const msg = {
            to: 'info@thevalua.com', // Change to your recipient
            from: email, // Change to your verified sender
            subject: `New Demo Request from ${name}.`,
            text: `
            Full Name: ${name}
            Work Phone: ${phone}
            Company: ${company}
            Job Title: ${title}
            Email: ${email}
            Number of Employees: ${employees}
        Message:
        ${message}
      `,
            html: `
            <strong>Full Name:</strong> ${name}<br><br>
            <strong>Work Phone:</strong> ${phone}<br><br>
            <strong>Company:</strong> ${company}<br><br>
            <strong>Job Title:</strong> ${title}<br><br>
            <strong>Email:</strong> ${email}<br><br>
            <strong>Number of Employees:</strong> ${employees}<br><br>
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