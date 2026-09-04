-- ============================================================
-- Directory inclusion criteria
--
-- The political figure directory needs a rule for who gets listed. That rule
-- has to be checkable by a stranger, because a directory on a nonpartisan
-- site is only credible if a reader can audit the entry criteria and get the
-- same answer the editors did.
--
-- So inclusion is defined STRUCTURALLY (is this person on the ballot, are
-- they unaffiliated with a major party) rather than IDEOLOGICALLY (are they
-- moderate, do they seem constructive). A directory filtered by ideology is
-- a slate, whatever it is called, and it would contradict the no-endorsement
-- commitment published at /editorial-standards.
--
-- Where a candidate's views matter to a reader, this schema stores the
-- candidate's OWN words with a link to where they said it, rather than an
-- editor's characterization of them.
-- ============================================================

-- Why this person appears in the directory. Every value is a matter of public
-- record that a reader can verify without trusting our judgment.
create type inclusion_basis as enum (
  'ballot_qualified',      -- certified on the ballot by a state election authority
  'filed_candidacy',       -- filed with the FEC or a state, not yet ballot-qualified
  'officeholder',          -- currently holds the office
  'party_organization'     -- official contact for a recognized party organization
);

alter table political_figures
  add column inclusion_basis inclusion_basis not null default 'filed_candidacy',
  -- The candidate's own stated positions, quoted or closely summarized, each
  -- with the source where they said it:
  --   [{"topic":"...", "statement":"...", "sourceUrl":"...", "retrieved":"2026-08-14"}]
  -- Editors record what a candidate says about themselves. Editors do not
  -- record what editors think of the candidate.
  add column stated_positions jsonb not null default '[]'::jsonb,
  -- Free-text note on how ballot access was confirmed, e.g. the specific
  -- Secretary of State certification page.
  add column verification_note text;

comment on column political_figures.inclusion_basis is
  'Objective, publicly checkable reason for inclusion. Never an ideological judgment.';
comment on column political_figures.stated_positions is
  'Candidate positions in the candidate''s own words, each with a source URL. Not editorial characterization.';

-- A listing must cite at least one source. Enforced in the database rather
-- than the form, so an unsourced record cannot be created by any client,
-- including a direct API call.
create or replace function require_source_on_active()
returns trigger language plpgsql as $$
begin
  if new.state = 'active'
     and (new.source_urls is null or jsonb_array_length(new.source_urls) = 0) then
    raise exception
      'A political figure cannot be set active without at least one source URL. '
      'Add a source, or leave the record in needs_verification.';
  end if;
  return new;
end;
$$;

create trigger pf_require_source
  before insert or update on political_figures
  for each row execute function require_source_on_active();

-- Publish the inclusion policy as data so the public directory can render the
-- same text the editors work from, rather than the two drifting apart.
insert into site_settings (key, value, description) values
  ('directory_policy', '{
     "heading": "Who appears in this directory",
     "criteria": [
       "Candidates for federal office who have filed with the FEC or a state election authority, and who are not nominees of the Democratic or Republican parties.",
       "Independent and third-party officeholders currently serving.",
       "Official contacts for state-recognized party organizations outside the two major parties."
     ],
     "exclusions": [
       "We do not filter this directory by ideology. A candidate is not included for being moderate, and not excluded for being far from the center.",
       "We do not rank, score, or rate candidates.",
       "Inclusion is not an endorsement, and the order of listings carries no meaning."
     ],
     "note": "Major-party nominees are not listed here because they are already covered exhaustively elsewhere. Each district page links to its sitting House member regardless of party."
   }'::jsonb,
   'Public inclusion policy for the political figure directory.')
on conflict (key) do nothing;
