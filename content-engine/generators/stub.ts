/**
 * Generator stub — Phase 1 does NOT call AI or write public pages.
 * Real generators plug in later; this only defines the contract.
 */
import type { ManifestRecord } from "../config/types";

export type GenerationRequest = {
  manifest: ManifestRecord;
  generationVersion: string;
  attempt: number;
};

export type GenerationResult = {
  ok: boolean;
  skipped: boolean;
  reason: string;
  bodyEn?: string;
  bodyAr?: string;
  titleEn?: string;
  titleAr?: string;
};

export async function generateContentStub(req: GenerationRequest): Promise<GenerationResult> {
  return {
    ok: false,
    skipped: true,
    reason: `Phase 1 stub: generation disabled for ${req.manifest.contentKey} (v=${req.generationVersion}, attempt=${req.attempt})`,
  };
}
