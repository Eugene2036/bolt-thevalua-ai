import type { UploadState } from '../models/imageUploading';
import type { Icon as TablerIcon } from 'tabler-icons-react';
import { LoaderQuarter, PhotoPlus } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';

type Props = React.ComponentProps<TablerIcon> & {
    status: UploadState;
};

export function FileUploadIcon(props: Props) {
    const { status, className, size, ...otherProps } = props;

    return (
        <div className="flex flex-col  items-center justify-center p-2 gap-2">
            {
                status === 'uploading' && (
                    <>
                        <LoaderQuarter className="animate-spin group-hover:text-stone-800 text-stone-400" />
                        <span className="font-light text-lg text-stone-400 group-hover:text-stone-800">Uploading file...</span>
                    </>
                )
            }
            {
                status !== 'uploading' && (
                    <>
                        <PhotoPlus size={size || 30} className={twMerge('text-stone-400 group-hover:text-stone-800', className)} {...otherProps} />
                    </>
                )
            }
        </div>
    );
}
