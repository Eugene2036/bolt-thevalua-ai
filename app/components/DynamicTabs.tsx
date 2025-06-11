import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TabItem {
    label: string;
    content?: React.ReactNode;
}

interface DynamicTabsProps {
    tabData: string[] | TabItem[];
    defaultActiveTab?: number;
    animationType?: 'fade' | 'slide' | 'scale';
    duration?: number;
}

const DynamicTabs: React.FC<DynamicTabsProps> = ({
    tabData,
    defaultActiveTab = 0,
    animationType = 'fade',
    duration = 0.3
}) => {
    const [activeTab, setActiveTab] = useState(defaultActiveTab);
    const [direction, setDirection] = useState(1);

    // Normalize tab data to ensure consistent structure
    const normalizedTabs: TabItem[] = tabData.map((item) => {
        return typeof item === 'string' ? { label: item, content: undefined } : item;
    });

    const handleTabChange = (newIndex: number) => {
        setDirection(newIndex > activeTab ? 1 : -1);
        setActiveTab(newIndex);
    };

    // Animation variants
    const animationVariants = {
        fade: {
            enter: { opacity: 0 },
            active: { opacity: 1 },
            exit: { opacity: 0 }
        },
        slide: {
            enter: { x: `${100 * direction}%`, opacity: 0 },
            active: { x: 0, opacity: 1 },
            exit: { x: `${-100 * direction}%`, opacity: 0 }
        },
        scale: {
            enter: { scale: 0.8, opacity: 0 },
            active: { scale: 1, opacity: 1 },
            exit: { scale: 1.2, opacity: 0 }
        }
    };

    return (
        <div className="tabs-container">
            <div className="tabs-header">
                {normalizedTabs.map((tab, index) => (
                    <button
                        key={index}
                        className={`tab-button ${index === activeTab ? 'active' : ''}`}
                        onClick={() => handleTabChange(index)}
                    >
                        {tab.label}
                        {index === activeTab && (
                            <motion.span
                                className="tab-indicator"
                                layoutId="tabIndicator"
                                transition={{ duration: duration, type: 'spring' }}
                            />
                        )}
                    </button>
                ))}
            </div>

            <div className="tab-content-container">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={activeTab}
                        custom={direction}
                        initial="enter"
                        animate="active"
                        exit="exit"
                        variants={animationVariants[animationType]}
                        transition={{ duration: duration }}
                        className="tab-content"
                    >
                        {normalizedTabs[activeTab]?.content ?? (
                            <div>Content for {normalizedTabs[activeTab]?.label}</div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default DynamicTabs;

// Example usage:
// const App = () => {
//   // Simple string array
//   const simpleTabs = ['Tab 1', 'Tab 2', 'Tab 3'];
//   
//   // Array with custom content
//   const complexTabs = [
//     { label: 'Profile', content: <ProfileComponent /> },
//     { label: 'Settings', content: <SettingsComponent /> },
//     { label: 'Messages', content: <MessagesComponent /> }
//   ];
//
//   return (
//     <div>
//       <h2>Simple Tabs</h2>
//       <DynamicTabs tabData={simpleTabs} />
//       
//       <h2>Complex Tabs</h2>
//       <DynamicTabs tabData={complexTabs} defaultActiveTab={1} />
//     </div>
//   );
// };
