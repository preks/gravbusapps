import { useMemo } from 'react'
import type { AgentStreamEvent, ArtifactPreviewEvent } from '../types/enterpriseAgent'

export type PreviewStatus = 'idle' | 'generating' | 'draft_ready' | 'ready' | 'error'

export interface ArtifactPreview {
  artifactId: string
  artifactType: 'slides' | 'document' | 'note' | 'chart'
  title: string
  status: PreviewStatus
  content?: Record<string, unknown>
  error?: string
}

/**
 * Derives the latest artifact preview state from SSE events.
 *
 * Tracks all artifact_preview events by artifact_id and returns
 * an ordered list plus the most recent preview for convenience.
 */
export const useArtifactPreview = (events: AgentStreamEvent[]) => {
  const previews = useMemo((): ArtifactPreview[] => {
    const previewMap = new Map<string, ArtifactPreview>()

    for (const event of events) {
      if (event.type !== 'artifact_preview') continue
      const ev = event as ArtifactPreviewEvent
      const existing = previewMap.get(ev.artifact_id)

      if (ev.subtype === 'start') {
        previewMap.set(ev.artifact_id, {
          artifactId: ev.artifact_id,
          artifactType: ev.artifact_type,
          title: ev.title,
          status: 'generating'
        })
      } else if (ev.subtype === 'progress') {
        previewMap.set(ev.artifact_id, {
          artifactId: ev.artifact_id,
          artifactType: ev.artifact_type,
          title: ev.title || existing?.title || '',
          status: 'generating',
          content: ev.content
        })
      } else if (ev.subtype === 'draft_ready') {
        previewMap.set(ev.artifact_id, {
          artifactId: ev.artifact_id,
          artifactType: ev.artifact_type,
          title: ev.title,
          status: 'draft_ready',
          content: ev.content
        })
      } else if (ev.subtype === 'complete') {
        previewMap.set(ev.artifact_id, {
          artifactId: ev.artifact_id,
          artifactType: ev.artifact_type,
          title: ev.title,
          status: 'ready',
          content: ev.content
        })
      } else if (ev.subtype === 'error') {
        previewMap.set(ev.artifact_id, {
          ...(existing ?? {
            artifactId: ev.artifact_id,
            artifactType: ev.artifact_type,
            title: ev.title,
            status: 'error' as const
          }),
          status: 'error',
          error: ev.error
        })
      }
    }

    return [...previewMap.values()]
  }, [events])

  const latestPreview = previews.length > 0 ? previews[previews.length - 1] : null

  const hasActivePreview = previews.some(
    p => p.status === 'generating' || p.status === 'draft_ready' || p.status === 'ready'
  )

  return { previews, latestPreview, hasActivePreview }
}
