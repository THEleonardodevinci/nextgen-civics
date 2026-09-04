/**
 * ============================================================
 * EDIT SITE COPY HERE.
 * ============================================================
 * Everything a non-developer is likely to want changed lives in this file
 * or in the `site_settings` table (Admin → Settings). Components read from
 * here rather than hardcoding strings, so copy edits never touch layout code.
 *
 * Placeholders in [BRACKETS] are intentional. Replace them before launch.
 */

/**
 * Absolute base URL for canonical tags, Open Graph, and the sitemap.
 *
 * `??` only catches undefined, so an environment variable that is DEFINED BUT
 * EMPTY slipped through and produced `new URL('')`, which throws
 * ERR_INVALID_URL and fails the production build. Vercel inlines an unset or
 * blank NEXT_PUBLIC_* var as an empty string, so that case is normal, not
 * exotic. This trims, validates, and falls back rather than trusting the value.
 */
function siteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    // Vercel sets this automatically on every deployment, so a forgotten
    // NEXT_PUBLIC_SITE_URL degrades to the correct deployment URL instead of
    // breaking the build.
    process.env.NEXT_PUBLIC_VERCEL_URL && `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  ];

  for (const raw of candidates) {
    const value = (raw ?? '').trim().replace(/\/+$/, '');
    if (!value) continue;
    // Accept a bare host and normalise it, rather than failing on it.
    const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
      return new URL(withScheme).origin;
    } catch {
      // Fall through to the next candidate.
    }
  }

  return 'http://localhost:3000';
}

export const org = {
  name: 'NextGen Civics',
  shortName: 'NGS',
  tagline: "Disagreement doesn't have to mean division.",
  description:
    '[MISSION STATEMENT — one or two sentences describing what the organization does and who it serves.]',
  contactEmail: '[CONTACT EMAIL]',
  url: siteUrl(),
  social: {
    // Leave blank to hide the icon.
    x: '',
    linkedin: '',
    bluesky: '',
  },
} as const;

export const nonpartisanDisclaimer =
  'This organization is nonpartisan and does not endorse political candidates or political parties. Candidate, organization, and resource listings are provided for informational purposes.';

export const listingDisclaimer =
  'Candidate and representative listings are provided for informational purposes and do not constitute endorsements.';

export const hero = {
  eyebrow: 'A nonpartisan civic project',
  headline: "Disagreement doesn't have to mean division.",
  body:
    'Americans disagree about how the country should be governed. That is normal, and it is not the problem. The problem is how much we have come to dislike, distrust, and misunderstand each other in the process. We publish plain explanations of how that happened, practical tools for talking across it, and neutral information about the political options on your ballot.',
  primaryCta: { label: 'Explore the mission', href: '#polarization' },
  secondaryCta: { label: 'Find your district', href: '/districts' },
};

export const missionIntro = {
  eyebrow: 'Our mission',
  heading: 'Better arguments, not fewer of them.',
  paragraphs: [
    'We are not trying to move anyone toward a party, and we are not trying to talk anyone out of their convictions. A healthy democracy needs people who disagree strongly and can still make decisions together.',
    'What we work on is narrower: making political information easier to find, explaining what research actually says about polarization, and giving people usable ways to have conversations that do not end in contempt.',
  ],
};

/** Concepts explained in "What is political polarization?". */
export const polarizationConcepts = [
  {
    id: 'ideological',
    term: 'Ideological polarization',
    short: 'The distance between what each side wants from policy.',
    detail:
      'This measures how far apart the average member of each party sits on questions like taxation, immigration, or health care. It is the kind of polarization most people picture, and it is not the kind that has grown fastest.',
  },
  {
    id: 'affective',
    term: 'Affective polarization',
    short: 'How warmly or coldly partisans feel toward the other side.',
    detail:
      'Survey researchers measure this with "feeling thermometer" ratings. Work by Iyengar, Sood, and Lelkes found that hostility toward the opposing party has risen faster than policy disagreement, meaning people dislike each other more than their stated positions would predict.',
  },
  {
    id: 'sorting',
    term: 'Political sorting',
    short: 'Party lining up with everything else about a person.',
    detail:
      'Party once cut across geography, religion, and profession. As those identities have aligned with party, disagreeing about politics increasingly means disagreeing about who someone is, which raises the emotional stakes of any given argument.',
  },
  {
    id: 'identity',
    term: 'Partisan identity',
    short: 'Party as group membership rather than policy preference.',
    detail:
      'When party functions as an identity, people defend it the way they defend any group they belong to. Social identity research going back to Tajfel and Turner shows that group loyalty forms readily, even on arbitrary distinctions.',
  },
  {
    id: 'negative',
    term: 'Negative partisanship',
    short: 'Voting against rather than for.',
    detail:
      'A growing share of partisans are motivated more by opposition to the other party than by enthusiasm for their own. This makes coalitions durable and compromise expensive, because cooperating with the other side reads as disloyalty.',
  },
  {
    id: 'echo',
    term: 'Echo chambers',
    short: 'Information environments that mostly confirm.',
    detail:
      'The strongest version of the echo chamber claim is contested in the research literature — most people encounter some cross-cutting content. The better-supported concern is what that content looks like: often the least representative examples of the other side.',
  },
  {
    id: 'misinformation',
    term: 'Misinformation',
    short: 'False claims that spread because they fit.',
    detail:
      'Misinformation spreads most readily when it confirms something a group already believes about an opponent. Correction works better before exposure than after, which is why source habits matter more than fact-checks.',
  },
  {
    id: 'fragmentation',
    term: 'Media fragmentation',
    short: 'No shared set of facts to argue over.',
    detail:
      'When audiences split across many outlets with different editorial judgments about what is newsworthy, disagreements increasingly start from different premises about what happened, not just different views about what it means.',
  },
] as const;

/** "Why depolarization matters" cards. */
export const consequences = [
  { title: 'Declining trust', body: 'Trust in institutions and in fellow citizens tends to fall together, and rebuilding it is slower than losing it.' },
  { title: 'Political hostility', body: 'Partisan animosity now shows up in decisions with nothing to do with policy, including hiring and social contact.' },
  { title: 'Less willingness to compromise', body: 'When cooperation with the other side reads as betrayal, negotiated solutions become costly for the people best positioned to reach them.' },
  { title: 'Distorted perceptions', body: 'Partisans consistently overestimate how extreme the other side is, then respond to the exaggerated version.' },
  { title: 'Strained relationships', body: 'Families and friendships absorb political conflict that used to stay outside them.' },
  { title: 'Vulnerability to misinformation', body: 'Claims that confirm what a group already believes about opponents face the least scrutiny.' },
] as const;

/** "What can people do?" action cards. */
export const actions = [
  { title: 'Listen before responding', body: 'Restate the other position accurately before answering it. If you cannot, you are not yet responding to what they said.' },
  { title: 'Check the original source', body: 'Most political stories are about a document. Reading the paragraph everyone is quoting takes two minutes and changes surprisingly often what the story looks like.' },
  { title: 'Understand the other argument', body: 'Learn the strongest version of the position you disagree with, not the version that is easiest to dismiss.' },
  { title: 'Separate people from labels', body: 'The person in front of you is more likely near their party\u2019s middle than at its edge. Arguing with the edge guarantees you are arguing with someone who is not there.' },
  { title: 'Diversify your sources', body: 'Add sources that differ in function, not just in slant: a wire service, a local outlet, a trade publication in the affected industry.' },
  { title: 'Look for shared values', body: 'Most policy disagreements are about means. Naming the shared end does not settle it, but it changes what the argument is about.' },
  { title: 'Challenge your own side too', body: 'Scrutiny applied only outward is not scrutiny. The claims most likely to slip past you are the ones you want to be true.' },
  { title: 'Participate locally', body: 'Local races and public comment periods are where individual participation still moves outcomes, and where disagreement stays concrete.' },
] as const;

export const pillars = [
  { key: 'educate', title: 'Educate', body: 'Explain what research actually says about polarization and political psychology, in language that does not require a background in either.' },
  { key: 'connect', title: 'Connect', body: 'Help people encounter perspectives outside their usual information environment, presented in the terms their holders would recognize.' },
  { key: 'inform', title: 'Inform', body: 'Provide neutral, sourced information about districts, representatives, and the political options that are hard to find.' },
  { key: 'empower', title: 'Empower', body: 'Make participation practical: where to look, what to read first, and how to have the conversation.' },
] as const;

export const quickLinks = [
  { title: 'Find your congressional district', href: '/districts', body: 'An interactive map of all 435 districts, plus a ZIP code lookup.' },
  { title: 'Browse third-party and independent figures', href: '/districts', body: 'Neutral listings of candidates and officeholders outside the two major parties.' },
  { title: 'Read the latest articles', href: '/articles', body: 'Explainers, research summaries, and practical guides.' },
  { title: 'Explore resources', href: '/resources', body: 'Vetted tools for media literacy, election information, and research.' },
  { title: 'Learn about polarization', href: '/#polarization', body: 'Start with the vocabulary: affective polarization, sorting, negative partisanship.' },
] as const;

/**
 * "Explore perspectives" — several neutrally written summaries of arguments
 * on one policy question. These are summaries of positions people hold, not
 * positions this organization holds. Add topics by appending to this array.
 */
export const perspectiveTopics = [
  {
    id: 'housing',
    topic: 'Housing costs',
    question: 'Why are homes expensive, and what should change?',
    perspectives: [
      {
        label: 'Supply constraints',
        summary:
          'Prices are high primarily because too few homes are built where people want to live. Zoning rules, parking minimums, and lengthy approval processes limit construction. The remedy is to make building easier and let supply meet demand.',
      },
      {
        label: 'Financialization',
        summary:
          'Housing has increasingly been treated as an investment vehicle rather than shelter. Institutional purchasing and short-term rental conversion reduce the stock available to residents. The remedy involves limits on speculative ownership and direct public provision.',
      },
      {
        label: 'Local control',
        summary:
          'Communities have a legitimate interest in how they develop, and residents who invested in a neighborhood should have a say in changes to it. The remedy is to address costs without overriding local decision-making from a state or federal level.',
      },
    ],
  },
] as const;

export const footerNav = {
  Organization: [
    { label: 'Our mission', href: '/' },
    { label: 'About us', href: '/#about' },
    { label: 'Contact', href: '/contact' },
  ],
  Explore: [
    { label: 'District map', href: '/districts' },
    { label: 'Articles', href: '/articles' },
    { label: 'Resources', href: '/resources' },
    { label: 'Conversation guide', href: '/conversation-guide' },
  ],
  Account: [
    { label: 'Sign in', href: '/login' },
    { label: 'Create account', href: '/signup' },
    { label: 'Saved content', href: '/account' },
  ],
  Legal: [
    { label: 'Privacy policy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Accessibility', href: '/accessibility' },
    { label: 'Editorial standards', href: '/editorial-standards' },
    { label: 'Corrections', href: '/corrections' },
  ],
} as const;

export const mainNav = [
  { label: 'Our mission', href: '/' },
  { label: 'Districts', href: '/districts' },
  { label: 'Candidates', href: '/candidates' },
  { label: 'Articles', href: '/articles' },
  { label: 'Resources', href: '/resources' },
] as const;

/** Fallback statistics. Real values belong in site_settings.statistics. */
export const fallbackStatistics = [
  {
    value: '[--]',
    title: '[Statistic title]',
    description: '[What this number measures and over what period.]',
    source: '[Source name]',
    sourceUrl: '',
    year: '[Year]',
  },
] as const;
