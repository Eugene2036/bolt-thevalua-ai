import type { ComponentProps } from 'react';

import { Dialog } from '@headlessui/react';
import { twMerge } from 'tailwind-merge';

import { NewCalculator } from './NewCalculator';

interface Props extends ComponentProps<typeof NewCalculator> {
  isOpen: boolean;
  closeDialog: (index: number) => void;
  index: number | undefined;
}
export function NewCalculatorDialog(props: Props) {
  const { plotId, grcId, isBull, isOpen, isAdmin, closeDialog, index, recordProps } = props;

  console.log('dialog render', new Date().getTime());

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={() => {
          if (typeof index !== 'undefined') {
            closeDialog(index);
          }
        }}
        className="relative z-50"
      >
        {/* The backdrop, rendered as a fixed sibling to the panel container */}
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 w-screen overflow-y-auto">
          {/* Full-screen container to center the panel */}
          <div className="flex min-h-full items-center justify-center p-4">
            {/* The actual dialog panel  */}
            <Dialog.Panel className="mx-auto max-w-xl lg:max-w-4xl rounded bg-white">
              {/* <Dialog.Title>Calculator</Dialog.Title> */}
              <div className={twMerge('overflow-hidden rounded-lg shadow-lg ring-1 ring-black/5', 'flex flex-col items-stretch')}>
                <div className={twMerge('relative grid gap-2 bg-white py-2 lg:grid-cols-2', 'flex flex-col items-stretch')}>
                  <div className="flex flex-col items-stretch px-2">
                    <NewCalculator plotId={plotId} isAdmin={isAdmin} isBull={isBull} grcId={grcId} recordProps={recordProps} />
                  </div>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
