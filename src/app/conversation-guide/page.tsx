'use client';

import { useState } from 'react';

const STEPS = [
  { title: 'Identify the actual disagreement',
    body: 'Political arguments are usually several arguments at once: one about facts, one about priorities, one about who is to blame. Name which one you are in. If the conversation keeps sliding between them, that is a sign someone is losing ground on one and switching to another.',
    prompt: 'Try asking: "Are we disagreeing about what is true, or about what matters more?"' },
  { title: 'Ask what evidence would change each mind',
    body: 'Ask them, then answer it yourself, honestly. If neither of you can name anything, the disagreement is about values rather than facts. That is a legitimate destination and a much calmer one than an unwinnable argument about evidence.',
    prompt: 'Try asking: "What would you need to see to change your mind on this?"' },
  { title: 'Restate their argument until they agree it is accurate',
    body: 'Say their position back to them well enough that they say "yes, that is it," before you respond. This does more work than any other move here. It is disarming, and it frequently reveals that you were about to argue with something they never said.',
    prompt: 'Try saying: "Let me make sure I have this right — you are saying…"' },
  { title: 'Find the shared assumption',
    body: 'Two people arguing about immigration usually agree that laws should be applied consistently and that people should be treated humanely. Naming the shared end does not resolve anything, but it reframes the argument as one about means, which is a solvable kind of argument.',
    prompt: 'Try saying: "I think we both want ___. We disagree about how to get there."' },
  { title: 'Separate factual disputes from value disputes',
    body: '"Does this policy reduce crime" can be settled by evidence. "Is this tradeoff worth making" cannot. Treating the second as though it were the first is the most common way a conversation becomes personal.',
    prompt: 'Try asking: "Is this something we could look up, or is this about what we each prioritize?"' },
  { title: 'Look at a primary source together',
    body: 'Reading the bill text, the ruling, or the transcript jointly changes the dynamic from opposition to a shared task. It also settles more disputes than you would expect, often in a direction neither of you predicted.',
    prompt: 'Try saying: "Want to just pull up what it actually says?"' },
  { title: 'Know when it is over',
    body: 'A conversation ended well when both people can state the other position accurately, whether or not anyone moved. It ended badly when either person starts characterizing the other rather than the argument. Stopping at that point is a skill, not a retreat.',
    prompt: 'Try saying: "I do not think we are going to settle this, and I would rather keep talking to you than win it."' },
];

export default function ConversationGuidePage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="shell max-w-3xl py-14">
      <p className="eyebrow">Practical guide</p>
      <h1 className="mt-3 text-title">Having a difficult political conversation?</h1>
      <p className="mt-4 text-[1.05rem] leading-relaxed text-slate">
        Seven steps, in the order they usually help. The goal is not persuasion. It is understanding
        the disagreement precisely enough that both people know what they actually disagree about.
      </p>

      <ol className="mt-10 space-y-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              className="flex w-full items-center gap-4 p-5 text-left"
            >
              <span className="font-mono text-[0.7rem] text-civic-deep" aria-hidden>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="flex-1 font-display text-[1.1rem] text-ink">{s.title}</span>
              <span aria-hidden className="font-mono text-civic transition"
                    style={{ transform: open === i ? 'rotate(45deg)' : 'none' }}>+</span>
            </button>
            {open === i && (
              <div className="border-t border-parchment-edge px-5 pb-5 pt-4">
                <p className="leading-relaxed text-slate">{s.body}</p>
                <p className="mt-4 rounded-[3px] border-l-2 border-gold bg-gold-wash px-4 py-3 text-sm text-ink">
                  {s.prompt}
                </p>
              </div>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-10 max-w-prose text-sm leading-relaxed text-slate">
        None of this requires agreeing, conceding, or pretending a disagreement is smaller than it is.
        It requires treating a disagreement as a disagreement rather than an attack.
      </p>
    </div>
  );
}
