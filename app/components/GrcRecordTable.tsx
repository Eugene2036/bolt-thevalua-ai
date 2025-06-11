import React from 'react';

interface GrcRecord {
    identifier: string;
    unit: string;
    size: string;
    rate: string;
}

interface PlotProps {
    grcRecords: GrcRecord[];
}
function toLowercase(input: string): string {
    return input.toLowerCase();
}

const GrcRecordTable: React.FC<PlotProps> = ({ grcRecords }) => {
    return (
        <table className='p-2' style={{ width: '50%', borderCollapse: 'collapse', border: 'solid black 1.0pt', padding: '10.0pt 5.0pt 5.0pt 5.0pt', fontFamily: '"Arial"' }}>
            <thead>
                <tr>
                    <th style={{ border: 'solid black 1.0pt', width: '50%' }}>Identifier</th>
                    <th style={{ border: 'solid black 1.0pt' }}>Size</th>
                    {/* <th style={{ border: 'solid black 1.0pt' }}>Rate</th> */}
                </tr>
            </thead>
            <tbody>
                {grcRecords.map((grcRecord, index) => (
                    <tr key={index}>
                        <td style={{ border: 'solid black 1.0pt' }}>{grcRecord.identifier}</td>
                        <td style={{ border: 'solid black 1.0pt', textAlign: 'right' }}>{grcRecord.size} {toLowercase(grcRecord.unit)}</td>
                        {/* <td style={{ border: 'solid black 1.0pt', textAlign: 'right' }}>{grcRecord.rate}</td> */}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

// Export the component correctly
export default GrcRecordTable;