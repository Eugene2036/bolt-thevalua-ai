import React, { useState, useEffect } from 'react';
import { X } from 'tabler-icons-react';

interface ModalProps {
    children: React.ReactNode;
    onClose: () => void;
}

export default function Modal({ children, onClose }: ModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger fade-in effect when the modal is mounted
        setIsVisible(true);
        return () => {
            // Ensure fade-out effect is triggered before unmounting
            setIsVisible(false);
        };
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade-out animation to complete before closing
    };

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'
                }`}
            style={{ zIndex: 1000 }}
        >
            <div
                className={`bg-white rounded-lg shadow-lg p-4 w-[90%] max-w-[90%] relative transform transition-transform duration-300 ${isVisible ? 'scale-100' : 'scale-95'
                    }`}
            >
                <button
                    className="cursor-pointer absolute right-2 top-2 z-20 flex flex-col justify-center items-center p-2 bg-red-100 rounded-md transition-all duration-300 hover:bg-red-200"
                    onClick={handleClose}
                    aria-label="Close Modal"
                >
                    <X className="text-red-600" />
                </button>
                {children}
            </div>
        </div>
    );
}