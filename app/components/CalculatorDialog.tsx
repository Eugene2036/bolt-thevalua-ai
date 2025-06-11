import type { ComponentProps } from 'react';

import { Dialog } from '@headlessui/react';
import { twMerge } from 'tailwind-merge';

import { Calculator } from './Calculator';

interface Props extends ComponentProps<typeof Calculator> {
  isOpen: boolean;
  closeDialog: () => void;
}
export function CalculatorDialog(props: Props) {
  const { grcId, insurance, isBull, isOpen, isAdmin, closeDialog } = props;

  return (
    <>
      <Dialog open={isOpen} onClose={closeDialog} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-xl lg:max-w-4xl rounded bg-white">
              <div className={twMerge('overflow-hidden rounded-lg shadow-lg ring-1 ring-black/5', 'flex flex-col items-stretch')}>
                <div className={twMerge('relative grid gap-2 bg-white py-2 lg:grid-cols-2', 'flex flex-col items-stretch')}>
                  <div className="flex flex-col items-stretch px-2">
                    {!!grcId && <Calculator insurance={insurance} isAdmin={isAdmin} isBull={isBull} grcId={grcId} />}
                    {!grcId && (
                      <div className="flex flex-col items-stretch">
                        <span className="text-base italic text-stone-600 font-light">Please save this row first</span>
                      </div>
                    )}
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
