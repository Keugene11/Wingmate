import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type ExampleGroupProps = {
  label: string;
  items: string[];
};

function ExampleGroup({ label, items }: ExampleGroupProps) {
  return (
    <div className="bg-bg-card border border-border rounded-xl shadow-card px-4 py-4 mb-3">
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] mb-3">
        {label}
      </p>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="text-[14.5px] leading-snug italic">
            &ldquo;{item}&rdquo;
          </li>
        ))}
      </ul>
    </div>
  );
}

type RuleProps = {
  title: string;
  body: string;
};

function Rule({ title, body }: RuleProps) {
  return (
    <li className="text-[15px] leading-relaxed">
      <strong className="font-semibold">{title}</strong>{" "}
      <span>{body}</span>
    </li>
  );
}

export default function ColdReadsArticle() {
  return (
    <main className="min-h-app max-w-2xl mx-auto px-5 pt-6 pb-12 animate-fade-in">
      <Link
        href="/?tab=learn"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-muted press mb-6"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Learn
      </Link>

      <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2">
        Game concepts
      </p>
      <h1 className="font-display text-[32px] font-extrabold tracking-tight leading-[1.1] mb-3">
        Cold reads
      </h1>
      <p className="text-text/70 text-[15px] leading-relaxed mb-10">
        PUA mechanics, human delivery — what makes them work, and how they
        should actually sound.
      </p>

      <article className="space-y-10">
        <section>
          <h2 className="font-display text-[20px] font-bold mb-3">What it is</h2>
          <p className="text-[15px] leading-relaxed">
            A cold read is a confident statement about someone, based on
            minimal info, delivered as observation — not a question.{" "}
            <em>&ldquo;You toned down.&rdquo;</em>{" "}
            <em>&ldquo;You&rsquo;re the oldest.&rdquo;</em>{" "}
            <em>&ldquo;You&rsquo;re not actually mad.&rdquo;</em>
          </p>
        </section>

        <section>
          <h2 className="font-display text-[20px] font-bold mb-3">Why it works</h2>
          <p className="text-[15px] leading-relaxed mb-5">
            Five things happen at once when you drop a good cold read.
          </p>
          <ol className="space-y-5">
            <li>
              <p className="font-semibold text-[15px] mb-1">
                1. Manufactured intimacy
              </p>
              <p className="text-[15px] leading-relaxed">
                Being accurately seen normally takes time. A cold read fakes
                that texture in one line. Her brain registers &ldquo;this
                person knows me&rdquo; and tags the interaction as deeper than
                it actually is.
              </p>
            </li>
            <li>
              <p className="font-semibold text-[15px] mb-1">
                2. Frame installation
              </p>
              <p className="text-[15px] leading-relaxed">
                Whoever defines the other person holds the higher frame. A
                cold read puts you in the describer position and her in the
                described — confirming, denying, or elaborating on{" "}
                <em>your</em> characterization.
              </p>
            </li>
            <li>
              <p className="font-semibold text-[15px] mb-1">
                3. Investment bait
              </p>
              <p className="text-[15px] leading-relaxed">
                She has to engage. Confirm, push back, ask what you mean — all
                of it is investment, and investment generates attraction (her
                brain reads her own engagement as &ldquo;I must be into
                this&rdquo;).
              </p>
            </li>
            <li>
              <p className="font-semibold text-[15px] mb-1">4. Value display</p>
              <p className="text-[15px] leading-relaxed">
                Reading someone accurately signals presence, social
                intelligence, and confidence. You&rsquo;ve shown you actually
                look at people instead of running through your own anxiety.
              </p>
            </li>
            <li>
              <p className="font-semibold text-[15px] mb-1">
                5. The &ldquo;wow&rdquo; hit
              </p>
              <p className="text-[15px] leading-relaxed">
                A read that lands creates one charged emotional moment early
                in the interaction. People don&rsquo;t remember conversations —
                they remember moments. You&rsquo;ve planted yourself.
              </p>
            </li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-[20px] font-bold mb-3">Construction</h2>
          <ul className="space-y-3">
            <li className="text-[15px] leading-relaxed">
              <strong>Statistical likelihoods</strong> dressed as insight.{" "}
              <span className="italic">
                (&ldquo;You&rsquo;re the responsible one in your friend
                group.&rdquo;)
              </span>
            </li>
            <li className="text-[15px] leading-relaxed">
              <strong>Universal experiences</strong> framed specifically.{" "}
              <span className="italic">
                (&ldquo;You had something end in the last couple years.&rdquo;)
              </span>
            </li>
            <li className="text-[15px] leading-relaxed">
              <strong>Visible cues</strong> flipped to interior traits.{" "}
              <span className="italic">
                (Well-dressed → &ldquo;you care about presentation, not in a
                vain way.&rdquo;)
              </span>
            </li>
            <li className="text-[15px] leading-relaxed">
              <strong>Named contradictions.</strong>{" "}
              <span className="italic">
                (&ldquo;You act independent but you want to be taken care
                of.&rdquo;)
              </span>
            </li>
          </ul>
          <div className="mt-5 bg-bg-card border border-border rounded-xl px-4 py-4">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] mb-1.5">
              The recipe
            </p>
            <p className="text-[14.5px] leading-relaxed italic">
              Specific-feeling claim + stated as fact + slight edge + no
              follow-up explanation.
            </p>
          </div>
        </section>

        <section>
          <h2 className="font-display text-[20px] font-bold mb-3">Delivery rules</h2>
          <ul className="space-y-3.5">
            <Rule
              title="Statement, not question."
              body={"“You're the oldest.” Not “are you?”"}
            />
            <Rule
              title="Drop it and let it sit."
              body="Don't justify or fill silence."
            />
            <Rule
              title="Slight edge, not pure flattery."
              body="Compliments are supplication. Observation with a small challenge is confidence."
            />
            <Rule
              title="Compress."
              body="Four words beats fourteen. The shorter the read, the less it sounds like a technique."
            />
            <Rule
              title="One at a time."
              body="Stacking reads turns perceptive into creepy."
            />
            <Rule
              title="Graceful miss."
              body={"Wrong? “Hm. I usually read that right.” Frame survives."}
            />
          </ul>
        </section>

        <section>
          <h2 className="font-display text-[20px] font-bold mb-2">
            Examples — friend voice
          </h2>
          <p className="text-[15px] leading-relaxed mb-5">
            The register that actually lands. Same mechanic, real speech.
          </p>

          <ExampleGroup
            label="Behind the surface"
            items={[
              "You're meaner than you let on.",
              "You pretend you don't care but you have an opinion about everything.",
            ]}
          />
          <ExampleGroup
            label="Type"
            items={[
              "You're the youngest, no?",
              "You're the one who plans everything and acts annoyed about it.",
            ]}
          />
          <ExampleGroup
            label="Current state"
            items={[
              "You almost didn't come out tonight, huh.",
              "You're bored as hell aren't you.",
            ]}
          />
          <ExampleGroup
            label="Tease / challenge"
            items={[
              "You're spoiled. I'm sorry, you are.",
              "You're trouble. I can already tell.",
            ]}
          />
          <ExampleGroup
            label="The compressed killer reads"
            items={[
              "You toned down.",
              "You wanted to leave an hour ago.",
              "You changed your mind about me.",
            ]}
          />
        </section>

        <section>
          <h2 className="font-display text-[20px] font-bold mb-3">The point</h2>
          <p className="text-[15px] leading-relaxed mb-3">
            The PUA framework explains <em>why</em> cold reads work — frame,
            intimacy, investment. The friend-voice examples show{" "}
            <em>how they should actually sound.</em> Workshop-voice reads
            (&ldquo;you have a wild side most people don&rsquo;t see&rdquo;)
            get clocked as technique. Real-voice reads (&ldquo;you&rsquo;re
            meaner than you let on&rdquo;) slide under the radar and do the
            same job.
          </p>
          <p className="text-[15px] leading-relaxed mb-5">
            A cold read that sounds like a cold read fails. A cold read that
            sounds like a perceptive friend noticing something works on
            everyone — guys, girls, strangers, dates.
          </p>
          <div className="rounded-2xl bg-[#1a1a1a] text-white px-5 py-5">
            <p className="text-[15px] leading-relaxed font-semibold">
              That&rsquo;s the whole skill: PUA mechanics, human delivery.
            </p>
          </div>
        </section>
      </article>

      <Link
        href="/?tab=learn"
        className="mt-12 inline-flex items-center gap-1.5 text-[13px] text-text-muted press"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back to Learn
      </Link>
    </main>
  );
}
