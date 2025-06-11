import { Footer } from '~/components/Footer';
import Navbar from '~/components/NavBar';
import { PageCatchBoundary } from '~/components/PageCatchBoundary';
import { PageErrorBoundary } from '~/components/PageErrorBoundary';
import { useOptionalUser } from '~/utils';

export default function TermsAndConditions() {
  const user = useOptionalUser();

  return (
    <main className="m-0 p-0 h-full">
      <div className="flex flex-auto flex-col justify-center pb-4">
        <div className="flex flex-col items-stretch min-h-full">
          <Navbar />
        </div>
        <div className="mx-auto w-full max-w-[80%] px-8 pt-40">
          <div className="flex flex-col items-stretch gap-4 text-justify">
            <h2 style={{ fontSize: '1.7em' }}>
              <strong>Terms of Service</strong>
            </h2>
            <p>Last updated: April 9, 2025</p>

            <h3>
              <strong>1. Acceptance of Terms</strong>
            </h3>
            <p> By accessing or using our property valuation web application ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the App. </p>

            <h3>
              <strong>2. Description of Service</strong>
            </h3>
            <p> The App provides automated property valuation estimates using publicly available data and proprietary algorithms. These valuations are estimates only and should not be considered as professional appraisals or substitutes for professional advice. </p>

            <h3>
              <strong>3. User Responsibilities</strong>
            </h3>
            <p> <h3 className="text-lg font-semibold mb-2">3.1 Account Creation</h3> <p>When creating an account, you agree to provide accurate and complete information.</p><h3 className="text-lg font-semibold mb-2 mt-4">3.2 Proper Use</h3> <p>You agree not to use the App for any unlawful purpose or in any way that might harm the App or its users.</p> </p>

            <h3>
              <strong>4. Intellectual Property</strong>
            </h3>
            <p> All content, features, and functionality on the App, including but not limited to the valuation algorithms, are the property of [Your Company Name] and are protected by intellectual property laws. </p>

            <h3>
              <strong>5. Disclaimer of Warranties</strong>
            </h3>
            <p> The App is provided "as is" without warranties of any kind. We do not guarantee the accuracy of property valuations or that the App will be available without interruption. </p>

            <h3>
              <strong>6. Limitation of Liability</strong>
            </h3>
            <p> [Your Company Name] shall not be liable for any damages resulting from your use of the App or reliance on property valuation estimates provided by the App. </p>

            <h3>
              <strong>7. Privacy Policy</strong>
            </h3>
            <p> Your use of the App is also governed by our Privacy Policy, which explains how we collect, use, and protect your information. </p>

            <h3>
              <strong>8. Modifications to Terms</strong>
            </h3>
            <p> We reserve the right to modify these Terms at any time. Continued use of the App after changes constitutes acceptance of the modified Terms. </p>
            <h3>
              <strong>9. Termination</strong>
            </h3>
            <p> We may terminate or suspend access to the App immediately, without prior notice, for any breach of these Terms. </p>
            <h3>
              <strong>10. Governing Law</strong>
            </h3>
            <p> These Terms shall be governed by the laws of [Your Jurisdiction] without regard to its conflict of law provisions. </p>
            <h3>
              <strong>11. Contact Information</strong>
            </h3>
            <p> For questions about these Terms, please contact us at [Your Contact Email]. </p><div className="flex flex-auto flex-col justify-center p-6 bg-blue-50 rounded-lg my-4 border-l-4 border-blue-500"> <p className="font-medium">By using our Property Valuation App, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p> </div>
          </div>
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
