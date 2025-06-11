import { Checkbox } from '@mui/material';
import { useState } from 'react';

interface Props {
    construction: string[];
}
export function Construction(props: Props) {
    const { construction: initConstruction } = props;

    const [construction, setConstruction] = useState<string[]>(initConstruction || []);

    const options = ['Foundation', 'Roofing', 'Carpentry & Joinery', 'Ceilings', 'Floor', 'Metalwork', 'Plastering', 'Wall', 'Plumbing & Drainage', 'Paintwork', 'Mechanical Works', 'Veranda'].map((identifier) => {
        const selected = construction.some((service) => service === identifier);
        return { identifier, selected };
    });

    const handleChange = (identifier: string) => {
        return setConstruction((prevState) => {
            const selected = prevState.some((el) => el === identifier);
            if (selected) {
                return prevState.filter((el) => el !== identifier);
            }
            return [...prevState, identifier];
        });
    };

    return (
        <div className="grid grid-cols-3 gap-6">
            <input type="hidden" name="construction" value={JSON.stringify(construction)} />
            {options.map((option) => (
                <div key={option.identifier} className="flex flex-row items-center gap-2">
                    <Checkbox id={option.identifier} onChange={(_) => handleChange(option.identifier)} checked={option.selected} />
                    <label htmlFor={option.identifier}>{option.identifier}</label>
                </div>
            ))}
        </div>
    );
}