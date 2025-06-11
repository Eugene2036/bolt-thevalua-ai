import { useFetcher, useRevalidator } from '@remix-run/react';
import React, { useEffect, useState } from 'react';
import { PrimaryButton } from './PrimaryButton';
import { ArrowsMaximize, ArrowsMinimize, MessageDots } from 'tabler-icons-react';

interface Message {
    id: string;
    content: string;
    createdAt: string;
    userId: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

interface Props {
    userId: string;
    notificationId: string;
    initialMessages: Message[];
}

export default function Chat({ userId, notificationId, initialMessages }: Props) {
    const fetcher = useFetcher();
    const { revalidate } = useRevalidator();
    const [messages, setMessages] = useState(initialMessages);
    const [message, setMessage] = useState('');
    const [isMinimized, setIsMinimized] = useState(true);
    const [eventSource, setEventSource] = useState<EventSource | null>(null);

    // Set up EventSource for real-time updates
    useEffect(() => {
        if (isMinimized) return;

        const es = new EventSource(`/notifications/${notificationId}/chat-stream`);

        es.onmessage = (event) => {
            const newMessage = JSON.parse(event.data);
            setMessages(prev => {
                // Check if message already exists to avoid duplicates
                if (!prev.some(msg => msg.id === newMessage.id)) {
                    return [...prev, newMessage];
                }
                return prev;
            });
        };

        es.onerror = () => {
            es.close();
            // Try to reconnect after a delay
            setTimeout(() => {
                setEventSource(null); // This will trigger the effect again
            }, 1000);
        };

        setEventSource(es);

        return () => {
            es.close();
        };
    }, [notificationId, isMinimized]);

    // Handle new messages from fetcher
    useEffect(() => {
        if (fetcher.data?.newMessage) {
            const newMessage = fetcher.data.newMessage;
            if (!newMessage.user) {
                newMessage.user = {
                    id: userId,
                    firstName: 'Unknown',
                    lastName: 'User'
                };
            }
            setMessages((prevMessages) => [...prevMessages, newMessage]);
        }
    }, [fetcher.data, userId]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }, [messages]);

    // Periodically revalidate messages as fallback
    useEffect(() => {
        if (isMinimized) return;

        const interval = setInterval(() => {
            revalidate();
        }, 30000); // Every 30 seconds

        return () => clearInterval(interval);
    }, [isMinimized, revalidate]);

    const toggleMinimize = () => {
        setIsMinimized((prev) => !prev);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append("actionType", "sendMessage");
        formData.append("userId", userId);
        formData.append("notificationId", notificationId);
        formData.append("content", message);

        fetcher.submit(formData, {
            method: 'post',
            action: `/notifications/${notificationId}/edit`,
            encType: 'multipart/form-data',
        });

        setMessage('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
        }
    };

    useEffect(() => {
        if (fetcher.state === 'idle') {
            setMessage('');
        }
    }, [fetcher.state]);

    return (
        <div style={{
            ...styles.widgetContainer,
            width: isMinimized ? '50px' : '600px',
            height: isMinimized ? '50px' : '500px',
            right: '0px',
            left: 'auto',
            transform: 'none',
        }}>
            <div style={styles.header}>
                {!isMinimized && <span>Online Chat</span>}
                <button onClick={toggleMinimize} style={styles.minimizeButton} aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}>
                    {isMinimized ? <MessageDots size="30px" /> : <ArrowsMinimize size="30px" />}
                </button>
            </div>
            {!isMinimized && (
                <div className="chat-container" style={styles.chatContainer}>
                    <div id="chat-container" className="messages" style={styles.messages}>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className="message"
                                style={{
                                    ...styles.message,
                                    alignSelf: msg.userId === userId ? 'flex-end' : 'flex-start',
                                    backgroundColor: msg.userId === userId ? '#007bff' : '#f1f1f1',
                                    color: msg.userId === userId ? 'white' : 'black',
                                }}
                            >
                                <p>{msg.content}</p>
                                <small>
                                    {new Date(msg.createdAt).toLocaleTimeString()}
                                    {msg.user ? ` ${msg.user.firstName} ${msg.user.lastName}` : ' Unknown User'}
                                </small>
                            </div>
                        ))}
                    </div>
                    <fetcher.Form method="post" className="message-form" onSubmit={handleSubmit}>
                        <input type="hidden" name="actionType" defaultValue="sendMessage" />
                        <input type="hidden" name="userId" defaultValue={userId} />
                        <input type="hidden" name="notificationId" defaultValue={notificationId} />
                        <textarea
                            name="content"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your message..."
                            style={styles.textarea}
                        />
                        <PrimaryButton type="submit" disabled={fetcher.state === 'submitting'} style={styles.button}>
                            {fetcher.state === 'submitting' ? 'Sending...' : 'Send'}
                        </PrimaryButton>
                    </fetcher.Form>
                </div>
            )}
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    widgetContainer: {
        position: 'fixed',
        bottom: '50px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        zIndex: 1000,
        transition: 'width 0.3s, height 0.3s',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px',
        backgroundColor: '#007bff',
        color: '#fff',
        borderRadius: '50px 0 0 50px',
        cursor: 'pointer',
    },
    minimizeButton: {
        background: 'none',
        border: 'none',
        color: '#fff',
        fontSize: '16px',
        cursor: 'pointer',
    },
    chatContainer: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        padding: '10px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    messages: {
        flex: 1,
        overflowY: 'auto',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    message: {
        maxWidth: '80%',
        padding: '8px 12px',
        borderRadius: '12px',
        wordBreak: 'break-word',
    },
    textarea: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        resize: 'none',
        outline: 'none',
        marginTop: '10px',
    },
    button: {
        padding: '10px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginTop: '10px',
    },
};