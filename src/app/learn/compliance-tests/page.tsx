import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";

type ExchangeProps = {
  ask: string;
  response: string;
};

function Exchange({ ask, response }: ExchangeProps) {
  return (
    <div className="bg-bg-card border border-border rounded-xl px-4 py-3 mb-2.5">
      <p className="text-[14px] leading-snug italic text-text/70 mb-1.5">
        &ldquo;{ask}&rdquo;
      </p>
      <div className="flex items-start gap-2">
        <ArrowRight size={13} strokeWidth={2.5} className="shrink-0 mt-1" />
        <p className="text-[14.5px] leading-snug font-medium">
          &ldquo;{response}&rdquo;
        </p>
      </div>
    </div>
  );
}

type CategoryProps = {
  title: string;
  body: string;
};

function Category({ title, body }: CategoryProps) {
  return (
    <li className="text-[15px] leading-relaxed">
      <strong>{title}</strong> <span>{body}</span>
    </li>
  );
}

type CallProps = {
  ask: string;
  reason: string;
};

function Call({ ask, reason }: CallProps) {
  return (
    <li className="text-[14.5px] leading-snug">
      <span className="italic">&ldquo;{ask}&rdquo;</span>{" "}
      <span className="text-text/70">— {reason}</span>
    </li>
  );
}

export default function ComplianceTestsArticle() {
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
        Compliance tests
      </h1>
      <p className="text-text/70 text-[15px] leading-relaxed mb-10">
        Tiny asks that quietly decide who&rsquo;s leading and who&rsquo;s
        following — and how to stop being on autopilot.
      </p>

      <article className="space-y-10">
        <section>
          <h2 className="font-display text-[20px] font-bold mb-3">What it is</h2>
          <p className="text-[15px] leading-relaxed mb-3">
            A compliance test is any small request, ask, or bid that checks one
            specific thing: <em>will this person do what I&rsquo;m implicitly
            asking, on my terms, without pushback?</em>
          </p>
          <p className="text-[15px] leading-relaxed">
            The content of the request barely matters. The test is whether you
            comply automatically. &ldquo;Grab me a beer.&rdquo; &ldquo;How&rsquo;s
            my hair look?&rdquo; &ldquo;Tell me I&rsquo;m right.&rdquo;
            &ldquo;Watch this show, you&rsquo;ll love it.&rdquo; None of these
            are inherently anything. Each one is a tiny check.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[20px] font-bold mb-3">Why they matter</h2>
          <p className="text-[15px] leading-relaxed mb-5">
            Five things happen at once when a compliance test gets passed.
          </p>
          <ol className="space-y-5">
            <li>
              <p className="font-semibold text-[15px] mb-1">
                1. Frame negotiation
              </p>
              <p className="text-[15px] leading-relaxed">
                Whoever&rsquo;s doing the asking is leading the interaction in
                that micro-moment. Whoever&rsquo;s automatically complying is
                following. A pattern of compliance shifts who&rsquo;s &ldquo;the
                asker&rdquo; and who&rsquo;s &ldquo;the responder&rdquo; in the
                dynamic.
              </p>
            </li>
            <li>
              <p className="font-semibold text-[15px] mb-1">
                2. Status calibration
              </p>
              <p className="text-[15px] leading-relaxed">
                Every social interaction is constantly recalibrating who&rsquo;s
                higher and lower in the local hierarchy. Compliance tests are
                how — usually unconsciously — people figure out where you slot.
              </p>
            </li>
            <li>
              <p className="font-semibold text-[15px] mb-1">
                3. Investment direction
              </p>
              <p className="text-[15px] leading-relaxed">
                Compliance flows energy and effort toward the asker. The guy
                who&rsquo;s always being asked to fetch, validate, decide, and
                accommodate is constantly investing <em>in the asker,</em> and
                that compounds into a subordinate position.
              </p>
            </li>
            <li>
              <p className="font-semibold text-[15px] mb-1">
                4. Reaction extraction
              </p>
              <p className="text-[15px] leading-relaxed">
                Tests probe for emotional reactivity. Will you flinch?
                Apologize? Over-explain? Each reaction is information about how
                solid your frame is.
              </p>
            </li>
            <li>
              <p className="font-semibold text-[15px] mb-1">
                5. The pattern, not the moment
              </p>
              <p className="text-[15px] leading-relaxed">
                A single test means nothing. The whole engine depends on
                accumulation — each ask small enough to dismiss individually,
                until a hundred of them have set the dynamic without anyone
                noticing.
              </p>
            </li>
          </ol>
          <p className="text-[15px] leading-relaxed mt-5">
            That&rsquo;s why compliance tests are insidious. They don&rsquo;t{" "}
            <em>look</em> like anything. Cold reads feel like moves. Direct
            status grabs feel like moves. Compliance tests feel like normal
            conversation. &ldquo;Grab me a beer&rdquo; is just a thing friends
            say. That&rsquo;s the whole engine.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[20px] font-bold mb-3">Categories</h2>
          <ul className="space-y-3">
            <Category
              title="Small asks."
              body={`“Pass me that.” “Hold this.” “Hit the light.” “Toss me the remote.” Tiny physical requests, low cost, refused or accepted on autopilot.`}
            />
            <Category
              title="Service asks."
              body={`“Drive me home.” “Lend me twenty.” “Cook me something.” Higher cost, more revealing about the dynamic.`}
            />
            <Category
              title="Evaluation requests."
              body={`“How's this fit?” “How's my hair?” “Read this and tell me if it's weird.” Puts you in evaluator mode, them in subject mode — except they're actually leading because they set the agenda.`}
            />
            <Category
              title="Validation grabs."
              body={`“I'm right, right?” “Back me up here.” “Tell him I'm right.” Fishes for agreement on demand. Refusing feels almost rude, which is what makes it potent.`}
            />
            <Category
              title="Taste authority."
              body={`“You should watch this.” “You'd love this place, trust me.” Soft assertions that position the asker as the cultural arbiter.`}
            />
            <Category
              title="Decisional asks."
              body={`“Pick a number.” “Heads or tails.” “Tell me a secret.” Small choices made under your direction — active engagement on your terms.`}
            />
            <Category
              title="Directional moves."
              body={`“Let's go.” “We're sitting over there.” “Come outside.” Decisions stated, not asked. Compliance is following along.`}
            />
            <Category
              title="Commitment grabs."
              body={`“Come Friday.” “Save the date.” “Don't bail this time.” Locks them into your timeline.`}
            />
            <Category
              title="Interruptions."
              body="Cutting in mid-sentence to redirect or correct. Checks if they'll yield the floor."
            />
            <Category
              title="Self-deprecation hooks."
              body={`“I'm such an idiot, right?” Performs low self-worth to fish for reassurance.`}
            />
            <Category
              title="Gentle impositions."
              body={`“Move your stuff, I'm sitting here.” “Use a coaster.” “You're in my spot.” Tiny expectations of deference, small enough that pushing back feels petty.`}
            />
          </ul>
        </section>

        <section>
          <h2 className="font-display text-[20px] font-bold mb-3">
            Should you reject tests run on you?
          </h2>
          <p className="text-[15px] leading-relaxed mb-3">
            Yes — selectively, with humor. Not because every ask is a power
            move, but because{" "}
            <strong>automatic compliance is the problem</strong>, not compliance
            itself. Automatic compliance accumulates into a subordinate
            position invisibly, over time, in dynamics you don&rsquo;t even
            realize you&rsquo;re losing.
          </p>
          <p className="text-[15px] leading-relaxed">
            The defense isn&rsquo;t refusing every ask — that&rsquo;s just
            compliance reversed, equally reactive, equally frame-controlled.
            The defense is <em>not being on autopilot.</em> Your responses come
            from your own filter, not from their prompt. You comply when you
            want to. You don&rsquo;t when you don&rsquo;t. Both responses come
            from inside you.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[20px] font-bold mb-3">
            Accept or push back?
          </h2>
          <p className="text-[15px] leading-relaxed mb-5">
            The line isn&rsquo;t the ask itself — it&rsquo;s what&rsquo;s
            behind it. Real need, reciprocity, and reasonable cost mean comply.
            Pattern, performance, and probing mean push back.
          </p>

          <div className="bg-bg-card border border-border rounded-2xl shadow-card px-5 py-5 mb-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <Check size={13} strokeWidth={3} className="text-white" />
              </div>
              <p className="font-semibold text-[15px]">Accept cleanly</p>
            </div>
            <ul className="space-y-3">
              <Call
                ask="Can you help me move Saturday?"
                reason="real ask, real cost, real friend. Say yes if you can. Or no, cleanly."
              />
              <Call
                ask="Rough day. Can we talk tonight?"
                reason="someone you love asking for actual support. Show up."
              />
              <Call
                ask="Hand me that, my hands are full."
                reason="it makes sense in context. Just do it. Not every ask is a frame move."
              />
              <Call
                ask="It'd mean a lot if you came to my thing."
                reason="explicit value, not pressure. If you can, go."
              />
              <Call
                ask="Grab me a beer? I'll get the next round."
                reason="reciprocity is built in. Fine."
              />
              <Call
                ask="Can you proofread this for me?"
                reason="genuine help on something they care about, not on-demand validation."
              />
            </ul>
          </div>

          <div className="bg-bg-card border border-border rounded-2xl shadow-card px-5 py-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
                <X size={13} strokeWidth={3} className="text-white" />
              </div>
              <p className="font-semibold text-[15px]">Push back or redirect</p>
            </div>
            <ul className="space-y-3">
              <Call
                ask="Tell him I'm right."
                reason="public validation grab. Refusing feels rude — that's the point."
              />
              <Call
                ask="Grab me a beer."
                reason="third time today, never reciprocated. That's a pattern, not a favor."
              />
              <Call
                ask="I'm such an idiot, right?"
                reason="self-deprecation hook fishing for reassurance. Tease, don't reassure."
              />
              <Call
                ask="Why are you so quiet?"
                reason="reactivity probe. Don't justify your mood on demand."
              />
              <Call
                ask="You're driving."
                reason="order disguised as a plan. Decisions stated, not asked."
              />
              <Call
                ask="How do I look? (5th time today)"
                reason="constant evaluation flips you into permanent mirror duty."
              />
              <Call
                ask="Why won't you come?"
                reason="justification demand after a clean no. The shorter your answer, the higher your frame."
              />
              <Call
                ask="You agree with me, right?"
                reason="agreement-on-demand. Agree-and-amplify or shrug."
              />
            </ul>
          </div>
        </section>

        <section>
          <h2 className="font-display text-[20px] font-bold mb-2">
            How to handle them
          </h2>
          <p className="text-[15px] leading-relaxed mb-6">
            The principle:{" "}
            <strong>add friction with humor, never hostility.</strong> Stay warm
            throughout. Don&rsquo;t apologize. Don&rsquo;t over-explain.
            Don&rsquo;t go cold.
          </p>

          <p className="font-semibold text-[15px] mb-2">The redirect</p>
          <p className="text-[14px] text-text/70 leading-snug mb-3">
            Bounce the ask back without refusing.
          </p>
          <Exchange
            ask="Grab me a beer."
            response="Yeah, get me one too while you're up."
          />
          <Exchange
            ask="How's my hair?"
            response="I refuse to be your mirror, dude."
          />
          <Exchange
            ask="Tell me I'm right."
            response="I will not. Continue."
          />

          <p className="font-semibold text-[15px] mb-2 mt-6">The light tease</p>
          <p className="text-[14px] text-text/70 leading-snug mb-3">
            Lean into the ask being a little ridiculous.
          </p>
          <Exchange
            ask="Watch this show, you'll love it."
            response="I'll consider it. Your taste is suspect."
          />
          <Exchange
            ask="I'm such an idiot, right?"
            response="Yeah a bit. You're cute though."
          />

          <p className="font-semibold text-[15px] mb-2 mt-6">The non-engage</p>
          <p className="text-[14px] text-text/70 leading-snug mb-3">
            Don&rsquo;t water it. Shrug, half-smile, change subject.
          </p>
          <Exchange
            ask="Aren't you gonna defend me?"
            response="Nah, you're doing fine."
          />

          <p className="font-semibold text-[15px] mb-2 mt-6">
            The agree-and-amplify
          </p>
          <p className="text-[14px] text-text/70 leading-snug mb-3">
            Comply so absurdly the ask looks silly.
          </p>
          <Exchange
            ask="You agree with me, right?"
            response="Oh massively. You're never wrong about anything. It's well documented."
          />

          <p className="font-semibold text-[15px] mb-2 mt-6">
            The straight no, friendly
          </p>
          <p className="text-[14px] text-text/70 leading-snug mb-3">
            The most underrated move.
          </p>
          <Exchange
            ask="Grab me a beer."
            response="Nah, I'm good."
          />
          <Exchange
            ask="Come to this thing Friday."
            response="Can't make it."
          />
          <p className="text-[15px] leading-relaxed mt-3">
            No hedge, no apology, no five-paragraph justification. Just a
            friendly, unbothered &ldquo;no.&rdquo; If they push for
            justification, the highest-frame answer is the shortest:
            &ldquo;Just not feeling it.&rdquo; You don&rsquo;t owe a defense.
          </p>

          <p className="font-semibold text-[15px] mb-2 mt-6">
            The deflect-with-redirect
          </p>
          <p className="text-[14px] text-text/70 leading-snug mb-3">
            Refuse and pivot in one move.
          </p>
          <Exchange
            ask="How's my hair look?"
            response="Looks fine. Did you see the email from Mark?"
          />
        </section>

        <section>
          <h2 className="font-display text-[20px] font-bold mb-3">
            What never to do
          </h2>
          <ul className="space-y-4">
            <li>
              <p className="font-semibold text-[15px] mb-1">
                Comply <em>and</em> complain.
              </p>
              <p className="text-[15px] leading-relaxed">
                &ldquo;Fine, I&rsquo;ll get it but you always make me get the
                drinks.&rdquo; Worst possible response. You did the thing{" "}
                <em>and</em> signaled you resent it. Pick one — comply cleanly
                or don&rsquo;t comply.
              </p>
            </li>
            <li>
              <p className="font-semibold text-[15px] mb-1">
                Justify at length.
              </p>
              <p className="text-[15px] leading-relaxed">
                The length of the justification is inversely proportional to
                your frame. Short refusals from a settled place. Long ones from
                an anxious one.
              </p>
            </li>
            <li>
              <p className="font-semibold text-[15px] mb-1">Go cold.</p>
              <p className="text-[15px] leading-relaxed">
                Refusing with annoyed energy reads as petty. The whole move
                requires warmth and ease. You&rsquo;re not fighting —
                you&rsquo;re just not on autopilot.
              </p>
            </li>
            <li>
              <p className="font-semibold text-[15px] mb-1">Refuse everything.</p>
              <p className="text-[15px] leading-relaxed">
                A guy who refuses every small ask is just compliance-testing in
                reverse — still frame-controlled, just inverted. Real
                friendship and love require yielding. The discipline is{" "}
                <em>consciousness about the ask</em>, not reflexive opposition.
              </p>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-[20px] font-bold mb-3">
            Spotting patterns
          </h2>
          <p className="text-[15px] leading-relaxed mb-4">
            Single moments mean nothing. Don&rsquo;t read into one ask. The
            diagnostic is <em>direction over time.</em>
          </p>
          <ul className="space-y-2 mb-4">
            <li className="text-[15px] leading-relaxed flex gap-2">
              <span>•</span>
              <span>Do the asks flow mostly one way?</span>
            </li>
            <li className="text-[15px] leading-relaxed flex gap-2">
              <span>•</span>
              <span>Am I consistently the evaluator, fetcher, validator?</span>
            </li>
            <li className="text-[15px] leading-relaxed flex gap-2">
              <span>•</span>
              <span>
                Could I think of times <em>they</em> deferred to <em>me</em> on
                something? Recently?
              </span>
            </li>
            <li className="text-[15px] leading-relaxed flex gap-2">
              <span>•</span>
              <span>
                When I refuse a small ask, does it create disproportionate
                friction?
              </span>
            </li>
            <li className="text-[15px] leading-relaxed flex gap-2">
              <span>•</span>
              <span>Do I find myself rehearsing how to say no to them?</span>
            </li>
          </ul>
          <p className="text-[15px] leading-relaxed">
            If most answers point to imbalance, there&rsquo;s a pattern. The
            fix isn&rsquo;t a confrontation — it&rsquo;s gradual. Light
            pushback here, redirect there, comply when you genuinely feel like
            it, decline when you don&rsquo;t. Over a few weeks the dynamic
            re-balances without anyone naming it.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[20px] font-bold mb-3">
            The deeper move
          </h2>
          <p className="text-[15px] leading-relaxed mb-3">
            Most compliance testing isn&rsquo;t malicious. People running it
            usually aren&rsquo;t consciously trying to dominate you —
            they&rsquo;re often insecure themselves, running little frame moves
            to feel solid. Some are genuinely just asking about their hair.
          </p>
          <p className="text-[15px] leading-relaxed mb-5">
            The orientation you want isn&rsquo;t <em>defensive.</em> It&rsquo;s{" "}
            <em>settled.</em> You&rsquo;re not scanning every interaction for
            power moves and counter-moving. You&rsquo;re so secure in your own
            frame that compliance tests bounce off naturally. You comply when
            reasonable, decline when you don&rsquo;t want to, tease when
            it&rsquo;s funny, engage genuinely when it&rsquo;s genuine. None of
            it costs you anything because you&rsquo;re not anxious about the
            outcome.
          </p>
          <p className="text-[15px] leading-relaxed mb-5">
            That&rsquo;s the destination. You don&rsquo;t beat compliance tests
            by counter-testing or by becoming difficult. You beat them by
            becoming someone whose responses come from inside himself instead
            of from the prompt someone else set.
          </p>
          <div className="rounded-2xl bg-[#1a1a1a] text-white px-5 py-5">
            <p className="text-[15px] leading-relaxed font-semibold">
              Compliance tests stop being tests when you stop being testable.
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
