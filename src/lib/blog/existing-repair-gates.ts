import {
  evaluateBlogPublicationGates,
  type BlogGateInput,
  type BlogGateResult,
} from './publication-gates';

/** Trusted caller must obtain this evidence from its DB backup and a public GET.
 * This pure consistency check is not an authentication or publication permission.
 * New publication callers keep using evaluateBlogPublicationGates unchanged.
 */
export type ExistingBlogRepairEvidence = {
  articleId: string;
  previousStatus: string;
  previousIndexable: boolean;
  originalPublishedAt: string | null;
  originalPublicUrl: string;
  proposedPublicUrl: string;
  observedFinalUrl: string;
  canonicalUrl: string;
  observedStatus: number;
  checkedAt: string;
};

export type ExistingBlogRepairGateResult = BlogGateResult & {
  existingUrlEvidenceConsistent: boolean;
  legacyUrlPreserved: boolean;
  rawPublicationFailures: string[];
};

export function evaluateExistingBlogRepairGates(
  input: BlogGateInput,
  evidence: ExistingBlogRepairEvidence,
): ExistingBlogRepairGateResult {
  const original = evaluateBlogPublicationGates(input);
  const evidenceFailures: string[] = [];
  if (!evidence.articleId || evidence.previousStatus !== 'published' ||
      !evidence.previousIndexable || input.status !== 'published' || !input.indexable) {
    evidenceFailures.push('existing_published_record_required');
  }
  const checked = Date.parse(evidence.checkedAt);
  const published = Date.parse(evidence.originalPublishedAt || '');
  if (!Number.isFinite(checked) || !Number.isFinite(published) ||
      published > checked || checked > Date.now() + 300_000 || Date.now() - checked > 86_400_000) {
    evidenceFailures.push('fresh_existing_publication_evidence_required');
  }
  let originalSlug: string | null = null;
  try {
    const url = new URL(evidence.originalPublicUrl);
    if (url.origin !== 'https://fixpoint.ae' || !url.pathname.startsWith('/ar/blog/') ||
        url.search || url.hash || url.username || url.password) throw Error('Invalid origin or route');
    originalSlug = decodeURIComponent(url.pathname.slice('/ar/blog/'.length));
  } catch {
    evidenceFailures.push('existing_public_arabic_route_required');
  }
  if (originalSlug !== input.slug || evidence.observedStatus !== 200 ||
      evidence.originalPublicUrl !== evidence.proposedPublicUrl ||
      evidence.originalPublicUrl !== evidence.observedFinalUrl ||
      evidence.originalPublicUrl !== evidence.canonicalUrl) {
    evidenceFailures.push('existing_url_and_canonical_must_be_preserved');
  }
  const evidenceConsistent = evidenceFailures.length === 0;
  // Retain an already-public legacy address under the owner's URL-preservation
  // instruction. All content, image, language, word-count and claim gates remain.
  const legacyUrlPreserved = evidenceConsistent && !/[\u0600-\u06FF]/.test(input.slug);
  const failures = [
    ...original.failures.filter(f => !(legacyUrlPreserved && f === 'slug_not_arabic')),
    ...evidenceFailures,
  ];
  return {
    ...original,
    pass: failures.length === 0,
    failures,
    existingUrlEvidenceConsistent: evidenceConsistent,
    legacyUrlPreserved,
    rawPublicationFailures: [...original.failures],
  };
}
