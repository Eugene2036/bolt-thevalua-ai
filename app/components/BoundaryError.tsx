import { AlertTriangle } from 'tabler-icons-react';

interface Props {
  title: string;
  children: React.ReactNode;
}

export function BoundaryError(props: Props) {
  const { title, children } = props;
  return (
    <div className="flex flex-col items-stretch justify-center gap-6 rounded-md bg-white p-6 shadow-md">
      <div className="flex flex-col items-center justify-center gap-4">
        <AlertTriangle size={40} color="red" />
        <h1 className="text-2xl font-semibold text-stone-600">{title}</h1>
      </div>
      <div className="flex flex-col items-stretch justify-center gap-6 text-center">{children}</div>
    </div>
  );
}

export function ContactSupport({ preFilledMessage }: { preFilledMessage: string }) {
  return (
    <a
      className="text-indigo-600 underline"
      href={`mailto:info@thevalua.com?subject=I've encountered a problem&body=${preFilledMessage}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      contact us via email
    </a>
  );
}

export function createPrefilledMessage(message: string) {
  return encodeURIComponent(`I've encountered the following error: ${message}`);
}
