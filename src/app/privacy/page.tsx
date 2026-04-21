import Link from "next/link";

export default function Privacy() {
  return (
    <main className="min-h-app max-w-2xl mx-auto px-5 py-16">
      <Link href="/" className="text-[14px] text-text-muted underline mb-8 inline-block">
        &larr; Back
      </Link>

      <h1 className="font-display text-[28px] font-bold tracking-tight mb-2">
        Privacy Policy
      </h1>
      <p className="text-text-muted text-[14px] mb-8">Last updated: March 11, 2026</p>

      <div className="space-y-6 text-[15px] leading-relaxed text-text-muted">
        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Overview</h2>
          <p>
            Wingmate (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;the app&rdquo;) is an AI-powered confidence coaching
            application. We respect your privacy and are committed to protecting your personal
            information. This policy explains what data we collect, how we use it, and your rights.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Information we collect</h2>
          <p className="mb-2">When you sign in with Google, we receive and store:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your name, email address, and Google profile picture</li>
            <li>A unique user identifier provided by Google</li>
          </ul>
          <p className="mt-2">We also collect:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your custom username and profile picture (if you set one)</li>
            <li>Your subscription status and plan details</li>
            <li>Usage counts (sessions used, messages sent) for managing free tier limits</li>
            <li>Daily check-in records (whether you checked in and your streak)</li>
            <li>Community posts, comments, and votes you create</li>
          </ul>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Google API Services disclosure</h2>
          <p className="mb-2">
            Wingmate&apos;s use and transfer of information received from Google APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              className="underline text-text"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. Specifically:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>We only request access to the Google data necessary to provide the service (basic profile information for authentication)</li>
            <li>We do not use Google data for serving advertisements</li>
            <li>We do not transfer Google data to third parties unless necessary to provide or improve the service, to comply with applicable law, or as part of a merger or acquisition with adequate data protection</li>
            <li>We do not use Google data for purposes unrelated to the functionality of Wingmate</li>
            <li>Human review of Google user data is limited to security purposes, investigating abuse, complying with legal obligations, or where the user has provided affirmative consent</li>
          </ul>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Chat messages</h2>
          <p>
            Conversations with the AI coach are stored only in your browser&apos;s session
            storage and are deleted when you close the tab or start a new chat. Messages are
            sent to our AI provider for generating responses but are not stored on our servers
            after the session ends. We may use anonymized, aggregated usage statistics to
            improve the service.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Payments</h2>
          <p>
            Payments are processed securely by Stripe. We never see or store your full card
            number, CVV, or billing address. We only receive confirmation of your subscription
            status. Stripe&apos;s own{" "}
            <a href="https://stripe.com/privacy" className="underline text-text" target="_blank" rel="noopener noreferrer">
              privacy policy
            </a>{" "}
            applies to payment processing.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">How we use your information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and personalize the coaching service</li>
            <li>To manage your account, subscription, and free tier usage</li>
            <li>To track your daily check-in streak and progress</li>
            <li>To display your community posts and profile to other users</li>
            <li>To improve the app experience based on anonymized, aggregated usage patterns</li>
          </ul>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Data sharing</h2>
          <p>
            We do not sell your personal information to third parties. We share data only with
            the following service providers, strictly for operating the app:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong className="text-text">Supabase</strong> — authentication, database, and file storage</li>
            <li><strong className="text-text">Stripe</strong> — payment processing</li>
            <li><strong className="text-text">Anthropic / AI providers</strong> — chat responses and image analysis</li>
            <li><strong className="text-text">Vercel</strong> — hosting and content delivery</li>
            <li><strong className="text-text">Google</strong> — OAuth authentication</li>
          </ul>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Data retention</h2>
          <p>
            We retain your account data for as long as your account exists. Chat messages are
            not retained beyond your browser session.
            When you delete your account, all associated data (profile, posts, comments, votes,
            check-ins, usage records, and subscription records) is permanently deleted.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Your rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Access your personal data through your profile page</li>
            <li>Update or correct your information (username, profile picture)</li>
            <li>Delete your account and all associated data at any time from your profile page</li>
            <li>Export your data by contacting us</li>
          </ul>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Revoking access</h2>
          <p>
            You can revoke Wingmate&apos;s access to your Google account at any time by visiting your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              className="underline text-text"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Account Permissions
            </a>{" "}
            page and removing Wingmate. You can also delete your Wingmate account from your profile
            page, which will permanently remove all your data from our systems.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Children&apos;s privacy</h2>
          <p>
            Wingmate is intended for users aged 18 and older. We do not knowingly collect
            information from children under 18. If we learn that we have collected data from
            a child under 18, we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Security</h2>
          <p>
            We use industry-standard security measures including encrypted connections (HTTPS),
            secure authentication (OAuth 2.0), and row-level security policies on our database.
            However, no method of transmission over the Internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Changes to this policy</h2>
          <p>
            We may update this policy from time to time. We will notify users of significant
            changes. Continued use of the app after changes constitutes acceptance of the
            updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">Contact</h2>
          <p>
            If you have questions or concerns about this privacy policy or your data, please
            contact us at <a href="mailto:keugenelee11@gmail.com" className="underline">keugenelee11@gmail.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
