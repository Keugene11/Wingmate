export default function Privacy() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-5 py-16">
      <h1 className="font-display text-[28px] font-bold tracking-tight mb-8">
        Privacy Policy
      </h1>
      <div className="space-y-6 text-[15px] leading-relaxed text-text-muted">
        <p>
          <strong className="text-text">Last updated:</strong> March 9, 2026
        </p>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">What we collect</h2>
          <p>
            When you sign in with Google, we store your name, email address, and profile
            picture to personalize your experience. We also store your subscription status
            and usage counts to manage your plan.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Photos</h2>
          <p>
            Photos you take or upload are processed in your browser and sent to our AI
            service for analysis. We do not store your photos on our servers. Photos are
            not shared with third parties beyond the AI processing needed to provide the
            service.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Chat messages</h2>
          <p>
            Conversations with the AI coach are not stored on our servers after your
            session ends. We may use anonymized, aggregated data to improve the service.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Payments</h2>
          <p>
            Payments are processed securely by Stripe. We never see or store your full
            card number. Stripe&apos;s privacy policy applies to payment processing.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Third-party services</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Supabase (authentication and database)</li>
            <li>Stripe (payment processing)</li>
            <li>Anthropic / AI providers (chat and image analysis)</li>
            <li>Vercel (hosting)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Your rights</h2>
          <p>
            You can delete your account and all associated data at any time from your
            profile page. For any privacy concerns, contact us at the email associated
            with this app.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Changes</h2>
          <p>
            We may update this policy from time to time. Continued use of the app after
            changes constitutes acceptance of the updated policy.
          </p>
        </section>
      </div>
    </main>
  );
}
