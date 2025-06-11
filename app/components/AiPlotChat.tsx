'use client';

import type { KeyboardEvent } from 'react';
import { Transition } from '@headlessui/react';
import { IconSparkles } from '@tabler/icons-react';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import Markdown from 'markdown-to-jsx';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader, X } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

interface Props {
    plotId: string;
}

interface Message {
    author: string;
    message: string;
}

interface PlotData {
    plot: {
        id: string;
        plotNumber: string;
        address: string;
        plotExtent: number;
        zoning: string;
        classification: string;
        marketValue: number | null;
        construction: string | null;
        propertyLocation: string | null;
        valuerComments: string | null;
        plotAndComparables: {
            comparablePlot: ComparablePlot;
        }[];
    };
    comparablePlots: ComparablePlot[];
}

interface ComparablePlot {
    plotNumber: string;
    price: number;
    location: string;
    plotExtent: number;
    propertyType: string;
    suburb: string;
    transactionDate: string;
    status: string;
    plotDesc: string;

    numAirCons: number;
    numParkingBays: number;
    numOfStructures: number;
    numOfToilets: number;
    numOfStrorerooms: number;
    numOfBathrooms: number;
    swimmingPool: 'Yes' | 'No';
    paving: 'Yes' | 'No';
    boundary: 'None' | 'Boundary Wall' | 'Fencing' | 'Other';
    garageType: 'None' | 'Single' | 'Double' | 'Triple' | 'Other';
    kitchen: 'Yes' | 'No';
    wardrobe: 'Yes' | 'No';
    roofModel: 'Zinc Roofing' | 'Concrete Tiles' | 'IRB' | 'Corrugated Roofing Sheets' | 'Thatch Roof' | 'Other';
    ceiling: 'Wooden' | 'Concrete' | 'Other';
    interiorWallFinish: 'Painted Wall' | 'Water Paint' | 'Wall Paper' | 'Unknown' | 'Other';
}

function AiPlotChatInner({ plotId }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [aiContext, setAiContext] = useState<string>("");
    const [messages, setMessages] = useState<(Message & { isError?: boolean })[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch plot and comparable data for context
    useEffect(() => {
        async function fetchPlotData() {
            try {
                const response = await fetch(`/api/plot-context/${plotId}`);
                console.log("FETCHED PLOT DATA:", response);

                if (!response.ok) {
                    throw new Error('Failed to fetch plot data');
                }

                const data = await response.json() as PlotData;

                const context = `
          Plot Information:
          - Plot Number: ${data.plot.plotNumber}
          - Address: ${data.plot.address}
          - Plot Extent: ${data.plot.plotExtent}
          - Zoning: ${data.plot.zoning}
          - Classification: ${data.plot.classification}
          - Market Value: ${data.plot.marketValue ?? 'Not available'}
          - Construction: ${data.plot.construction ?? 'Not specified'}
          - Property Location: ${data.plot.propertyLocation ?? 'Not specified'}
          - Valuation Comments: ${data.plot.valuerComments || 'None'}
          
          Comparable Plots:
          ${data.comparablePlots.map(comp => `
            - Plot: ${comp.plotNumber} | Price: ${comp.price} | Location: ${comp.location} |
            Extent: ${comp.plotExtent} | Type: ${comp.propertyType} | Suburb: ${comp.suburb} |
            Transaction Date: ${comp.transactionDate} | Status: ${comp.status} |
            Description: ${comp.plotDesc} | Air Cons: ${comp.numAirCons} | Parking Bays: ${comp.numParkingBays} |
            Structures: ${comp.numOfStructures} | Toilets: ${comp.numOfToilets} | Storerooms: ${comp.numOfStrorerooms} |
            Bathrooms: ${comp.numOfBathrooms} | Swimming Pool: ${comp.swimmingPool} | Paving: ${comp.paving} |
            Boundary: ${comp.boundary} | Garage Type: ${comp.garageType} | Kitchen: ${comp.kitchen} |
            Wardrobe: ${comp.wardrobe} | Roof Model: ${comp.roofModel} | Ceiling: ${comp.ceiling} |
            Interior Wall Finish: ${comp.interiorWallFinish}
          `).join('\n')}
        `;

                setAiContext(context);
            } catch (error) {
                console.error("Failed to fetch plot context:", error);
                setMessages(prev => [...prev, {
                    author: 'AI',
                    message: 'Failed to load property data. Please try again later.',
                    isError: true
                }]);
            }
        }

        if (plotId && isOpen) {
            fetchPlotData();
        }
    }, [plotId, isOpen]);

    const { mutate, ...mutation } = useMutation({
        mutationFn: async (message: string) => {
            try {
                const response = await fetch('/api/ai-chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error?.message ||
                        `API request failed with status ${response.status}`
                    );
                }

                return data;
            } catch (error) {
                console.error('AI request failed:', error);
                throw new Error(
                    error instanceof Error ? error.message : 'Failed to get AI response'
                );
            }
        },
        retry: 1,
        retryDelay: 1000,
    });

    useEffect(() => {
        if (mutation.isError) {
            const errorMessage = mutation.error?.message || "Failed to get AI response";
            setMessages(prev => [...prev, {
                author: 'AI',
                message: `Error: ${errorMessage}\n\nI'm currently using DeepSeek AI. Please try a different question or contact support if this persists.`,
                isError: true
            }]);
        }
    }, [mutation.isError, mutation.error]);

    const sendMessageRef = useRef<HTMLInputElement>(null);
    const isProcessing = mutation.isPending;
    const messageError = mutation.isError ? "Failed to get AI response!" : '';

    function runMutation(message: string) {
        const finalMessage = [
            `You are a real estate valuation assistant. Use the following context to answer questions: ${aiContext}`,
            `Question: ${message}`,
            `Guidelines:
      1. Focus on valuation insights, comparisons, property structure details and property features
      2. Reference comparable properties when relevant
      3. Explain valuation concepts simply
      4. Highlight key differences between properties
      5. If unsure, say so but provide general advice
      6. Format responses clearly with graphs (including Bar Graphs, Pie Charts, and Line Graphs) or bullet points when helpful`
        ].join('\n\n');
        mutate(finalMessage);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleMutation();
        }
    }

    useEffect(() => {
        if (mutation.isError) {
            setMessages(prev => [...prev, {
                author: 'AI',
                message: messageError,
                isError: true
            }]);
        }
    }, [mutation.isError, messageError]);

    useEffect(() => {
        const Schema = z.object({
            completion: z.string(),
            error: z.string().optional()
        });

        if (mutation.data && Schema.safeParse(mutation.data).success) {
            const data = mutation.data as z.infer<typeof Schema>;
            if (!data.error) {
                setMessages(prev => [...prev, {
                    author: 'AI',
                    message: data.completion
                }]);
            }
        }
    }, [mutation.data]);

    function handleMutation() {
        if (sendMessageRef.current?.value.trim()) {
            const newMessage = sendMessageRef.current.value;
            setMessages(prev => [...prev, {
                author: 'Me',
                message: newMessage
            }]);

            runMutation(newMessage);
            sendMessageRef.current.value = '';
        }
    }

    return (
        <div className="fixed bottom-2 right-6 z-[100]">
            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
                >
                    <IconSparkles className="h-5 w-5" />
                    <span className="text-sm font-medium">Valua Intelligence</span>
                </button>
            ) : (
                <div className="h-[600px] w-[700px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-200 bg-blue-600 p-3">
                        <div className="flex items-center gap-2">
                            <IconSparkles className="h-5 w-5 text-white" />
                            <span className="font-medium text-white">Valua Intelligence</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="rounded-full p-1 text-white hover:bg-blue-700"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Chat Body */}
                    <div className="flex h-[calc(100%-120px)] flex-col bg-gray-50">
                        <div className="flex-1 overflow-y-auto p-4">
                            {messages.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center text-center">
                                    <IconSparkles className="mb-3 h-10 w-10 text-blue-500" />
                                    <h3 className="mb-1 text-lg font-medium">Property Valuation Assistant</h3>
                                    <p className="max-w-xs text-sm text-gray-500">
                                        Ask me about this property's valuation, comparable plots, or market insights.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {messages.map((message, index) => (
                                        <Transition
                                            key={index}
                                            appear={true}
                                            show={true}
                                            enter="transition-all duration-150 ease-out"
                                            enterFrom="opacity-0 translate-y-2"
                                            enterTo="opacity-100 translate-y-0"
                                        >
                                            <div
                                                className={twMerge(
                                                    'max-w-[85%] rounded-lg p-3 text-sm',
                                                    message.author === 'Me'
                                                        ? 'ml-auto bg-blue-600 text-white'
                                                        : 'mr-auto bg-white text-gray-800 shadow',
                                                    message.isError && 'bg-red-100 text-red-700'
                                                )}
                                            >
                                                <Markdown options={{
                                                    forceBlock: true,
                                                    overrides: {
                                                        ul: { component: 'ul', props: { className: 'list-disc pl-5 space-y-1' } },
                                                        ol: { component: 'ol', props: { className: 'list-decimal pl-5 space-y-1' } },
                                                        p: { component: 'p', props: { className: 'mb-2 last:mb-0' } }
                                                    }
                                                }}>
                                                    {message.message.trim()}
                                                </Markdown>
                                            </div>
                                        </Transition>
                                    ))}
                                    {isProcessing && (
                                        <div className="mr-auto max-w-[85%] rounded-lg bg-white p-3 shadow">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Loader className="h-4 w-4 animate-spin" />
                                                <span className="text-sm">Analyzing...</span>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="border-t border-gray-200 bg-white p-3">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    ref={sendMessageRef}
                                    className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    placeholder="Ask about this property..."
                                    onKeyDown={handleKeyDown}
                                    disabled={isProcessing}
                                />
                                <button
                                    onClick={handleMutation}
                                    disabled={isProcessing}
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-50"
                                >
                                    {isProcessing ? (
                                        <Loader className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <ArrowRight className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            <p className="mt-2 text-center text-xs text-gray-500">
                                AI assistant may produce inaccurate information
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function AiPlotChat({ plotId }: Props) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            <AiPlotChatInner plotId={plotId} />
        </QueryClientProvider>
    );
}
