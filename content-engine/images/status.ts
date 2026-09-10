/**
 * Image pipeline status — Phase 1: contract only (WebP + alt + render check).
 * Does not mass-generate assets.
 */
export const IMAGE_PIPELINE = {
  status: "foundation" as const,
  requireWebp: true,
  requireAlt: true,
  requireRenderCheck: true,
  massGenerationEnabled: false,
  notes: [
    "Relevant WebP + alt required before publication gate",
    "Broken image = blocker",
    "Wire to existing image_asset ContentGenerationKind later",
  ],
};

export function imagePipelineStatus() {
  return IMAGE_PIPELINE;
}
