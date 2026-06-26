import type { ArtifactPreview } from '../hooks/useArtifactPreview'

/**
 * Canvas-worthy artifact types worth pinning across turns. Charts render
 * inline in chat and PDFs use the narrow rail, so neither should keep the
 * wide canvas open once the producing turn ends.
 */
const PINNABLE_PREVIEW_TYPES = new Set<ArtifactPreview['artifactType']>(['slides', 'document', 'note', 'html'])

export interface EffectivePreviewState {
  previews: ArtifactPreview[]
  latestPreview: ArtifactPreview | null
  hasActivePreview: boolean
}

/**
 * Keeps a finished artifact canvas pinned across conversation turns.
 *
 * Live previews are turn-scoped (see ``currentTurnTrace``), so a completed
 * deck/document vanishes the instant the user sends the next message. This
 * combines the turn-scoped view with the full-session view:
 *
 * - If the current turn has a live preview, it wins (covers
 *   generating/draft_ready/ready/error states for the active turn).
 * - Otherwise pin the most recent successfully-finished, canvas-worthy
 *   artifact from the whole session so the user can keep reading it.
 *   Stale ``error``/``generating`` leftovers from prior turns are dropped
 *   (we never re-surface a previous turn's failure or in-flight spinner).
 */
export const pickEffectivePreview = (
  turn: EffectivePreviewState,
  full: EffectivePreviewState
): EffectivePreviewState => {
  if (turn.latestPreview) {
    return turn
  }

  const pinned = [...full.previews]
    .reverse()
    .find(p => p.status === 'ready' && PINNABLE_PREVIEW_TYPES.has(p.artifactType))

  if (!pinned) {
    return { previews: full.previews, latestPreview: null, hasActivePreview: false }
  }

  return {
    previews: full.previews,
    latestPreview: pinned,
    hasActivePreview: true
  }
}
