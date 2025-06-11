import { IconX } from "@tabler/icons-react";
import { twMerge } from "tailwind-merge";

interface Props {
    removeFn: () => void;
}
export function DeleteSectionButton(props: Props) {
    const { removeFn } = props
    return (
        <button
            type="button"
            onClick={removeFn}
            className={twMerge(
                "absolute top-0 translate-x-1/2 -translate-y-1/2 right-0 w-6 h-6",
                "rounded-full bg-red-600 flex flex-col justify-center items-center",
                "hover:scale-105 hover:rotate-180 transition-all duration-300"
            )}
        >
            <IconX className="text-white" size={16} />
        </button>
    )
}