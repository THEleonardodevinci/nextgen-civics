/** Shared domain types. Mirrors supabase/migrations/*.sql. */

export type UserRole = 'USER' | 'WRITER' | 'EDITOR' | 'ADMIN' | 'SUPER_ADMIN';
export type ArticleStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type AffiliationType = 'third_party' | 'independent' | 'other';
export type CandidateStatus =
  | 'current_officeholder'
  | 'declared_candidate'
  | 'independent_candidate'
  | 'third_party_candidate'
  | 'local_party_contact';
export type InclusionBasis =
  | 'ballot_qualified'
  | 'filed_candidacy'
  | 'officeholder'
  | 'party_organization';

export const INCLUSION_BASIS_LABEL: Record<InclusionBasis, string> = {
  ballot_qualified: 'Certified on the ballot',
  filed_candidacy: 'Filed candidacy',
  officeholder: 'Current officeholder',
  party_organization: 'Party organization contact',
};

export type StatedPosition = {
  topic: string;
  statement: string;
  sourceUrl: string;
  retrieved?: string;
};

export type RecordState = 'active' | 'inactive' | 'needs_verification';
export type SubmissionState = 'new' | 'reviewing' | 'resolved' | 'dismissed';

export const ROLE_RANK: Record<UserRole, number> = {
  USER: 0, WRITER: 1, EDITOR: 2, ADMIN: 3, SUPER_ADMIN: 4,
};

export interface Source { label: string; url: string }

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  is_suspended: boolean;
  created_at: string;
}

export interface Author {
  id: string;
  name: string;
  slug: string;
  role_title: string | null;
  bio: string | null;
  avatar_url: string | null;
  social_links: Record<string, string>;
  active: boolean;
}

export interface Tag { id: string; name: string; slug: string }
export interface Category { id: string; name: string; slug: string; description: string | null }

export interface Article {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  image_alt: string | null;
  author_id: string | null;
  category_id: string | null;
  status: ArticleStatus;
  is_opinion: boolean;
  featured: boolean;
  reading_time: number;
  view_count: number;
  sources: Source[];
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleWithRelations extends Article {
  author: Author | null;
  category: Category | null;
  tags: Tag[];
}

export interface District {
  district_code: string;
  state_code: string;
  state_name: string;
  district_number: string;
  population: number | null;
  voting_age_population: number | null;
  median_household_income: number | null;
  urban_rural: string | null;
  house_member: string | null;
  house_member_party: string | null;
  house_member_url: string | null;
  house_member_phone: string | null;
  house_member_office: string | null;
  recent_turnout_pct: number | null;
  notes: string | null;
  data_sources: Source[];
  last_updated: string | null;
}

export interface PoliticalFigure {
  id: string;
  name: string;
  slug: string;
  state_code: string;
  district_code: string | null;
  party: string | null;
  affiliation_type: AffiliationType;
  office: string | null;
  candidate_status: CandidateStatus;
  bio: string | null;
  image_url: string | null;
  website_url: string | null;
  campaign_url: string | null;
  email: string | null;
  phone: string | null;
  mailing_address: string | null;
  social_links: Record<string, string>;
  source_urls: Source[];
  inclusion_basis: InclusionBasis;
  stated_positions: StatedPosition[];
  verification_note: string | null;
  is_sample: boolean;
  state: RecordState;
  last_verified: string | null;
  updated_at: string;
}

export interface ResourceCategory {
  id: string; name: string; slug: string; description: string | null; sort_order: number;
}

export interface Resource {
  id: string;
  name: string;
  slug: string;
  description: string;
  url: string;
  logo_url: string | null;
  category_id: string | null;
  tags: string[];
  featured: boolean;
  sort_order: number;
  active: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role_title: string;
  bio: string;
  photo_url: string | null;
  email: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  social_links: Record<string, string>;
  display_order: number;
  active: boolean;
}

export interface AuditLog {
  id: number;
  actor_email: string | null;
  action: string;
  object_type: string | null;
  object_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface SearchHit {
  kind: 'article' | 'figure' | 'resource';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  meta: string;
}

export const CANDIDATE_STATUS_LABEL: Record<CandidateStatus, string> = {
  current_officeholder: 'Current officeholder',
  declared_candidate: 'Declared candidate',
  independent_candidate: 'Independent candidate',
  third_party_candidate: 'Third-party candidate',
  local_party_contact: 'Local party contact',
};

export const RECORD_STATE_LABEL: Record<RecordState, string> = {
  active: 'Active',
  inactive: 'Inactive',
  needs_verification: 'Needs verification',
};
