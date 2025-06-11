import { z } from "zod";

export const ConstructionItemSchema = z.object({
    identifier: z.string(),
    comment: z.string(),
});
export type ConstructionItem = z.infer<typeof ConstructionItemSchema>;

export type Option = {
    identifier: string;
    comment: string;
    isSelected: boolean;
}

export function getValidatedConstructionItems(rawData: string) {
    try {
        return ConstructionItemSchema.array().parse(JSON.parse(rawData));
    } catch (err) {
        return [];
    }
}