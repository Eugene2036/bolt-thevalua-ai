import { useState } from 'react';
import { PrimaryButtonLink } from './PrimaryButton';

const FAQ = () => {
    const [activeIndex, setActiveIndex] = useState(null);

    const toggleFAQ = (index) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    const faqs = [
        {
            question: "How does the property valuation work?",
            answer: "Our app uses advanced algorithms that consider recent sales data, property characteristics, location factors, and market trends to provide an accurate valuation estimate."
        },
        {
            question: "How accurate is the valuation?",
            answer: "While our valuations are based on comprehensive data and sophisticated models, they should be considered as estimates. For precise valuations, we recommend consulting with a professional appraiser."
        },
        {
            question: "What information do I need to provide?",
            answer: "To get the most accurate valuation, you'll need to provide details like property type, size, number of bedrooms/bathrooms, location, and any special features or renovations."
        },
        {
            question: "How often is the valuation updated?",
            answer: "Our database updates continuously with new market data including comparables. You can refresh your valuation at any time to get the most current estimate."
        },
        {
            question: "Is there a cost to use the valuation service?",
            answer: "No, our basic property valuation service is completely free. We also offer premium detailed reports for a fee if you need more comprehensive analysis."
        },
        {
            question: "Can I save or share my valuation report?",
            answer: "Yes, you can save your valuation reports within the app and share them via email or other messaging platforms."
        }
    ];

    return (

        <div className="flex flex-auto flex-col justify-center p-6 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Frequently Asked Questions</h2>

            <div className="space-y-4">
                {faqs.map((faq, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                            className="flex justify-between items-center w-full p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
                            onClick={() => toggleFAQ(index)}
                        >
                            <span className="text-lg font-medium text-gray-700">{faq.question}</span>
                            <span className="text-gray-500">
                                {activeIndex === index ? '−' : '+'}
                            </span>
                        </button>

                        <div
                            className={`px-4 overflow-hidden transition-all duration-300 ease-in-out 
                ${activeIndex === index ? 'max-h-40 py-4' : 'max-h-0'}`}
                        >
                            <p className="text-gray-600">{faq.answer}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 mb-8 text-center">
                <p className="text-gray-600 mb-6">Still have questions?</p>
                <PrimaryButtonLink to={'#contact'}>Contact Support</PrimaryButtonLink>
            </div>
        </div>
    );
};

export default FAQ;