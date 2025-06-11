import { useState, useEffect } from 'react';
import { useFetcher } from '@remix-run/react';

interface ImagesCarouselESRIProps {
    plotNumber: string;
}

interface ProcessStep {
    step: number;
    status: 'success' | 'error' | 'pending';
    message: string;
}

export function ImagesCarouselESRI({ plotNumber }: ImagesCarouselESRIProps) {
    const fetcher = useFetcher();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);

    useEffect(() => {
        if (plotNumber) {
            setIsLoading(true);
            setError(null);
            setHtmlContent(null);
            setProcessSteps([
                { step: 1, status: 'pending', message: 'Starting process...' }
            ]);

            fetcher.submit(
                { plotNumber },
                { method: "POST", action: "/api/esri-images" }
            );
        }
    }, [plotNumber]);

    useEffect(() => {
        if (fetcher.data) {
            setIsLoading(false);

            if (fetcher.data.error) {
                setError(fetcher.data.error);
                setProcessSteps(prev => [
                    ...prev.filter(s => s.status !== 'pending'),
                    { step: prev.length + 1, status: 'error', message: fetcher.data.error }
                ]);
            } else if (fetcher.data.steps) {
                setProcessSteps(fetcher.data.steps);
                setHtmlContent(fetcher.data.html);
            }
        }
    }, [fetcher.data]);

    // Inject our custom styles for the component
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            .esri-content {
                position: relative;
                min-height: 400px;
                border: 1px solid #ddd;
                border-radius: 8px;
                overflow: hidden;
            }
            .process-steps {
                margin-bottom: 1rem;
            }
            .process-step {
                display: flex;
                align-items: center;
                margin-bottom: 0.5rem;
                font-size: 0.9rem;
            }
            .step-status {
                display: inline-block;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                margin-right: 0.5rem;
                text-align: center;
                line-height: 20px;
                font-size: 0.7rem;
            }
            .status-success {
                background-color: #28a745;
                color: white;
            }
            .status-error {
                background-color: #dc3545;
                color: white;
            }
            .status-pending {
                background-color: #ffc107;
                color: black;
            }
            .expand-btn {
                cursor: pointer;
                background: rgba(255,255,255,0.8);
            }
            .expand-btn:hover {
                background: white;
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return (
        <div className="esri-carousel-container">
            {isLoading && (
                <div className="alert alert-info">
                    Loading images for plot {plotNumber}...
                </div>
            )}

            {error && (
                <div className="alert alert-danger">
                    Error: {error}
                </div>
            )}

            {processSteps.length > 0 && (
                <div className="process-steps">
                    <h4>Process Steps:</h4>
                    {processSteps.map((step, index) => (
                        <div key={index} className="process-step">
                            <span className={`step-status status-${step.status}`}>
                                {step.status === 'success' ? '✓' :
                                    step.status === 'error' ? '✗' : '...'}
                            </span>
                            <span>
                                Step {step.step}: {step.message}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {htmlContent && (
                <div className="esri-content">
                    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                </div>
            )}
        </div>
    );
};