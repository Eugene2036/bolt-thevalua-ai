import React, { useCallback, useEffect } from 'react';
import printDivContent from 'printFunction';
import { PrimaryButtonLink } from './PrimaryButton';

interface PrintDetails { divId: string; fileName: string };

function printComponent(props: PrintDetails): any {
    const { divId, fileName } = props;

    const handlePrint = () => {
        console.log('Printing started for divId:', divId);

        import('print-js').then(printJS => {
            printJS.default({
                printable: divId,
                type: 'pdf',
                targetStyles: ['*'],
                style: `
                @media print {
                    textarea {
                        overflow: visible !important;
                        white-space: pre-wrap !important;
                    }
                }
                `,
                documentTitle: fileName,
                showModal: true,
            });
            console.log('Printing completed for divId:', divId);
        }).catch(error => {
            console.error('Error loading print-js:', error);
        });
    }

    return (
        <PrimaryButtonLink onClick={() => {
            console.log('Print button clicked');
            printDivContent(divId, fileName);
            handlePrint();
        }} >
            Print PDF
        </PrimaryButtonLink>
    );
};

export default printComponent;








