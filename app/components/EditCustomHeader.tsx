import { ComponentProps, useState } from "react";
import { twMerge } from "tailwind-merge";
import CompanyLogo from "./CompanyLogo";

interface Props {
    logoPublicId: string | undefined | null;
    currentTitle: string;
    fieldName: string;
}
export function EditCustomHeader(props: Props) {
    const { logoPublicId, currentTitle, fieldName } = props;

    const [title, setTitle] = useState(currentTitle);

    return (
        <div className="flex flex-row items-center gap-4 border border-stone-200 rounded-md relative px-4 py-2">
            <input type='hidden' name={fieldName} value={title} />
            <Badge className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="flex flex-col items-stretch grow max-w-[40%]">
                <input
                    type='text'
                    value={title}
                    placeholder="Enter Header Title..."
                    className="bg-stone-50 rounded-md p-4 ring-0 focus:ring-0 focus:outline-none"
                    style={{ fontSize: '20px' }}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </div>
            <div className='grow' />
            {!!logoPublicId && <CompanyLogo publicId={logoPublicId} />}
        </div>
    )
}

interface BadgeProps extends Omit<ComponentProps<'div'>, 'children'> {

}
function Badge(props: BadgeProps) {
    const { className, ...rest } = props;
    return (
        <div className={twMerge("border-stone-200 rounded-full border shadow-xl bg-white px-6 py-2", className)} {...rest}>
            <span className="font-light text-stone-400">Header</span>
        </div>
    )
}