import type { KeyboardEvent } from 'react';

import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { Transition } from '@headlessui/react';
import { IconSparkles } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import Markdown from 'markdown-to-jsx';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import { AppLinks } from '~/models/links';

interface Props {
  aiContext: string;
}
interface Message {
  author: string;
  message: string;
}
export function DrawerExample({ aiContext }: Props) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef<HTMLButtonElement>(null);

  const [messages, setMessages] = useState<(Message & { isError?: boolean })[]>([]);
  // const { submit, ...fetcher } = useFetcher<typeof action>();

  const { mutate, ...mutation } = useMutation({
    mutationFn: async (message: string) => {
      const formData = new FormData();
      formData.append('message', message);
      return fetch(AppLinks.PromptAi, { method: 'post', body: formData }).then((r) => r.json());
    },
  });

  const sendMessageRef = useRef<HTMLInputElement>(null);

  const isProcessing = mutation.isPending;
  const messageError = mutation.isError ? mutation.error.message : '';

  function runMutation(message: string) {
    const finalMessage = [
      `The following is information you're to use to answer the question that follows after: ${aiContext}.`,
      `Now answer the following question with regards to that information: ${message}.`,
      `If the information isn't relevant to the question, indicate that in the response, but to try answer the question all the same`,
      `Also try to avoid using technical details when responding, details like ID. Respond as if to a non-tech savvy person.`,
      `Be comprehensive but concise, as if to responding to a valued customer.`,
    ].join('');
    mutate(finalMessage);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && event.shiftKey) {
      console.log('Enter plus Shift key was pressed');
    } else if (event.key === 'Enter') {
      handleMutation();
    }
  }

  useEffect(() => {
    if (mutation.isError) {
      setMessages((prevState) => [...prevState, { author: 'AI', message: mutation.error.message, isError: true }]);
    }
  }, [mutation.isError, mutation.error]);

  useEffect(() => {
    const Schema = z.object({ completion: z.string() });
    function hasCompletion(data: unknown): data is z.infer<typeof Schema> {
      return Schema.safeParse(data).success;
    }
    if (hasCompletion(mutation.data)) {
      const completion = mutation.data.completion;
      setMessages((prevState) => [...prevState, { author: 'AI', message: completion }]);
    }
  }, [mutation.data]);

  function handleMutation() {
    if (sendMessageRef.current) {
      const newMessage = sendMessageRef.current.value;
      if (newMessage) {
        setMessages((prevState) => [...prevState, { author: 'Me', message: newMessage }]);
        // mutate(newMessage);
        runMutation(newMessage);
        setTimeout(() => {
          if (sendMessageRef?.current) {
            sendMessageRef.current.value = '';
          }
        }, 500);
      }
    }
  }

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        onClick={onOpen}
        className={twMerge(
          'fixed bottom-4 right-4 z-[9999999] flex flex-row items-center gap-2 rounded-full border border-stone-400 bg-white px-6 py-4 shadow-2xl',
          isOpen && 'hidden'
        )}
      >
        <IconSparkles />
        <span className="text-sm font-semibold text-blue-600">Talk to our AI agent</span>
      </button>
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} finalFocusRef={btnRef} closeOnOverlayClick={false}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>How can we help you?</DrawerHeader>
          <DrawerBody>
            <div className="flex h-full flex-col items-stretch justify-start space-y-8">
              <div className="item-start flex grow flex-col justify-start space-y-4 p-2">
                {messages.map((message, index) => (
                  <Transition
                    key={index}
                    appear={true}
                    show={true}
                    enter="transition-all duration-75 transform ease-in"
                    enterFrom="opacity-0 translate-y-full"
                    enterTo="opacity-1 translate-y-0"
                    leave="transition-all duration-75 transform ease-out"
                    leaveFrom="opacity-1 translate-y-0"
                    leaveTo="opacity-0 -translate-y-full"
                  >
                    <div
                      className={twMerge(
                        'py-4 text-xs font-light text-stone-800',
                        message.isError && 'text-red-600',
                        message.author === 'Me' && 'flex flex-col items-end text-end'
                      )}
                    >
                      <div
                        className={twMerge(
                          'mark_p flex flex-col items-stretch gap-4',
                          message.author === 'Me' && 'rounded-full bg-stone-200 px-4 py-2'
                        )}
                      >
                        <Markdown options={{ forceBlock: true }}>{message.message.trim()}</Markdown>
                      </div>
                      {/* {message.message.trim().replace(/\n/g, '<br>')} */}
                    </div>
                  </Transition>
                ))}
                <Transition
                  show={!!isProcessing}
                  appear={true}
                  enter="transition-all duration-75 transform ease-in"
                  enterFrom="opacity-0 translate-y-full"
                  enterTo="opacity-1 translate-y-0"
                  leave="transition-all duration-75 transform ease-out"
                  leaveFrom="opacity-1 translate-y-0"
                  leaveTo="opacity-0 -translate-y-full"
                >
                  <span className="py-6 text-xs text-stone-400">Processing...</span>
                </Transition>
                {!messages.length && (
                  <div className="flex flex-col items-center justify-center p-6">
                    <span className="text-sm font-light text-stone-400">No prompts yet</span>
                  </div>
                )}
                {!!messageError && <span className="py-1 text-sm text-red-600">{messageError}</span>}
              </div>
              <div className="item-end flex flex-row justify-start gap-2 rounded-full bg-stone-200 p-2">
                <div className="flex grow flex-col items-stretch justify-center">
                  <input
                    type="text"
                    name="message"
                    ref={sendMessageRef}
                    className="rounded-full bg-transparent px-4 py-2 text-xs text-stone-600 outline-none"
                    placeholder="Enter a prompt here..."
                    onKeyDown={handleKeyDown}
                    required
                  />
                </div>
                <div className="flex flex-col items-center justify-center">
                  <button
                    type="button"
                    onClick={handleMutation}
                    className="rounded-full bg-stone-400 p-2 transition-all duration-300 hover:bg-stone-500"
                  >
                    {isProcessing ? <Loader className="animate-spin" /> : <ArrowRight />}
                  </button>
                </div>
              </div>
            </div>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="outline" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue">Save</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
