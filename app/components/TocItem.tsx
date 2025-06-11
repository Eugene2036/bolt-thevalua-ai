import { twMerge } from "tailwind-merge";

interface Props {
    title: string;
    pageNumber: number;
    isSubSection?: true;
}
export function TocItem(props: Props) {
    const { title, pageNumber, isSubSection } = props
    return (
        <div className={twMerge(
            "flex flex-row items-end gap-2 font-light text-stone-800 tracking-wide",
            isSubSection && 'pl-8'
        )}>
            <span className={twMerge("font-normal", isSubSection && 'font-light')}>{title}</span>
            <div className='grow flex flex-col items-stretch pb-1'>
                <div className='border-b border-dashed border-stone-600' />
            </div>
            <span>{pageNumber}</span>
        </div>
    )
}