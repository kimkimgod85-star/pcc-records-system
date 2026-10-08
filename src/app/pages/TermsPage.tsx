import { useEffect, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { TERMS_UPDATED } from '../lib/terms';

const SECTIONS: { id: string; title: string; body: ReactNode }[] = [
  {
    id: 'acceptance',
    title: '1. Acceptance of these terms',
    body: (
      <p>
        By creating an account or using the Pagadian Capitol Colleges (PCC) Web-Based School Records Request &amp; Scheduling
        System, you agree to these Terms of Use and to the processing of your personal information as described in the
        Privacy Notice below. If you do not agree, please do not create an account. You may still request your records in
        person at the Registrar’s Office.
      </p>
    ),
  },
  {
    id: 'collect',
    title: '2. Information we collect',
    body: (
      <ul>
        <li><strong>Account details:</strong> full name, Student ID, email address, and whether you are a student or alumni.</li>
        <li><strong>Request details:</strong> documents you request, purpose, number of copies, processing type, and notes.</li>
        <li><strong>Payment details:</strong> amount, payment method, GCash reference or OR number, and the photo of your proof of payment.</li>
        <li><strong>Pickup details:</strong> the date and time you book to claim your documents.</li>
        <li><strong>Device details:</strong> if you turn on notifications, a technical address that lets us send alerts to your device.</li>
      </ul>
    ),
  },
  {
    id: 'use',
    title: '3. How we use your information',
    body: (
      <ul>
        <li>To verify your identity and match your request with your school records.</li>
        <li>To process, prepare, and release the documents you request.</li>
        <li>To verify your payments and keep an accurate record of fees paid.</li>
        <li>To schedule your pickup and send you updates by notification and email.</li>
        <li>To produce summary reports for the Registrar’s Office (counts and totals, not individual profiles).</li>
      </ul>
    ),
  },
  {
    id: 'consent',
    title: '4. Your consent (Data Privacy Act of 2012)',
    body: (
      <p>
        PCC processes your personal information in line with Republic Act No. 10173, the Data Privacy Act of 2012, and the
        rules of the National Privacy Commission (NPC). By ticking “I agree” when you register, you give PCC your consent to
        collect and process your information for the purposes listed above. Your information is used only for school records
        services and is never sold.
      </p>
    ),
  },
  {
    id: 'sharing',
    title: '5. Who can see your information',
    body: (
      <p>
        Only authorized PCC personnel (the Registrar’s Office and staff who verify payments) can see your requests and
        payment proofs. We do not share your information with outside parties unless required by law or with your
        permission. The system is hosted on secure cloud services that store data on our behalf.
      </p>
    ),
  },
  {
    id: 'security',
    title: '6. Security and retention',
    body: (
      <p>
        Your account is protected by your password and an email verification code. Access to records is limited by role. We
        keep request and payment records for as long as needed for school records and auditing, then delete or anonymize them
        according to school policy.
      </p>
    ),
  },
  {
    id: 'rights',
    title: '7. Your rights',
    body: (
      <p>
        You have the right to be informed, to access your information, to correct wrong information, to object to
        processing, to ask for deletion when it is no longer needed, and to file a complaint with the National Privacy
        Commission. To use these rights, contact the Registrar’s Office. If your name or Student ID is wrong, the Registrar
        can correct it for you.
      </p>
    ),
  },
  {
    id: 'responsibilities',
    title: '8. Your responsibilities',
    body: (
      <ul>
        <li>Give true and complete information. False details can lead to your request being rejected.</li>
        <li>Upload only real proofs of payment. Fake or edited receipts may result in account suspension and school action.</li>
        <li>Keep your password private. You are responsible for activity on your account.</li>
        <li>Bring a valid ID when claiming documents. Only you or a person with your written authorization can claim them.</li>
      </ul>
    ),
  },
  {
    id: 'payments',
    title: '9. Fees and payments',
    body: (
      <p>
        Pay only after the Registrar approves your request. Fees follow the current PCC schedule shown in the system and may
        change. Once a document has been processed, fees are generally not refundable. If a payment is rejected, the reason
        will be shown and you may submit a corrected proof.
      </p>
    ),
  },
  {
    id: 'disclaimer',
    title: '10. Disclaimer',
    body: (
      <p>
        This system makes requesting records more convenient but does not replace the official records of the Registrar’s
        Office. Processing times are estimates and may change during busy periods, holidays, or school events. We work to keep
        the system available but cannot promise it will always be free of interruptions or errors. Official documents are
        valid only when released by the Registrar’s Office with the proper signature and school seal.
      </p>
    ),
  },
  {
    id: 'changes',
    title: '11. Changes to these terms',
    body: (
      <p>
        We may update these terms when our services or the law changes. The date at the top of this page shows the latest
        update. Continuing to use the system after an update means you accept the new terms.
      </p>
    ),
  },
  {
    id: 'contact',
    title: '12. Contact us',
    body: (
      <p>
        Registrar’s Office, Pagadian Capitol Colleges, Rizal Avenue, Tuburan Dist., Pagadian City 7016 ·{' '}
        <a href="mailto:registrar@pcci.ph.education">registrar@pcci.ph.education</a> ·{' '}
        <a href="tel:+639187272849">0918 727 2849</a>
      </p>
    ),
  },
];

export default function TermsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="min-h-svh flex flex-col bg-gray-50 dark:bg-slate-950">
      <Header variant="landing" />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-800 dark:text-blue-300 hover:underline mb-5"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="bg-blue-800 px-5 sm:px-8 py-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Terms of Use &amp; Privacy Notice
                </h1>
                <p className="text-sm text-blue-100 mt-0.5">Last updated {TERMS_UPDATED}</p>
              </div>
            </div>
          </div>

          <nav aria-label="Sections" className="px-5 sm:px-8 py-4 border-b border-gray-100 dark:border-slate-700 flex flex-wrap gap-2">
            {SECTIONS.map(section => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
              >
                {section.title.replace(/^\d+\.\s*/, '')}
              </a>
            ))}
          </nav>

          <div className="px-5 sm:px-8 py-6 space-y-7 text-[15px] leading-relaxed text-gray-700 dark:text-gray-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-blue-700 dark:[&_a]:text-blue-300 [&_a]:underline [&_strong]:text-gray-900 dark:[&_strong]:text-white">
            {SECTIONS.map(section => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {section.title}
                </h2>
                {section.body}
              </section>
            ))}
          </div>
        </div>

        {!isAuthenticated && (
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Ready to start? <Link to="/register" className="font-semibold text-blue-800 dark:text-blue-300 hover:underline">Create an account</Link>
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}
