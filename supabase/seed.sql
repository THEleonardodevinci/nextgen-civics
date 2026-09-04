-- =====================================================================
-- SEED DATA (development / first launch)
-- Safe to re-run: every insert is idempotent on a natural key.
-- Political figure rows are marked is_sample = true and render a
-- "SAMPLE DATA" badge. Replace them with verified records before launch.
-- =====================================================================

-- ---------- article categories ----------
insert into categories (name, slug, description, sort_order) values
  ('Explainers',        'explainers',        'Plain-language introductions to core concepts.', 1),
  ('Research',          'research',          'Summaries of published academic work.', 2),
  ('Practice',          'practice',          'How-to material for conversations and civic life.', 3),
  ('Media Literacy',    'media-literacy',    'Reading, sourcing, and evaluating news.', 4),
  ('Opinion',           'opinion',           'Clearly labeled argument from a named author.', 5)
on conflict (slug) do nothing;

-- ---------- tags ----------
insert into tags (name, slug) values
  ('Polarization', 'polarization'),
  ('Elections', 'elections'),
  ('Media Literacy', 'media-literacy'),
  ('Political Psychology', 'political-psychology'),
  ('Civic Engagement', 'civic-engagement'),
  ('Research', 'research'),
  ('Opinion', 'opinion'),
  ('Explainers', 'explainers'),
  ('Data', 'data'),
  ('Community', 'community')
on conflict (slug) do nothing;

-- ---------- authors ----------
insert into authors (name, slug, role_title, bio, avatar_url, social_links) values
  ('[AUTHOR NAME]', 'staff-writer-one', 'Contributing Writer',
   '[Short author biography. Replace this placeholder with a real biography before publishing.]',
   null, '{}'::jsonb),
  ('[AUTHOR NAME]', 'staff-writer-two', 'Research Editor',
   '[Short author biography. Replace this placeholder with a real biography before publishing.]',
   null, '{}'::jsonb)
on conflict (slug) do nothing;

-- ---------- team members (About Us carousel) ----------
insert into team_members (name, role_title, bio, photo_url, email, website_url, linkedin_url, display_order, active) values
  ('[TEAM MEMBER]', '[Role or title]',
   '[Two to four sentences about this person: what they work on here, relevant background, and why they care about the mission. Replace before launch.]',
   null, null, null, null, 1, true),
  ('[TEAM MEMBER]', '[Role or title]',
   '[Two to four sentences about this person. Replace before launch.]',
   null, null, null, null, 2, true),
  ('[TEAM MEMBER]', '[Role or title]',
   '[Two to four sentences about this person. Replace before launch.]',
   null, null, null, null, 3, true),
  ('[TEAM MEMBER]', '[Role or title]',
   '[Two to four sentences about this person. Replace before launch.]',
   null, null, null, null, 4, true),
  ('[TEAM MEMBER]', '[Role or title]',
   '[Two to four sentences about this person. Replace before launch.]',
   null, null, null, null, 5, true)
on conflict do nothing;

-- ---------- resource categories ----------
insert into resource_categories (name, slug, description, sort_order) values
  ('Media & News Literacy', 'media-news-literacy', 'Tools for comparing coverage and evaluating sources.', 1),
  ('Polling & Election Information', 'polling-elections', 'Ballot, candidate, and election administration information.', 2),
  ('Data & Research', 'data-research', 'Survey data, public statistics, and academic research.', 3),
  ('Depolarization & Civic Dialogue', 'depolarization-dialogue', 'Organizations working on constructive political conversation.', 4),
  ('Government Information', 'government', 'Primary sources from federal and state government.', 5)
on conflict (slug) do nothing;

-- ---------- resources ----------
-- Listing a resource is not an endorsement of its methodology or conclusions.
insert into resources (name, slug, description, url, category_id, featured, sort_order, tags)
select v.name, v.slug, v.description, v.url, c.id, v.featured, v.sort_order, v.tags
from (values
  ('AllSides', 'allsides',
   'Presents the same news story as covered by outlets it rates as left, center, and right, alongside a published media bias chart.',
   'https://www.allsides.com', 'media-news-literacy', true, 1, array['bias','news']),
  ('Ad Fontes Media', 'ad-fontes-media',
   'Publishes a media bias and reliability chart based on its own analyst rating methodology.',
   'https://adfontesmedia.com', 'media-news-literacy', true, 2, array['bias','news']),
  ('Ground News', 'ground-news',
   'Aggregates coverage of a story across outlets and shows the distribution of sources reporting it.',
   'https://ground.news', 'media-news-literacy', false, 3, array['news','aggregator']),
  ('News Literacy Project', 'news-literacy-project',
   'Free lessons and tools for evaluating news sources, aimed at students, educators, and the general public.',
   'https://newslit.org', 'media-news-literacy', false, 4, array['education']),

  ('Ballotpedia', 'ballotpedia',
   'Encyclopedia of American politics with ballot, candidate, and election coverage down to the local level.',
   'https://ballotpedia.org', 'polling-elections', true, 1, array['candidates','ballot']),
  ('RealClearPolitics', 'realclearpolitics',
   'Aggregates public polling and publishes polling averages for national and state races.',
   'https://www.realclearpolitics.com', 'polling-elections', false, 2, array['polling']),
  ('Federal Election Commission', 'fec',
   'Official campaign finance filings, candidate registrations, and disclosure data for federal races.',
   'https://www.fec.gov', 'polling-elections', false, 3, array['finance','official']),
  ('Vote.org', 'vote-org',
   'Registration status checks, deadline lookups, and absentee ballot information by state.',
   'https://www.vote.org', 'polling-elections', false, 4, array['voting']),
  ('National Association of Secretaries of State', 'nass-can-i-vote', 
   'Directory linking to each state''s official election authority and voter registration system.',
   'https://www.nass.org/can-I-vote', 'polling-elections', false, 5, array['official','states']),

  ('Pew Research Center', 'pew-research-center',
   'Nonpartisan survey research on American political attitudes, media habits, and partisan divides.',
   'https://www.pewresearch.org', 'data-research', true, 1, array['survey','research']),
  ('U.S. Census Bureau', 'census-bureau',
   'Official population, income, and demographic data, including the district-level tables used on this site.',
   'https://www.census.gov', 'data-research', false, 2, array['official','data']),
  ('American National Election Studies', 'anes',
   'Long-running academic survey series on voting, public opinion, and political participation.',
   'https://electionstudies.org', 'data-research', false, 3, array['survey','academic']),
  ('Gallup', 'gallup',
   'Public opinion polling with long time series on trust in institutions and party identification.',
   'https://news.gallup.com', 'data-research', false, 4, array['polling']),

  ('Braver Angels', 'braver-angels',
   'Volunteer organization that runs structured workshops bringing people of differing political views into direct conversation.',
   'https://braverangels.org', 'depolarization-dialogue', true, 1, array['dialogue']),
  ('More in Common', 'more-in-common',
   'Research organization studying polarization, group perception, and what people across divides actually share.',
   'https://www.moreincommon.com', 'depolarization-dialogue', false, 2, array['research','dialogue']),
  ('Living Room Conversations', 'living-room-conversations',
   'Free, structured conversation guides designed for small groups discussing difficult topics.',
   'https://livingroomconversations.org', 'depolarization-dialogue', false, 3, array['dialogue','guides']),

  ('Congress.gov', 'congress-gov',
   'Official source for federal legislation, bill text, roll call votes, and member records.',
   'https://www.congress.gov', 'government', true, 1, array['official','legislation']),
  ('U.S. House of Representatives', 'house-gov',
   'Directory of current House members, committee assignments, and district contact information.',
   'https://www.house.gov', 'government', false, 2, array['official']),
  ('U.S. Senate', 'senate-gov',
   'Directory of current senators, committee membership, and legislative activity.',
   'https://www.senate.gov', 'government', false, 3, array['official']),
  ('USA.gov', 'usa-gov',
   'Federal government front door for agency contacts, benefits, and public services.',
   'https://www.usa.gov', 'government', false, 4, array['official'])
) as v(name, slug, description, url, cat_slug, featured, sort_order, tags)
join resource_categories c on c.slug = v.cat_slug
on conflict (slug) do nothing;

-- ---------- districts ----------
-- Districts are seeded from real data in seed_districts.sql, which contains
-- all 435 voting districts and their sitting House members. Run that file
-- before this one; the ZIP crosswalk below has a foreign key onto it.

-- ZIP -> district crosswalk.
-- Deliberately EMPTY. An accurate crosswalk cannot be typed by hand: a single
-- ZIP often spans several districts, and getting it wrong sends people to the
-- wrong representative. Populate it from the HUD USPS crosswalk:
--     HUD_API_TOKEN=... npm run data:fetch -- --zip
-- Free token: https://www.huduser.gov/portal/dataset/uspszip-api.html
-- Until then ZIP search returns no results; state and district search work.

-- ---------- sample political figures ----------
-- THREE PLACEHOLDER RECORDS. These are not real people. The names are
-- obviously fake, every row carries is_sample = true so the public UI renders
-- a SAMPLE DATA badge, and each is left in needs_verification.
--
-- They exist to demonstrate the shape of a good entry: an objective inclusion
-- basis, positions in the candidate's own words with a source link, and a
-- verification note recording exactly how ballot access was confirmed.
--
-- Note what is NOT here: no rating, no score, no "moderate" or "constructive"
-- tag, no editorial characterization of anyone's views. Real entries follow
-- the same pattern. Delete these before launch:
--   delete from political_figures where is_sample = true;
insert into political_figures
  (name, slug, state_code, district_code, party, affiliation_type, office,
   candidate_status, inclusion_basis, bio, stated_positions, verification_note,
   is_sample, state, last_verified, source_urls)
values
  ('[SAMPLE] Example Candidate A', 'sample-candidate-a', 'IL', 'IL-05',
   'Example Party', 'third_party', 'U.S. House', 'third_party_candidate',
   'ballot_qualified',
   'Placeholder record. A real biography states what the candidate has done — prior offices, occupation, where they live — and stops there. It does not evaluate them.',
   $json$[{"topic":"Example topic","statement":"Placeholder for a position stated in the candidate's own words, quoted from their platform or a public statement.","sourceUrl":"https://example.org/platform","retrieved":"2026-08-14"}]$json$::jsonb,
   'Placeholder. A real note names the specific certification, e.g. "Confirmed against the Illinois State Board of Elections certified candidate list, retrieved 2026-08-14."',
   true, 'needs_verification', null,
   $json$[{"label":"Replace with a verified source URL","url":"https://www.fec.gov"}]$json$::jsonb),

  ('[SAMPLE] Example Candidate B', 'sample-candidate-b', 'IL', 'IL-05',
   'Unaffiliated', 'independent', 'U.S. House', 'independent_candidate',
   'filed_candidacy',
   'Placeholder record for an independent who has filed but is not yet ballot-qualified. The inclusion basis records that distinction rather than blurring it.',
   $json$[]$json$::jsonb,
   'Placeholder. FEC filing confirmed; ballot access not yet certified.',
   true, 'needs_verification', null,
   $json$[{"label":"Replace with a verified source URL","url":"https://www.fec.gov"}]$json$::jsonb),

  ('[SAMPLE] Example Local Contact', 'sample-local-contact', 'AK', 'AK-AL',
   'Example Party', 'third_party', 'State party contact', 'local_party_contact',
   'party_organization',
   'Placeholder record for a party organization contact rather than a candidate.',
   $json$[]$json$::jsonb,
   'Placeholder. A real note cites the state recognition record for the party.',
   true, 'needs_verification', null,
   $json$[{"label":"Replace with a verified source URL","url":"https://www.fec.gov"}]$json$::jsonb)
on conflict (district_code, slug) do nothing;

-- ---------- site settings ----------
insert into site_settings (key, value, description) values
  ('organization', '{
     "name": "[ORGANIZATION NAME]",
     "tagline": "Disagreement doesn''t have to mean division.",
     "description": "[MISSION STATEMENT — one or two sentences describing what the organization does and who it serves.]",
     "contactEmail": "[CONTACT EMAIL]",
     "foundedNote": ""
   }'::jsonb, 'Organization identity used in the header, footer, and metadata.'),
  ('verification_window_days', '180'::jsonb,
   'Political figure records older than this many days appear under "Needs verification" in the admin dashboard.'),
  ('statistics', '[
     {"value":"[--]","title":"[Statistic title]","description":"[What this number measures.]",
      "source":"[Source name]","sourceUrl":"","year":"[Year]"},
     {"value":"[--]","title":"[Statistic title]","description":"[What this number measures.]",
      "source":"[Source name]","sourceUrl":"","year":"[Year]"},
     {"value":"[--]","title":"[Statistic title]","description":"[What this number measures.]",
      "source":"[Source name]","sourceUrl":"","year":"[Year]"}
   ]'::jsonb, 'Homepage statistic cards. Every entry requires a real source before publication.')
on conflict (key) do nothing;
