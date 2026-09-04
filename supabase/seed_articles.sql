-- =====================================================================
-- SEED ARTICLES
-- Six educational pieces so the site looks finished on first launch.
-- Claims here are qualitative and attributed to named published research;
-- no invented statistics. Edit freely in the admin article editor.
-- =====================================================================

with a1 as (
insert into articles (title, slug, subtitle, excerpt, content, status, featured, is_opinion,
  reading_time, published_at, author_id, category_id, sources)
select
 'Why Political Disagreement Feels So Personal',
 'why-political-disagreement-feels-so-personal',
 'Partisanship became an identity before it became a set of policy positions.',
 'When someone criticizes your political side, the reaction often feels less like being contradicted and more like being insulted. That is not a character flaw. It is how social identity works.',
$html$<p>Most people can argue about tax brackets without losing sleep. The same people can find a single sentence about their political party genuinely upsetting. The difference is not the stakes of the policy. It is that party has become an <strong>identity</strong>, and identities are defended differently than opinions.</p>
<h2>Identity runs on different rules than argument</h2>
<p>Social identity theory, developed by Henri Tajfel and John Turner in the 1970s, describes a well-replicated finding: people sort themselves into groups quickly, and once sorted, they treat criticism of the group as criticism of themselves. Tajfel's early experiments assigned participants to groups on the basis of nearly meaningless distinctions, and participants still favored their own side.</p>
<p>Political scientists Shanto Iyengar and Sean Westwood have documented that Americans now show measurable bias against members of the opposing party in contexts with nothing to do with politics, including hiring decisions and evaluations of scholarship applicants. The pattern is not confined to a single side of the aisle.</p>
<div class="callout"><strong>Worth separating:</strong> disagreeing with a policy, disliking a party, and disliking the people in it are three different things. Polarization research treats them as distinct measures for good reason.</div>
<h2>Why the feeling escalates</h2>
<p>Three things tend to compound:</p>
<ul>
<li><strong>Sorting.</strong> Party used to cut across region, religion, and profession. As those categories have aligned more tightly with party, an attack on the party lands on several parts of a person's self-concept at once.</li>
<li><strong>Negative partisanship.</strong> Political scientist Alan Abramowitz and others have argued that dislike of the other party now predicts voting behavior as strongly as affection for one's own. When identity is defined mostly in opposition, contact with the other side is threat by default.</li>
<li><strong>Visibility.</strong> Political argument used to happen in rooms. It now happens in feeds where the most extreme statement is the most visible one, which makes the other side look more extreme than it is.</li>
</ul>
<h2>What actually helps</h2>
<p>The research literature is more encouraging than the news cycle. Interventions that reduce hostility tend to share a shape: they make the other side concrete rather than abstract, and they lower the stakes of being wrong.</p>
<ol>
<li><strong>Ask for the reasoning, not the conclusion.</strong> Conclusions are identity markers. Reasoning is inspectable.</li>
<li><strong>Notice when you are arguing with a category.</strong> "Republicans think" and "Democrats want" are almost always describing the loudest few percent.</li>
<li><strong>Say what would change your mind.</strong> If nothing would, the disagreement is about values, not facts, and it is worth naming that out loud.</li>
</ol>
<p>None of this requires agreeing. It requires treating a disagreement as a disagreement rather than an attack, which is harder than it sounds and more possible than it feels.</p>$html$,
 'published', true, false, 6, now() - interval '3 days',
 (select id from authors where slug = 'staff-writer-one'),
 (select id from categories where slug = 'explainers'),
 '[{"label":"Tajfel & Turner, An Integrative Theory of Intergroup Conflict (1979)","url":"https://doi.org/10.1017/CBO9780511818752"},
   {"label":"Iyengar & Westwood, Fear and Loathing across Party Lines (2015)","url":"https://doi.org/10.1111/ajps.12152"}]'::jsonb
where not exists (select 1 from articles where slug = 'why-political-disagreement-feels-so-personal')
returning id
), a2 as (
insert into articles (title, slug, subtitle, excerpt, content, status, featured, is_opinion,
  reading_time, published_at, author_id, category_id, sources)
select
 'What Is Affective Polarization?',
 'what-is-affective-polarization',
 'The gap in what Americans feel about each other has grown faster than the gap in what they believe.',
 'Ideological polarization is about policy distance. Affective polarization is about dislike. Confusing the two makes the country look more divided on issues than it is, and less divided on trust than it is.',
$html$<p>When people say the country is polarized, they usually mean one of two very different things.</p>
<h2>Two measurements</h2>
<p><strong>Ideological polarization</strong> measures how far apart people are on policy: how much distance separates the average Democrat and the average Republican on taxes, immigration, or health care.</p>
<p><strong>Affective polarization</strong> measures something else entirely: how warmly or coldly partisans feel toward the other side, typically using a 0–100 "feeling thermometer" that survey researchers have asked in roughly the same form for decades.</p>
<p>These can move independently, and in the United States they have. Research using the American National Election Studies time series finds that thermometer ratings of the opposing party have declined substantially over recent decades, while ratings of one's own party have stayed comparatively stable. The divergence is driven more by growing dislike of the other side than by growing enthusiasm for one's own.</p>
<h2>Why the distinction matters</h2>
<p>If the problem were purely ideological, the fix would be persuasion or compromise on policy. If a substantial part of the problem is affective, then two people who agree on most policy can still refuse to cooperate, because the objection is to the label rather than the position.</p>
<div class="callout">A useful test: if you would accept a proposal from one politician and reject the identical proposal from another, the disagreement being expressed is affective, not ideological.</div>
<h2>The perception gap</h2>
<p>Douglas Ahler and Gaurav Sood have shown that Americans hold systematically inaccurate beliefs about who is in each party — overestimating the share of the opposing party belonging to distinctive demographic groups, sometimes dramatically. More in Common's research on what it calls the "perception gap" reports a similar pattern for policy views: partisans tend to imagine the other side holds more extreme positions than it reports holding.</p>
<p>This matters because the imagined opponent, not the actual one, is what people react to.</p>
<h2>What reduces it</h2>
<p>Studies testing corrective interventions generally find that giving people accurate information about what the other side actually believes reduces hostility somewhat, though effects vary and can fade. Structured contact — conversations with an agenda and ground rules rather than open debate — has been the more durable approach in field settings.</p>
<p>Neither result suggests that political disagreement should disappear. Substantive disagreement about how a country should be governed is the normal condition of a democracy. Contempt is the part that is optional.</p>$html$,
 'published', true, false, 5, now() - interval '9 days',
 (select id from authors where slug = 'staff-writer-two'),
 (select id from categories where slug = 'research'),
 '[{"label":"Iyengar, Sood & Lelkes, Affect, Not Ideology (2012)","url":"https://doi.org/10.1093/poq/nfs038"},
   {"label":"Ahler & Sood, The Parties in Our Heads (2018)","url":"https://doi.org/10.1086/697253"},
   {"label":"American National Election Studies","url":"https://electionstudies.org"}]'::jsonb
where not exists (select 1 from articles where slug = 'what-is-affective-polarization')
returning id
), a3 as (
insert into articles (title, slug, subtitle, excerpt, content, status, featured, is_opinion,
  reading_time, published_at, author_id, category_id, sources)
select
 'How to Read Political News Without Getting Trapped in an Echo Chamber',
 'reading-political-news-without-an-echo-chamber',
 'A practical routine for people who do not have time to read everything.',
 'You do not need to read outlets you dislike out of fairness. You need a routine that occasionally shows you where your picture of a story is incomplete.',
$html$<p>Advice about echo chambers usually amounts to "read the other side," which most people try once and abandon. Here is a version that survives contact with a normal schedule.</p>
<h2>Start with the artifact, not the coverage</h2>
<p>Most political stories are about a document: a bill, a ruling, a filing, a transcript, a jobs report. Coverage summarizes it. The summary is where framing enters. When a story matters to you, spend two minutes finding the underlying artifact — bill text on Congress.gov, an opinion on the court's own site, a release on the agency's site — and read the part everyone is quoting.</p>
<p>You will not do this for every story. Doing it occasionally recalibrates how much weight to give the summaries.</p>
<h2>Compare headlines, not full articles</h2>
<p>Reading three full articles about one event is a poor use of time. Reading three headlines about it is nearly free and often more revealing, because headline choice is where editorial judgment is most concentrated. Tools that array coverage across outlets make this a thirty-second exercise.</p>
<h2>Separate four things a story can contain</h2>
<ul>
<li><strong>Fact:</strong> what happened, verifiable independently.</li>
<li><strong>Selection:</strong> which facts were included, and which were left out.</li>
<li><strong>Framing:</strong> what the facts are said to mean.</li>
<li><strong>Opinion:</strong> what the author thinks should happen next.</li>
</ul>
<p>Outlets differ far more on the middle two than on the first. Two accurate reports can leave opposite impressions purely through selection.</p>
<h2>Watch for the quote with no context around it</h2>
<p>A quotation that arrives already cropped is the most common vector for misunderstanding. If a statement seems shockingly indefensible, the odds are good that a sentence before or after it changes the meaning. Look for the full transcript before reacting.</p>
<div class="callout"><strong>A small habit with outsized returns:</strong> before sharing something that made you angry, check the date. A meaningful share of viral political outrage concerns events from years earlier.</div>
<h2>Diversify by function, not just by side</h2>
<p>A left-leaning outlet and a right-leaning outlet covering the same daily political fight still give you one kind of information. Adding a wire service, a trade publication in the relevant industry, and a local outlet in the affected place gives you a different kind. Function matters as much as slant.</p>
<h2>Know when to stop</h2>
<p>Continuous political news consumption is not the same as being informed, and the research on media diet and hostility does not suggest that more exposure produces more accuracy. Depth on a few things you can act on tends to beat breadth on everything.</p>$html$,
 'published', false, false, 6, now() - interval '16 days',
 (select id from authors where slug = 'staff-writer-one'),
 (select id from categories where slug = 'media-literacy'),
 '[{"label":"Congress.gov","url":"https://www.congress.gov"}]'::jsonb
where not exists (select 1 from articles where slug = 'reading-political-news-without-an-echo-chamber')
returning id
), a4 as (
insert into articles (title, slug, subtitle, excerpt, content, status, featured, is_opinion,
  reading_time, published_at, author_id, category_id, sources)
select
 'How to Have a Productive Political Conversation',
 'how-to-have-a-productive-political-conversation',
 'Seven moves that keep a hard conversation from becoming a fight.',
 'Productive does not mean either person changes their mind. It means both people leave understanding the disagreement better than when they started.',
$html$<p>The goal of a good political conversation is usually misstated. It is not persuasion. It is clarity: knowing precisely where you disagree and why, which is worth more than either party pretending to be convinced.</p>
<h2>1. Find the actual disagreement</h2>
<p>Most political arguments are several arguments happening simultaneously — one about facts, one about priorities, one about who is to blame. Naming which one you are in prevents the conversation from sliding between them whenever someone loses ground.</p>
<h2>2. Restate the other position first</h2>
<p>Say the other person's argument back to them well enough that they agree it is accurate, before responding to it. If you cannot, you are not ready to respond. This one move does more work than any other, partly because it is disarming and partly because it frequently reveals that you were about to argue with something they did not say.</p>
<h2>3. Ask what evidence would change their mind — and answer it yourself</h2>
<p>If neither of you can name any, the disagreement is about values. That is a legitimate place to end up, and it is a much calmer place than an unresolvable argument about facts.</p>
<h2>4. Separate factual disputes from value disputes</h2>
<p>"Does this policy reduce crime" and "is this tradeoff worth making" are different questions. The first can be settled by evidence. The second cannot, and treating it as though it could is how conversations get personal.</p>
<h2>5. Look for the shared premise</h2>
<p>Two people who disagree about immigration policy usually agree that laws should be enforced consistently and that people should be treated humanely. Finding the shared premise does not resolve anything, but it establishes that the disagreement is about means.</p>
<h2>6. Go to a primary source together</h2>
<p>Looking something up jointly changes the dynamic from opposition to a shared task. It also settles surprisingly many disputes.</p>
<h2>7. Know when it is over</h2>
<p>A conversation has ended productively when both people can state the other's position accurately. It has ended unproductively when either person starts characterizing the other rather than the argument. Stopping at that point is a skill, not a retreat.</p>
<div class="callout"><strong>On relationships:</strong> if the conversation is with someone you care about, the relationship is the thing with long-term value. Very few political arguments are worth more than it, and the ones that feel that way in the moment rarely still feel that way a month later.</div>$html$,
 'published', false, false, 5, now() - interval '23 days',
 (select id from authors where slug = 'staff-writer-two'),
 (select id from categories where slug = 'practice'),
 '[{"label":"Living Room Conversations — conversation guides","url":"https://livingroomconversations.org"}]'::jsonb
where not exists (select 1 from articles where slug = 'how-to-have-a-productive-political-conversation')
returning id
), a5 as (
insert into articles (title, slug, subtitle, excerpt, content, status, featured, is_opinion,
  reading_time, published_at, author_id, category_id, sources)
select
 'Why We Misunderstand What the Other Side Actually Believes',
 'why-we-misunderstand-the-other-side',
 'The perception gap is measurable, and it is wider among the most politically engaged.',
 'Americans consistently misjudge both who belongs to the opposing party and what that party believes. The direction of the error is predictable: we imagine them more extreme than they are.',
$html$<p>Ask a partisan to estimate what share of the other party holds some extreme position, and the estimate will usually exceed the real figure. This is one of the more robust findings in recent polarization research, and its implications are uncomfortable for anyone who considers themselves well-informed.</p>
<h2>Two kinds of error</h2>
<p><strong>Who they are.</strong> Ahler and Sood asked Americans to estimate the demographic composition of each party. Respondents substantially overestimated the share of each party belonging to its stereotypical constituencies. Both parties made the error, and both made it about themselves as well as the other side.</p>
<p><strong>What they think.</strong> Survey work by More in Common on the perception gap finds a similar pattern for policy: partisans overestimate how many people on the other side hold extreme positions.</p>
<h2>The engagement paradox</h2>
<p>The intuitive expectation is that people who follow politics closely would be more accurate. Several studies find the opposite association: heavier consumption of partisan political media and higher political engagement are associated with <em>larger</em> perception gaps, not smaller ones. One plausible explanation is that political media covers conflict, and conflict is generated by the least representative members of each coalition.</p>
<div class="callout"><strong>A way to check yourself:</strong> when you picture a typical member of the other party, are you picturing a voter, or a pundit? The second group is not a sample of the first.</div>
<h2>Why the error is self-sustaining</h2>
<ul>
<li><strong>Algorithmic selection.</strong> The most engaging content about the other side is the most outrageous example of it, and engagement is what gets distributed.</li>
<li><strong>Sorting.</strong> As people cluster geographically and socially, direct contact with ordinary members of the other party declines, leaving media as the main source of information about them.</li>
<li><strong>Identity protection.</strong> Believing the other side is unreasonable justifies not engaging with it, which prevents the belief from being corrected.</li>
</ul>
<h2>What to do with this</h2>
<p>The practical takeaway is not that both sides are secretly the same, or that real disagreements are illusions. They are not. It is narrower: the specific person you are talking to is more likely to be near their party's middle than at its edge, and starting a conversation with the edge in mind guarantees you will be arguing with someone who is not there.</p>$html$,
 'published', false, false, 5, now() - interval '31 days',
 (select id from authors where slug = 'staff-writer-two'),
 (select id from categories where slug = 'research'),
 '[{"label":"Ahler & Sood, The Parties in Our Heads (2018)","url":"https://doi.org/10.1086/697253"},
   {"label":"More in Common — The Perception Gap","url":"https://perceptiongap.us"}]'::jsonb
where not exists (select 1 from articles where slug = 'why-we-misunderstand-the-other-side')
returning id
), a6 as (
insert into articles (title, slug, subtitle, excerpt, content, status, featured, is_opinion,
  reading_time, published_at, author_id, category_id, sources)
select
 'Local Politics Is Where Participation Still Scales',
 'local-politics-is-where-participation-scales',
 'An argument for spending civic attention closer to home.',
 'National politics absorbs most political attention and returns the least individual influence. The imbalance is worth reconsidering.',
$html$<p><em>This piece is labeled Opinion. It argues a position rather than summarizing evidence, and it reflects the author rather than the organization.</em></p>
<p>Political attention in the United States is distributed almost exactly backwards from where individual participation matters most. Presidential races command overwhelming interest. School board, county board, and municipal races — where a few hundred votes routinely decide outcomes and where decisions about zoning, policing, and school policy are actually made — often draw a fraction of that turnout.</p>
<h2>The arithmetic</h2>
<p>An individual vote in a national election is, in strictly instrumental terms, close to weightless. An individual vote in a low-turnout municipal race is not. Neither is showing up to a public comment period, where the number of people who attend is frequently in the single digits. The gap between those two facts is the largest unexploited opportunity in American civic life.</p>
<h2>The polarization angle</h2>
<p>Local politics also tends to be less polarizing, for a structural reason: the questions are more concrete. Whether a stop sign belongs at an intersection is not an identity question. National politics is largely conducted through symbols, and symbols are what identity attaches to.</p>
<p>That does not make local government pleasant or unanimous. It makes disagreement about it more tractable, because the disagreeing parties will see each other again and share an interest in the outcome.</p>
<div class="callout"><strong>Concretely:</strong> find your municipality's meeting calendar, read one agenda packet before a meeting, and attend once. The agenda packet is usually a public PDF and usually more informative than any coverage of it.</div>
<h2>The objection</h2>
<p>The obvious counterargument is that national policy determines more — that federal decisions on taxation, health care, and foreign policy dwarf anything a county board decides. That is true. It is also true that your marginal influence on those decisions is very small and your marginal influence locally is not, and that the skills built participating locally transfer upward.</p>
<p>Attention is finite. Spending a larger share of it where it converts into outcomes is not a retreat from national politics. It is a better use of the same civic energy.</p>$html$,
 'published', false, true, 4, now() - interval '40 days',
 (select id from authors where slug = 'staff-writer-one'),
 (select id from categories where slug = 'opinion'),
 '[]'::jsonb
where not exists (select 1 from articles where slug = 'local-politics-is-where-participation-scales')
returning id
)
select 1;

-- ---------- attach tags ----------
insert into article_tags (article_id, tag_id)
select a.id, t.id
from (values
  ('why-political-disagreement-feels-so-personal', 'polarization'),
  ('why-political-disagreement-feels-so-personal', 'political-psychology'),
  ('why-political-disagreement-feels-so-personal', 'explainers'),
  ('what-is-affective-polarization', 'polarization'),
  ('what-is-affective-polarization', 'research'),
  ('what-is-affective-polarization', 'political-psychology'),
  ('reading-political-news-without-an-echo-chamber', 'media-literacy'),
  ('reading-political-news-without-an-echo-chamber', 'explainers'),
  ('how-to-have-a-productive-political-conversation', 'civic-engagement'),
  ('how-to-have-a-productive-political-conversation', 'community'),
  ('how-to-have-a-productive-political-conversation', 'political-psychology'),
  ('why-we-misunderstand-the-other-side', 'research'),
  ('why-we-misunderstand-the-other-side', 'polarization'),
  ('why-we-misunderstand-the-other-side', 'data'),
  ('local-politics-is-where-participation-scales', 'civic-engagement'),
  ('local-politics-is-where-participation-scales', 'opinion'),
  ('local-politics-is-where-participation-scales', 'elections')
) as x(article_slug, tag_slug)
join articles a on a.slug = x.article_slug
join tags t on t.slug = x.tag_slug
on conflict do nothing;
