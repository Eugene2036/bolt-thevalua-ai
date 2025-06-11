import { ComponentProps } from "react"
import { twMerge } from "tailwind-merge"

interface Props extends Omit<ComponentProps<'div'>, 'children'> {
    children: string;
}
export function SectionHeading(props: Props) {
    const { children, className, ...rest } = props
    return (
        <div className={twMerge("border-b border-stone-800 flex flex-col items-start justify-center py-4", className)} {...rest}>
            <h2 id={`Section_${children}`} className="text-lg font-semibold text-red-600">{children}</h2>
        </div>
    )
}