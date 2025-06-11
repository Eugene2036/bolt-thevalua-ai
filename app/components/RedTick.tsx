import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

interface Props extends ComponentProps<'div'> { }
export default function RedTick(props: Props) {
    return (
        <div>
            <svg className="h-5 w-5 text-red-500" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" strokeLinecap="round" stroke-linejoin="round">  <path stroke="none" d="M0 0h24v24H0z" />  <path d="M5 12l5 5l10 -10" /></svg>
        </div>
    );
}
