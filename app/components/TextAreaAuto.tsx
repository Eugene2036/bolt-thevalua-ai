import type { ComponentProps } from 'react';
import { useDisabled, useIsSubmitting, useUpdateState } from './ActionContextProvider';
import { TextArea } from './TextArea';
import { useRef, useEffect } from 'react';

interface Props extends ComponentProps<typeof TextArea> {
    name: string;
}

export function TextAreaAuto(props: Props) {
    const { name, disabled: initDisabled, defaultValue, ...restOfProps } = props;
    const disabled = useDisabled();
    const isSubmitting = useIsSubmitting();
    const updateState = useUpdateState();
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const textarea = event.target;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
        updateState(name, textarea.value);
    };

    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
        }
    }, [defaultValue]);

    return (
        <TextArea
            ref={textAreaRef}
            name={name}
            errors={[]}
            value={defaultValue}
            onInput={handleInput}
            disabled={isSubmitting || initDisabled || disabled}
            className="min-h-[4rem] resize-y"
            {...restOfProps}
        />
    );
}