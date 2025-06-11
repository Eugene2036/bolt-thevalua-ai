
import { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

interface Props extends ComponentProps<'button'> {
    fn: () => void;
}
export function AddSectionButton(props: Props) {
    const { fn, className, children, ...rest } = props
    return (
        <button
            type="button"
            onClick={fn}
            className={twMerge(
                "text-blue-500 bg-stone-200 rounded-md px-4 py-2",
                "hover:scale-105 transition-all duration-300",
                className
            )}
            {...rest}
        >
            {children || '+ Add Sub-Section'}
        </button>
    )
}
