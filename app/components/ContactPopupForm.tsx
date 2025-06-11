import React, { useState } from 'react';
import '~/../ContactPopupForm.css';

interface ContactPopupFormProps {
    isOpen: boolean;
    onClose: () => void;
}

const ContactPopupForm: React.FC<ContactPopupFormProps> = ({ isOpen, onClose }) => {
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

    return (
        <div className="popup-overlay">
            <div className="popup-content">
                <button className="close-button" onClick={onClose}>
                    &times;
                </button>
                <form onSubmit={handleSubmit} style={{ maxWidth: '100%', margin: '0 auto' }} className="contact-form">
                    <h2 className="pb-2.5">Request a Demo</h2>
                    <input
                        type="text"
                        name="name"
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="text"
                        name="phone"
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="text"
                        name="company"
                        placeholder="Company"
                        value={formData.company}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="text"
                        name="title"
                        placeholder="Job Title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="number"
                        name="employees"
                        placeholder="Number of Employees"
                        value={formData.employees}
                        onChange={handleChange}
                        required
                        min="1" max="100" step="1"
                    />
                    <textarea
                        name="message"
                        placeholder="Your Message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                    />
                    <button type="submit" style={{ marginTop: '16px' }} className="bg-black dark:bg-dark-2 border-dark dark:border-dark-2 border inline-flex items-center justify-center py-3 px-7 text-center text-base font-medium text-white hover:bg-body-color hover:border-body-color disabled:bg-gray-3 disabled:border-gray-3 disabled:text-dark-5" >Send Request</button>
                </form>
            </div>
        </div>
    );
};

export default ContactPopupForm;