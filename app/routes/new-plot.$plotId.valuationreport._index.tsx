import '~/print-pages.css';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

import type { LoaderArgs } from "@remix-run/node"
import { getFullName, getValidatedId, hasSuccess } from '~/models/core.validations';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { IconArrowUp, IconFidgetSpinner } from '@tabler/icons-react';
import { ReportCommentSchema } from '~/models/report-comments';
import { z } from 'zod';
import { getErrorMessage } from '~/models/errors';
import { twMerge } from 'tailwind-merge';
import dayjs from 'dayjs';
import { DATE_INPUT_FORMAT } from '~/models/dates';
import { ChevronDown, ChevronUp } from 'tabler-icons-react';
import { useUser } from '~/utils';
import { action as commentAction } from "~/routes/record-report-comment";
import { useForm } from '~/components/ActionContextProvider';
import { toast } from 'sonner';

export async function loader({ params }: LoaderArgs) {
  const plotId = getValidatedId(params.plotId);
  return { plotId }
}

export default function ReactPdf() {
  const currentUser = useUser();
  const { plotId } = useLoaderData<typeof loader>();

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPdf() {
      try {
        setIsLoading(true);
        console.log("Fetching...");
        const res = await fetch(`/generate-pdf?plotId=${plotId}`);
        const blob = await res.blob();
        const fileName = `Plot ${plotId}.pdf`;
        const file = new File([blob], fileName, { type: 'application/pdf' });
        const url = URL.createObjectURL(file);
        // const url = URL.createObjectURL(blob);
        console.log("PDF fetched successfully.");

        if (iframeRef.current) {
          iframeRef.current.src = url;
        }
      } catch (error) {
        console.log("Error", error);
        setError("Failed to load PDF, please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPdf();
  }, [plotId]);

  const [comments, setComments] = useState<z.infer<typeof ReportCommentSchema>[]>([]);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [folded, setFolded] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/fetch-report-comments/${plotId}`).then(r => r.json());
      const Schema = z.object({
        comments: ReportCommentSchema.array()
      });
      const result = Schema.safeParse(response);
      console.log("999", response);
      if (!result.success) {
        console.log(">>>", result.error);
        throw new Error("Failed to fetch comments");
      }
      console.log("111", result.data.comments);
      setComments(result.data.comments);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [plotId]);

  useEffect(() => {
    fetchComments();
  }, [plotId, fetchComments]);

  return (
    <div className="flex flex-col items-center justify-start h-full">
      <div className="fixed bottom-4 right-4 flex flex-col items-stretch gap-2 text-xs print:hidden">
        <div className="rounded-lg shadow-md z-10 bg-white flex flex-col items-stretch border border-stone-200">
          {!folded && (
            <div className="flex flex-col items-stretch p-2">
              <div className="flex flex-col items-stretch gap-4 py-2">
                {loading && <p>Loading comments...</p>}
                {error && <p className="text-red-500">{error}</p>}
                {!loading && !error && !comments.length && (
                  <div className="flex flex-col justify-center items-start">
                    <span className="text-stone-400">No comments yet</span>
                  </div>
                )}
                {!loading && !error && comments.map((comment, index) => (
                  <div key={index} className={`flex flex-col items-start`}>
                    <p className="font-bold">{comment.fullName}</p>
                    <p>{comment.comment}</p>
                    <p className="text-xs font-light text-stone-400">{dayjs(comment.date).format(DATE_INPUT_FORMAT)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className={twMerge("flex flex-row items-center gap-2 p-2", !folded && 'border-t border-dashed border-stone-400')}>
            <span className="font-semibold">Comments</span>
            <div className='grow' />
            <button
              type="button"
              onClick={() => setFolded(prev => !prev)}
              className="bg-stone-200 rounded-full p-2 hover:bg-stone-300 transition-colors duration-200 flex flex-col justify-center items-center"
            >
              {folded && <ChevronUp className="text-stone-800" size={16} />}
              {!folded && <ChevronDown className="text-stone-800" size={16} />}
            </button>
          </div>
        </div>
        <AddComment
          comment={comment}
          setComment={setComment}
          onAdd={fetchComments}

          userId={currentUser.id}
          fullName={getFullName(currentUser.firstName, currentUser.lastName)}
          plotId={plotId}
        />
      </div>
      <div className="flex flex-col items-stretch w-full md:w-[70%] lg:w-[80%] print:w-full gap-6 overflow-auto mt-2 border-stone-800 border-b-4">
        {isLoading && (
          <div className="flex items-center justify-center w-full h-full">
            <div className="flex flex-row items-center gap-4">
              <IconFidgetSpinner className="text-teal-600 animate-spin" size={40} />
              <span className="text-xl font-semibold text-teal-600">Loading PDF</span>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center w-full h-full">
            <span className="text-xl font-semibold text-red-600">{error}</span>
          </div>
        )}
        <iframe
          ref={iframeRef}
          title="PDF Preview"
          style={{ border: 'none', width: '100%', height: '100vh' }}
          className={twMerge("transition-opacity duration-500", isLoading ? 'opacity-0' : 'opacity-100')}
        />
      </div>
    </div>
  )
}

interface AddCommentProps {
  comment: string;
  setComment: (newVal: string) => void;
  onAdd: () => void;

  userId: string;
  fullName: string;
  plotId: string;
}
function AddComment(props: AddCommentProps) {
  const { comment, setComment, onAdd, userId, fullName, plotId, } = props;

  const fetcher = useFetcher<typeof commentAction>();
  const { isProcessing } = useForm(fetcher, ReportCommentSchema);

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      setComment('');
      toast.success('Comment added successfully');
      onAdd();
    }
  }, [fetcher.data, onAdd, setComment]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('fullName', fullName);
    formData.append('comment', comment);
    formData.append('plotId', plotId);
    formData.append('date', new Date().toString());
    return fetcher.submit(
      formData,
      { method: 'post', action: '/record-report-comment', }
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-2">
      <fetcher.Form method="post" onSubmit={handleSubmit} className="flex flex-row items-center gap-2 bg-stone-200 rounded-full px-4 py-3">
        <div className="flex flex-col items-stretch grow">
          <input
            type='text'
            value={comment}
            placeholder="Add Comment..."
            className="px-1 py-1 text-stone-600 bg-transparent outline-none ring-none text-xs"
            onChange={(e) => setComment(e.target.value)} disabled={isProcessing}
          />
        </div>
        <button
          type="submit"
          className="flex flex-col justify-center items-center bg-black/10 rounded-full p-1"
          disabled={isProcessing}
        >
          <IconArrowUp className="text-stone-800" size={20} />
        </button>
      </fetcher.Form>
    </div>
  )
}