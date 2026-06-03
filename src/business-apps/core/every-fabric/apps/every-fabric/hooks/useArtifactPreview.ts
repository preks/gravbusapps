import { useMemo } from 'react'
import type { AgentStreamEvent, ArtifactPreviewEvent } from '../types/enterpriseAgent'

export type PreviewStatus = 'idle' | 'generating' | 'draft_ready' | 'ready' | 'error'

/** SSE may send MIME strings from older backends; normalize to UI artifact types. */
function normalizePreviewArtifactType(raw: string, pathHint = ''): ArtifactPreview['artifactType'] {
  const lowered = raw.toLowerCase()
  const path = pathHint.toLowerCase()
  if (path.endsWith('.timeline.html') || lowered === 'html' || lowered.includes('text/html')) {
    return 'html'
  }
  if (lowered === 'pdf' || lowered.includes('application/pdf') || path.endsWith('.pdf')) {
    return 'pdf'
  }
  if (lowered === 'chart' || lowered === 'slides' || lowered === 'document' || lowered === 'note') {
    return lowered
  }
  if (lowered.includes('chart') || lowered.includes('dashboard')) return 'chart'
  if (lowered.includes('slides')) return 'slides'
  if (lowered.includes('document')) return 'document'
  return 'chart'
}

export interface ArtifactPreview {
  artifactId: string
  artifactType: 'slides' | 'document' | 'note' | 'chart' | 'html' | 'pdf'
  title: string
  status: PreviewStatus
  content?: Record<string, unknown>
  /** Legacy free-form error string; prefer ``userMessage`` in new UI. */
  error?: string
  errorCode?: string
  retryable?: boolean
  userMessage?: string
  technicalDetail?: string
}

const PREVIEW_SUBTYPES = new Set(['start', 'progress', 'draft_ready', 'complete', 'error'])

/** Platform breakdown previews outrank later expert/agent chart artifacts at the same seq. */
const platformChartPreviewPriority = (artifactId: string): number => (artifactId.startsWith('breakdown-chart-') ? 2 : 0)

const pickLatestPreview = (
  events: AgentStreamEvent[],
  previewMap: Map<string, ArtifactPreview>
): ArtifactPreview | null => {
  let best: ArtifactPreview | null = null
  let bestSeq = -1
  let bestPriority = -1

  for (const event of events) {
    if (event.type !== 'artifact_preview') continue
    const ev = event as ArtifactPreviewEvent
    if (!PREVIEW_SUBTYPES.has(ev.subtype)) continue

    const preview = previewMap.get(ev.artifact_id)
    if (!preview) continue

    const seq = typeof ev.seq === 'number' ? ev.seq : -1
    const priority = preview.artifactType === 'chart' ? platformChartPreviewPriority(ev.artifact_id) : 0

    if (seq > bestSeq || (seq === bestSeq && priority > bestPriority)) {
      best = preview
      bestSeq = seq
      bestPriority = priority
    }
  }

  if (best) return best
  const values = [...previewMap.values()]
  return values.length > 0 ? values[values.length - 1] : null
}

/**
 * Derives the latest artifact preview state from SSE events.
 *
 * Tracks all artifact_preview events by artifact_id and returns
 * an ordered list plus the most recent preview for convenience.
 */
export const useArtifactPreview = (events: AgentStreamEvent[]) => {
  const { previews, latestPreview } = useMemo(() => {
    const previewMap = new Map<string, ArtifactPreview>()

    for (const event of events) {
      if (event.type !== 'artifact_preview') continue
      const ev = event as ArtifactPreviewEvent
      const existing = previewMap.get(ev.artifact_id)

      const pathHint = typeof ev.content?.path === 'string' ? ev.content.path.replace(/^\/+/, '') : ''
      const artifactType = normalizePreviewArtifactType(ev.artifact_type, pathHint)

      if (ev.subtype === 'start') {
        previewMap.set(ev.artifact_id, {
          artifactId: ev.artifact_id,
          artifactType,
          title: ev.title,
          status: 'generating'
        })
      } else if (ev.subtype === 'progress') {
        previewMap.set(ev.artifact_id, {
          artifactId: ev.artifact_id,
          artifactType,
          title: ev.title || existing?.title || '',
          status: 'generating',
          content: ev.content
        })
      } else if (ev.subtype === 'draft_ready') {
        previewMap.set(ev.artifact_id, {
          artifactId: ev.artifact_id,
          artifactType,
          title: ev.title,
          status: 'draft_ready',
          content: ev.content
        })
      } else if (ev.subtype === 'complete') {
        previewMap.set(ev.artifact_id, {
          artifactId: ev.artifact_id,
          artifactType,
          title: ev.title,
          status: 'ready',
          content: ev.content
        })
      } else if (ev.subtype === 'error') {
        previewMap.set(ev.artifact_id, {
          ...(existing ?? {
            artifactId: ev.artifact_id,
            artifactType,
            title: ev.title,
            status: 'error' as const
          }),
          status: 'error',
          error: ev.error,
          errorCode: ev.error_code,
          retryable: ev.retryable,
          userMessage: ev.user_message,
          technicalDetail: ev.technical_detail
        })
      }
    }

    const latest = pickLatestPreview(events, previewMap)
    // Charts render inline in chat only; exclude from Live Preview rail (Option A).
    const latestPreview = latest?.artifactType === 'chart' ? null : latest

    return {
      previews: [...previewMap.values()],
      latestPreview
    }
  }, [events])

  // An active preview also includes the terminal ``error`` state so the right
  // rail stays wide enough to render the designed failure card (with a retry
  // button) instead of squeezing it into the narrow ambient progress rail.
  // Only slides, documents, and notes need the wide canvas — charts and
  // dashboards fit comfortably in the narrow rail.
  const WIDE_PREVIEW_TYPES = new Set(['slides', 'document', 'note', 'html', 'pdf'])

  const hasActivePreview = previews.some(
    p =>
      WIDE_PREVIEW_TYPES.has(p.artifactType) &&
      (p.status === 'generating' || p.status === 'draft_ready' || p.status === 'ready' || p.status === 'error')
  )

  return { previews, latestPreview, hasActivePreview }
}
