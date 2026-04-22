import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import type { ArtifactPreview } from '../hooks/useArtifactPreview'

/**
 * Thin client for POST /deep-agent/sessions/{id}/confirm-draft.
 *
 * Routing all artifact lifecycle operations (confirm / update / discard)
 * through prompt-manager gives us:
 *
 *   - Single source of truth for user auth + session ownership checks.
 *   - Idempotency: when the generation tool already persisted a draft, the
 *     endpoint PATCHes instead of creating a duplicate. When the user
 *     discards, it DELETEs the persisted entity instead of silently leaking.
 *   - Consistent shape for every artifact type (document / slides / note).
 *
 * The prompt-manager endpoint expects ``entity_id`` when the artifact was
 * already persisted by the AI tool — we derive it from the preview payload.
 */

export type ArtifactType = 'document' | 'slides' | 'note'

export interface ConfirmDraftInput {
  sessionId: string
  accessToken: string
  artifactId: string
  artifactType: ArtifactType
  title: string
  /** Existing entity id (doc/slide/note). Triggers UPDATE / DELETE on the server. */
  entityId?: string
  /** HTML body. Mutually exclusive-ish with contentMarkdown. */
  contentHtml?: string
  /** Raw markdown body; the server will convert to HTML before persisting. */
  contentMarkdown?: string
  /** Structured content used by slides and future rich-block notes. */
  contentJson?: Record<string, unknown>
  description?: string
  spaceId?: string
  tags?: string[]
  /** If true, discard the draft. With ``entityId`` this DELETEs the entity. */
  discard?: boolean
}

export interface ConfirmDraftResult {
  status: 'confirmed' | 'updated' | 'discarded'
  artifact_id: string
  artifact_type: string
  entity_id?: string
  deleted?: boolean
}

/**
 * Extract the persisted entity id from an artifact preview payload.
 * The backend emits ``entity_id`` as the canonical key, but older tools
 * used ``document_id`` / ``slide_id`` / ``note_id`` — we accept all.
 */
export function extractEntityId(preview: ArtifactPreview): string | undefined {
  const content = preview.content
  if (!content) return undefined
  const candidates = ['entity_id', 'document_id', 'slide_id', 'note_id'] as const
  for (const key of candidates) {
    const value = content[key]
    if (typeof value === 'string' && value) return value
  }
  return undefined
}

export async function confirmDraft(input: ConfirmDraftInput): Promise<ConfirmDraftResult> {
  const {
    sessionId,
    accessToken,
    artifactId,
    artifactType,
    title,
    entityId,
    contentHtml,
    contentMarkdown,
    contentJson,
    description,
    spaceId,
    tags,
    discard
  } = input

  const body: Record<string, unknown> = {
    artifact_id: artifactId,
    artifact_type: artifactType,
    title,
    discard: Boolean(discard)
  }
  if (entityId) body.entity_id = entityId
  if (description !== undefined) body.description = description
  if (spaceId !== undefined) body.space_id = spaceId
  if (tags !== undefined) body.tags = tags

  // The server normalises markdown → HTML when ``content_format`` is
  // ``markdown``. For slides we send structured JSON instead.
  if (!discard) {
    if (contentMarkdown !== undefined) {
      body.content = contentMarkdown
      body.content_format = 'markdown'
    } else if (contentHtml !== undefined) {
      body.content = contentHtml
      body.content_format = 'html'
    }
    if (contentJson !== undefined) body.content_json = contentJson
  }

  const url = `${PROMPT_MANAGER_API_URL}/deep-agent/sessions/${sessionId}/confirm-draft`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const errorBody = await res.text().catch(() => 'Unknown error')
    throw new Error(`Confirm draft failed (${res.status}): ${errorBody}`)
  }
  return (await res.json()) as ConfirmDraftResult
}

/**
 * Convenience wrapper that builds a {@link ConfirmDraftInput} from an
 * {@link ArtifactPreview} and a small set of overrides. Kept close to the
 * core helper so both the DraftActionBar and the inline canvas save path
 * use the same entity-id resolution + payload shape.
 */
export interface ConfirmDraftFromPreviewOverrides {
  /** Override the title (e.g. user-edited in the canvas). */
  title?: string
  /** Override the HTML body sent to the server. */
  contentHtml?: string
  /** Send markdown instead of HTML. */
  contentMarkdown?: string
  /** Override the structured content used for slides. */
  contentJson?: Record<string, unknown>
  /** Force discard (the canvas never discards; the DraftActionBar does). */
  discard?: boolean
}

export async function confirmDraftFromPreview(
  sessionId: string,
  preview: ArtifactPreview,
  accessToken: string,
  overrides: ConfirmDraftFromPreviewOverrides = {}
): Promise<ConfirmDraftResult> {
  if (preview.artifactType === 'chart') {
    throw new Error('Chart previews are not persisted via confirm-draft')
  }
  const artifactType = preview.artifactType

  const contentHtml =
    overrides.contentHtml ?? (typeof preview.content?.html === 'string' ? String(preview.content.html) : undefined)
  const contentMarkdown =
    overrides.contentMarkdown ??
    (typeof preview.content?.markdown === 'string' && !overrides.contentHtml
      ? String(preview.content.markdown)
      : undefined)
  const contentJson =
    overrides.contentJson ??
    (preview.content && artifactType === 'slides' && Array.isArray(preview.content.slides)
      ? (preview.content as Record<string, unknown>)
      : undefined)

  return confirmDraft({
    sessionId,
    accessToken,
    artifactId: preview.artifactId,
    artifactType,
    title: overrides.title ?? preview.title,
    entityId: extractEntityId(preview),
    contentHtml,
    contentMarkdown,
    contentJson,
    discard: overrides.discard
  })
}
