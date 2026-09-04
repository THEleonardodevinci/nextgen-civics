import { z } from 'zod';

/** Allow only http(s) URLs. Blocks javascript:, data:, and relative tricks. */
export const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), 'URL must start with http:// or https://');

export const sourceSchema = z.object({ label: z.string().min(1).max(200), url: httpUrl });

export const articleInput = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by hyphens.'),
  subtitle: z.string().max(300).optional().nullable(),
  excerpt: z.string().max(600).optional().nullable(),
  content: z.string().default(''),
  featured_image: httpUrl.optional().nullable(),
  image_alt: z.string().max(300).optional().nullable(),
  author_id: z.string().uuid().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']),
  is_opinion: z.boolean().default(false),
  featured: z.boolean().default(false),
  published_at: z.string().datetime().optional().nullable(),
  sources: z.array(sourceSchema).default([]),
  seo_title: z.string().max(70).optional().nullable(),
  seo_description: z.string().max(200).optional().nullable(),
  tagIds: z.array(z.string().uuid()).default([]),
});

export const statedPosition = z.object({
  topic: z.string().min(1).max(120),
  statement: z.string().min(1).max(2000),
  sourceUrl: httpUrl,
  retrieved: z.string().optional(),
});

export const figureInput = z.object({
  inclusion_basis: z.enum(['ballot_qualified', 'filed_candidacy', 'officeholder', 'party_organization'])
    .default('filed_candidacy'),
  stated_positions: z.array(statedPosition).max(25).default([]),
  verification_note: z.string().max(1000).nullable().optional(),
  name: z.string().min(2).max(160),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  state_code: z.string().length(2).toUpperCase(),
  district_code: z.string().regex(/^[A-Z]{2}-(\d{2}|AL)$/).optional().nullable(),
  party: z.string().max(120).optional().nullable(),
  affiliation_type: z.enum(['third_party', 'independent', 'other']),
  office: z.string().max(160).optional().nullable(),
  candidate_status: z.enum([
    'current_officeholder', 'declared_candidate', 'independent_candidate',
    'third_party_candidate', 'local_party_contact',
  ]),
  bio: z.string().max(2000).optional().nullable(),
  image_url: httpUrl.optional().nullable(),
  website_url: httpUrl.optional().nullable(),
  campaign_url: httpUrl.optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  mailing_address: z.string().max(400).optional().nullable(),
  social_links: z.record(httpUrl).default({}),
  source_urls: z.array(sourceSchema).default([]),
  is_sample: z.boolean().default(false),
  state: z.enum(['active', 'inactive', 'needs_verification']),
  last_verified: z.string().date().optional().nullable(),
});

export const resourceInput = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().min(10).max(600),
  url: httpUrl,
  logo_url: httpUrl.optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(40)).default([]),
  featured: z.boolean().default(false),
  sort_order: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const teamMemberInput = z.object({
  name: z.string().min(2).max(160),
  role_title: z.string().min(2).max(160),
  bio: z.string().min(10).max(1200),
  photo_url: httpUrl.optional().nullable(),
  email: z.string().email().optional().nullable(),
  website_url: httpUrl.optional().nullable(),
  linkedin_url: httpUrl.optional().nullable(),
  social_links: z.record(httpUrl).default({}),
  display_order: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const correctionInput = z.object({
  submitter_name: z.string().max(160).optional().nullable(),
  submitter_email: z.string().email().optional().nullable().or(z.literal('')),
  page_url: z.string().min(1).max(500),
  issue: z.string().min(10).max(2000),
  suggested_correction: z.string().max(2000).optional().nullable(),
  source_url: httpUrl.optional().nullable().or(z.literal('')),
  // Honeypot: real users never fill this in.
  website: z.string().max(0).optional(),
});

export const contactInput = z.object({
  name: z.string().min(2).max(160),
  email: z.string().email(),
  category: z.enum([
    'General inquiry', 'Press', 'Partnership',
    'Article question', 'Data correction', 'Technical problem',
  ]),
  subject: z.string().max(200).optional().nullable(),
  message: z.string().min(20).max(4000),
  website: z.string().max(0).optional(), // honeypot
});

export const newsletterInput = z.object({
  email: z.string().email(),
  first_name: z.string().max(80).optional().nullable(),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please confirm you want these emails.' }) }),
  website: z.string().max(0).optional(),
});

export const adminEnrollInput = z.object({
  code: z.string().min(8).max(200),
});
