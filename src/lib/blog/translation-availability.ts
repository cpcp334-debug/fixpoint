import { Prisma } from '@prisma/client';

// Explicit ECMAScript trim characters, shared with the MySQL regexp parameter.
// This is a minimum content-presence rule, not language or editorial approval.
export const BLOG_NON_WHITESPACE = '[^\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]';
const nonWhitespace = new RegExp(BLOG_NON_WHITESPACE);
export type BlogTranslationContent = { title: string; body: string };
export function isBlogTranslationAvailable(t: BlogTranslationContent | null | undefined): boolean {
  return !!t && [t.title, t.body].every(value => nonWhitespace.test(value) && !/REVIEW_REQUIRED/i.test(value));
}

/** Alias t is fixed by the queries below; never interpolate an identifier from input. */
export function blogTranslationAvailabilitySql(): Prisma.Sql {
  return Prisma.sql`t.title REGEXP ${BLOG_NON_WHITESPACE}
    AND t.body REGEXP ${BLOG_NON_WHITESPACE}
    AND LOCATE('review_required', LOWER(t.title)) = 0
    AND LOCATE('review_required', LOWER(t.body)) = 0`;
}

export function blogPageQueries(locale: string, opts: {skip: number; take: number; category?: string; q?: string}) {
  const category = opts.category?.trim();
  const q = opts.q?.trim();
  const where = Prisma.sql`a.status = 'published' AND a.indexable = true
    AND LEFT(a.slug, 4) <> 'faq-'
    AND LEFT(a.slug, 14) <> '__restore_faq_'
    AND LEFT(a.slug, 15) <> '__restore_blog_'
    AND LEFT(a.slug, 5) <> 'أسئلة'
    AND a.slug NOT REGEXP ${'[\u0600-\u06ff]'}
    AND LOCATE('service-faq', a.categorySlugs) = 0
    AND t.locale = ${locale}
    AND ${blogTranslationAvailabilitySql()}
    ${category ? Prisma.sql`AND a.categorySlugs LIKE ${`%${category}%`}` : Prisma.empty}
    ${q ? Prisma.sql`AND (t.title LIKE ${`%${q}%`} OR t.excerpt LIKE ${`%${q}%`})` : Prisma.empty}`;
  const from = Prisma.sql`FROM Article a JOIN ArticleI18n t ON t.articleId = a.id WHERE ${where}`;
  return {
    ids: Prisma.sql`SELECT a.id ${from} ORDER BY a.publishedAt DESC, a.updatedAt DESC, a.id DESC LIMIT ${opts.take} OFFSET ${opts.skip}`,
    count: Prisma.sql`SELECT COUNT(*) AS total ${from}`,
  };
}
