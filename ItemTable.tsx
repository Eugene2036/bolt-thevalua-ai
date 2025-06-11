import React from 'react';

interface ItemTableProps {
    items: string[];
}

const ItemTable: React.FC<ItemTableProps> = ({ items }) => {
    return (
        <table>
            <tbody>
                {items.map((item, index) => (
                    <tr key={index}>
                        <td>{item}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default ItemTable;

