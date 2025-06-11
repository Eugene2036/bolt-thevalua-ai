import React from 'react';

interface Item {
    title: string;
    description: string;
}

interface DetailedItemTableProps {
    items: Item[];
}

const DetailedItemTable: React.FC<DetailedItemTableProps> = ({ items }) => {
    return (
        <table>
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                {items.map((item, index) => (
                    <tr key={index}>
                        <td>{item.title}</td>
                        <td>{item.description}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default DetailedItemTable;

// Example usage
const items = [
    { title: "Brickwork", description: "description 1" },
    { title: "Carpentry And Joinery - Doors", description: "description 2" },
    { title: "Ceilings", description: "description 3" }
];

const App = () => (
    <div>
        <h1>Detailed Item List</h1>
        <DetailedItemTable items={items} />
    </div>
);

export default App;

