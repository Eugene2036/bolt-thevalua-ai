import { PartialBlock } from "@blocknote/core";

interface GrcRecord {
    identifier: string;
    unit: string;
    size: number;
}
export function usePlinthTable(records: GrcRecord[]) {

    const tableBlock: PartialBlock = {
        type: 'table',
        content: {
            type: 'tableContent',
            rows: [
                { cells: ['Identifier', 'Unit', 'Size'] },
                ...records.map(r => ({ cells: [r.identifier, r.unit, String(r.size)] })),
            ],
        }
    }
    return JSON.stringify(tableBlock);
}