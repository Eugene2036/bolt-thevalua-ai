import type { UploadState } from '../models/imageUploading';
import type { Icon as TablerIcon } from 'tabler-icons-react';

import { LoaderQuarter, PhotoPlus } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';

type Props = React.ComponentProps<TablerIcon> & {
  status: UploadState;
};

export function ImageUploadIcon(props: Props) {
  const { status, className, size, ...otherProps } = props;

  return (
    <div className="relative flex flex-col h-[150px] w-[150px] items-center justify-center p-6 gap-6">
      {status === 'uploading' && (
        <>
          <LoaderQuarter className="animate-spin group-hover:text-stone-800 text-stone-400" />
          <span className="font-light text-lg text-stone-400 group-hover:text-stone-800">Uploading Image...</span>
        </>
      )}
      {status !== 'uploading' && (
        <>
          <PhotoPlus size={size || 40} className={twMerge('text-stone-400 group-hover:text-stone-800', className)} {...otherProps} />
        </>
      )}
    </div>
  );
}
