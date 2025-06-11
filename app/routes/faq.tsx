import FAQ from '~/components/FAQ';
import { Footer } from '~/components/Footer';
import Navbar from '~/components/NavBar';
import { PageCatchBoundary } from '~/components/PageCatchBoundary';
import { PageErrorBoundary } from '~/components/PageErrorBoundary';
import { useOptionalUser } from '~/utils';

export default function TermsAndConditions() {
  const user = useOptionalUser();

  return (
    <main className="m-0 p-0 h-full">
      <div className="flex flex-auto flex-col justify-center">
        <div className="flex flex-col items-stretch min-h-full">
          <Navbar />
        </div>
        <div className="mx-auto w-full max-w-[80%] px-8 pt-40">
          <FAQ />
        </div>
      </div>
      <Footer />
    </main>
  );
}

export function CatchBoundary() {
  return <PageCatchBoundary />;
}

export function ErrorBoundary({ error }: { error: Error }) {
  return <PageErrorBoundary error={error} />;
}
