import Link from "next/link";

export default function Terms() {
  return (
    <main className="min-h-app max-w-2xl mx-auto px-5 py-16">
      <Link href="/" className="text-[14px] text-text-muted underline mb-8 inline-block">
        &larr; Back
      </Link>

      <h1 className="font-display text-[28px] font-bold tracking-tight mb-2">
        Terms of Service
      </h1>
      <p className="text-text-muted text-[14px] mb-8">Last updated: March 11, 2026</p>

      <div className="space-y-6 text-[15px] leading-relaxed text-text-muted">
        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">1. Acceptance of terms</h2>
          <p>
            By accessing or using Wingmate (&ldquo;the app&rdquo;, &ldquo;we&rdquo;,
            &ldquo;our&rdquo;, &ldquo;us&rdquo;), you agree to be bound by these Terms of Service.
            If you do not agree, do not use the app.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">2. Description of service</h2>
          <p>
            Wingmate is an AI-powered confidence coaching application that provides personalized
            coaching conversations, daily check-ins, progress tracking, and a community feature.
            The app is available as a free tier with limited usage and as a paid subscription
            (&ldquo;Pro&rdquo;) with expanded access.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">3. Eligibility</h2>
          <p>
            You must be at least 18 years old to use Wingmate. By using the app, you represent
            and warrant that you meet this age requirement.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">4. Account and authentication</h2>
          <p>
            Wingmate uses Google Sign-In via Supabase for authentication. By signing in, you
            authorize us to access your basic Google profile information (name, email, and profile
            picture) solely for the purpose of creating and managing your account. You are
            responsible for maintaining the security of your Google account used to access Wingmate.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">5. Google API Services</h2>
          <p>
            Wingmate&apos;s use of information received from Google APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              className="underline text-text"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. We only request access to basic profile
            information needed to operate the service. We do not use Google data for advertising,
            and we do not transfer Google data to third parties except as necessary to provide
            the service.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">6. Subscriptions and payments</h2>
          <p className="mb-2">
            Wingmate offers a free tier and paid Pro subscriptions. The following
            auto-renewable subscription options are available:
          </p>
          <ul className="list-disc pl-5 space-y-1 mb-3">
            <li><strong className="text-text">Pro Monthly</strong> — $9.99/month, auto-renews every month</li>
            <li><strong className="text-text">Pro Yearly</strong> — $49.99/year, auto-renews every year</li>
          </ul>
          <p className="mb-2 font-semibold text-text">Apple App Store (iOS):</p>
          <ul className="list-disc pl-5 space-y-1 mb-3">
            <li>Payment will be charged to your Apple ID account at confirmation of purchase</li>
            <li>Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period</li>
            <li>Your account will be charged for renewal within 24 hours prior to the end of the current period at the same price</li>
            <li>You can manage and cancel subscriptions in your Apple ID account settings (Settings &gt; Apple ID &gt; Subscriptions)</li>
          </ul>
          <p className="mb-2 font-semibold text-text">Web:</p>
          <ul className="list-disc pl-5 space-y-1 mb-3">
            <li>You authorize Stripe, our payment processor, to charge your chosen payment method on a recurring basis</li>
            <li>Subscriptions automatically renew unless cancelled before the end of the current billing period</li>
            <li>You may cancel your subscription at any time through the billing portal accessible from your profile</li>
          </ul>
          <p>
            Refunds are handled on a case-by-case basis — contact us at{" "}
            <a href="mailto:keugenelee11@gmail.com" className="underline">keugenelee11@gmail.com</a>.
            For Apple App Store purchases, refunds are subject to{" "}
            <a href="https://support.apple.com/en-us/HT204084" className="underline text-text" target="_blank" rel="noopener noreferrer">
              Apple&apos;s refund policy
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">7. Acceptable use</h2>
          <p className="mb-2">You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the app for any unlawful purpose or in violation of any applicable laws</li>
            <li>Post community content that is abusive, harassing, hateful, sexually explicit, or otherwise objectionable</li>
            <li>Impersonate another person or misrepresent your identity</li>
            <li>Attempt to interfere with, compromise, or disrupt the app or its infrastructure</li>
            <li>Use automated means (bots, scrapers) to access or interact with the service</li>
            <li>Circumvent usage limits or access controls</li>
          </ul>
          <p className="mt-2">
            We reserve the right to suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">8. AI coaching disclaimer</h2>
          <p>
            Wingmate provides AI-generated coaching for social confidence and personal development.
            This is <strong className="text-text">not</strong> professional therapy, medical advice,
            or mental health treatment. The AI coach is a language model and may produce inaccurate
            or inappropriate responses. You should not rely on the app as a substitute for
            professional help. If you are experiencing a mental health crisis, please contact a
            qualified professional or emergency service.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">9. Community content</h2>
          <p>
            You retain ownership of content you post to the community. By posting, you grant us
            a non-exclusive, worldwide license to display your content within the app. We may
            remove content that violates these terms at our discretion. You are solely responsible
            for the content you post.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">10. Intellectual property</h2>
          <p>
            The Wingmate app, including its design, code, branding, and AI coaching system, is
            owned by us and protected by applicable intellectual property laws. You may not copy,
            modify, distribute, or reverse-engineer any part of the service.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">11. Account deletion</h2>
          <p>
            You may delete your account at any time from your profile page. Upon deletion, all
            your data — including your profile, posts, comments, votes, check-ins, usage records,
            and subscription records — will be permanently removed. Active subscriptions should
            be cancelled before deleting your account.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">12. Limitation of liability</h2>
          <p>
            Wingmate is provided &ldquo;as is&rdquo; without warranties of any kind, express or
            implied. To the fullest extent permitted by law, we shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages arising from your
            use of the service. Our total liability shall not exceed the amount you paid us in
            the twelve months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">13. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your access to the app at any time,
            with or without notice, for conduct that we believe violates these terms or is
            harmful to other users or the service. You may stop using the service at any time.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">14. Changes to these terms</h2>
          <p>
            We may update these terms from time to time. We will notify users of significant
            changes. Continued use of the app after changes constitutes acceptance of the
            updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">15. Privacy</h2>
          <p>
            Your use of Wingmate is also governed by our{" "}
            <Link href="/privacy" className="underline text-text">
              Privacy Policy
            </Link>
            , which describes how we collect, use, and protect your data.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">16. Governing law</h2>
          <p>
            These terms are governed by the laws of the United States. Any disputes will be
            resolved in the courts of the applicable jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="text-text font-semibold text-[17px] mb-2">17. Contact</h2>
          <p>
            If you have questions about these terms, please contact us at{" "}
            <a href="mailto:keugenelee11@gmail.com" className="underline">keugenelee11@gmail.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
