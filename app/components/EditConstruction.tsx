import { Checkbox } from "@mui/material";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { ConstructionItem, Option } from "~/models/con-items";

interface Props {
    savedItems: ConstructionItem[];
    fieldName: string;
}
export function EditConstruction({ savedItems, fieldName }: Props) {

    const CONSTRUCTION_OPTIONS = ['Foundation', 'Roofing', 'Carpentry & Joinery', 'Ceilings', 'Floor', 'Metalwork', 'Plastering', 'Wall', 'Plumbing & Drainage', 'Paintwork', 'Mechanical Works', 'Veranda'];

    const [options, setOptions] = useState<Option[]>(CONSTRUCTION_OPTIONS.map(o => {
        const match = savedItems.find(i => i.identifier === o);
        return {
            identifier: o,
            comment: match?.comment || '',
            isSelected: !!match,
        }
    }));

    const finalOptions = options
        .filter(o => o.isSelected)
        .map(({ isSelected, ...o }) => o);

    function toggleSelected(identifier: string) {
        setOptions(prev => (prev.map((o): Option => {
            return o.identifier === identifier ?
                { ...o, isSelected: !o.isSelected } :
                o;
        })))
    }

    function handleCommentChange(identifier: string, newComment: string) {
        setOptions(options.map((o): Option => {
            return o.identifier === identifier ?
                { ...o, comment: newComment } :
                o;
        }))
    }

    return (
        <div className="grid grid-cols-3 gap-4">
            <input
                type='hidden'
                name={fieldName}
                value={JSON.stringify(finalOptions)}
            />
            {options.map((o) => (
                <div key={o.identifier} className="flex flex-row items-stretch gap-2">
                    <div className="flex flex-col justify-center items-center p-1">
                        <Checkbox
                            id={o.identifier}
                            onChange={() => toggleSelected(o.identifier)}
                            checked={o.isSelected}
                        />
                    </div>
                    <div className="flex flex-col items-stretch gap-2">
                        <label htmlFor={o.identifier}>{o.identifier}</label>
                        <input
                            type="text"
                            className={twMerge(
                                "bg-stone-50 rounded-md border border-stone-100 p-2 font-light",
                                !o.isSelected && 'bg-zinc-50 text-stone-50'
                            )}
                            value={o.comment}
                            placeholder={o.isSelected ? "Enter comment here..." : ""}
                            disabled={!o.isSelected}
                            onChange={e => handleCommentChange(o.identifier, e.currentTarget.value)}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}