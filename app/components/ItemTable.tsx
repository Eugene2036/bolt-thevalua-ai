import React from 'react';
import { FormTextField } from './FormTextField';

interface DynamicTableProps {
    dataString: string;
}

const ItemTable: React.FC<DynamicTableProps> = ({ dataString }) => {
    // Parse the string to an array
    const data: string[] = JSON.parse(dataString) as string[];

    return (
        <table className='p-2' style={{ width: '100%', borderCollapse: 'collapse', border: 'solid black 1.0pt', padding: '10.0pt 5.0pt 5.0pt 5.0pt', fontFamily: '"Arial"' }}>
            <thead>
                <tr>
                    <th style={{ border: 'solid black 1.0pt', width: '50%' }}>Construction Item</th>
                    <th style={{ border: 'solid black 1.0pt' }}>Description</th>
                </tr>
            </thead>
            <tbody>
                {data.map((item, index) => (
                    <tr key={index}>
                        <td style={{ border: 'solid black 1.0pt' }}>{item}</td>
                        <td style={{ border: 'solid black 1.0pt' }}><FormTextField type='text' className='flex flex-row min-w-full' style={{ width: '50%' }} name={''} placeholder='comment here...' /></td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default ItemTable;