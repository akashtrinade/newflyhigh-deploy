/**
 * Privacy Policy page.
 * Describes the data FlyHigh actually collects and processes.
 * NOTE: This draft is aligned with the platform's real data practices —
 * have it reviewed by legal before public launch.
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-950">
        Privacy Policy
      </h1>
      <p className="mb-10 text-sm text-slate-500">
        FlyHigh — a product of Trinade AI Technologies Pvt Ltd
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-slate-600">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">1. Introduction</h2>
          <p>
            FlyHigh is an online technical consultation platform connecting users with
            technical experts. This policy explains what information we collect, why we
            collect it, and how it is used, stored, and protected. By using FlyHigh you
            consent to the practices described here.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">2. Information We Collect</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Account information</strong> — name, email address, phone number
              (when provided), password (stored as a BCrypt hash, never in plain text),
              and profile details such as address, city, state, country, and profile photo.
            </li>
            <li>
              <strong>Expert profile information</strong> — professional title, category,
              experience, languages, bio, hourly rate, and portfolio links.
            </li>
            <li>
              <strong>Consultation data</strong> — call requests, session records,
              duration, ratings, and reviews you submit or receive.
            </li>
            <li>
              <strong>Payment data</strong> — payment amounts, transaction references,
              and payment status. Card details are handled by our payment provider
              (Razorpay) and never touch our servers.
            </li>
            <li>
              <strong>Google OAuth</strong> — if you sign in with Google, we receive your
              name and email address from Google.
            </li>
            <li>
              <strong>Usage data</strong> — connection timestamps, activity status, and
              technical logs needed to operate and secure the platform.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">3. How We Use Your Information</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>To create and manage your account and verify your identity (OTP).</li>
            <li>To connect you with experts and enable consultations, chat, and video calls.</li>
            <li>To process payments, commissions, and payouts to experts.</li>
            <li>To send service notifications (call requests, payment confirmations) and, where
              enabled in your notification preferences, product updates.</li>
            <li>To detect fraud, prevent abuse, and secure the platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">4. What We Share</h2>
          <p>
            We do not sell your personal information. Your name and profile may be visible to
            other registered users as part of consultations and reviews. Your email address is
            shared with an expert only in connection with a consultation you requested. Payment
            information is shared with Razorpay solely to process transactions.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">5. Data Security</h2>
          <p>
            We use industry-standard safeguards including hashed passwords, encrypted
            connections (HTTPS/WSS), signed authentication tokens, and rate limiting. No
            system is completely secure, and we cannot guarantee absolute security of data
            transmitted over the internet.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">6. Data Retention</h2>
          <p>
            We retain account data while your account is active and for a reasonable period
            after deletion as required for legal, accounting, and dispute-resolution purposes.
            Session and payment records are retained to support billing and payout obligations.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">7. Your Rights</h2>
          <p>
            You may access, correct, or update your profile information at any time from your
            account settings. You may request account deletion by contacting support. Where
            applicable law provides additional rights (such as data portability or the right
            to object), we will honour them on request.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">8. Cookies</h2>
          <p>
            FlyHigh uses essential cookies and browser storage to keep you signed in, remember
            your preferences, and secure your session. We do not use advertising trackers.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">9. Contact Us</h2>
          <p>
            For privacy questions or requests, contact us at{" "}
            <a className="font-semibold text-blue-600 underline" href="mailto:support@flyhigh.com">
              support@flyhigh.com
            </a>{" "}
            or through the Contact page.
          </p>
        </section>
      </div>
    </div>
  )
}
