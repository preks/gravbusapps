import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AgentStreamEvent, WorkspaceDocument } from '../types/enterpriseAgent'
import type { ArtifactFile } from '../types/fabric'
import { resolveRendererType } from '../types/fabric'
import { isUserFacingArtifactPath } from '../utils/artifactFilters'
import { isFlowBotFabricRuntime } from '../utils/fabricRuntime'
import { useEnterpriseAgentClient } from './useEnterpriseAgentClient'

const artifactBasenameKey = (value: string) =>
  value.replace(/^\/+/, '').split('/').filter(Boolean).pop()?.toLowerCase() ?? value.replace(/^\/+/, '').toLowerCase()

const artifactMatchesId = (artifact: ArtifactFile, id: string): boolean => {
  const normalizedId = id.replace(/^\/+/, '')
  const idBasename = artifactBasenameKey(normalizedId)
  const fields = [artifact.artifactKey, artifact.path, artifact.name].filter(Boolean) as string[]
  return fields.some(field => {
    const normalizedField = field.replace(/^\/+/, '')
    return field === id || normalizedField === normalizedId || artifactBasenameKey(normalizedField) === idBasename
  })
}

/**
 * Manages the artifact list for a session.
 *
 * Two sources are combined:
 * 1. `artifact_created` SSE events — give us live artifact notifications as they happen
 * 2. REST fetch on session completion (terminal event) — fills in any gaps
 *
 * The active artifact is the one currently open in ArtifactViewer.
 */
export const useFabricArtifacts = (
  sessionId: string | null,
  events: AgentStreamEvent[],
  accessToken: string,
  session?: { workspace_documents?: WorkspaceDocument[] } | null
) => {
  const client = useEnterpriseAgentClient(accessToken)
  const flowBotRuntime = isFlowBotFabricRuntime()
  const [restArtifacts, setRestArtifacts] = useState<ArtifactFile[]>([])
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null)
  const fetchedSessionIdRef = useRef<string | null>(null)

  // Fetch artifact list from REST when session completes or when session changes
  const fetchArtifacts = useCallback(async () => {
    if (flowBotRuntime) return
    if (!sessionId) return
    try {
      const files = await client.listArtifacts(sessionId)
      setRestArtifacts(files.filter(f => isUserFacingArtifactPath(f.path || f.name || f.artifactKey)))
    } catch {
      // Non-critical — SSE-derived artifacts still work
    }
  }, [sessionId, client, flowBotRuntime])

  // Reset on session change
  useEffect(() => {
    if (fetchedSessionIdRef.current !== sessionId) {
      fetchedSessionIdRef.current = sessionId
      setRestArtifacts([])
      setActiveArtifactId(null)
    }
  }, [sessionId])

  // Fetch on terminal event (session completed / failed)
  useEffect(() => {
    const hasTerminal = events.some(e => e.type === 'terminal')
    if (hasTerminal && sessionId && fetchedSessionIdRef.current === sessionId) {
      void fetchArtifacts()
    }
  }, [events, sessionId, fetchArtifacts])

  // Derive live artifacts from SSE artifact_created events
  const sseArtifacts = useMemo((): ArtifactFile[] => {
    if (!sessionId) return []
    return events
      .filter((e): e is Extract<AgentStreamEvent, { type: 'artifact_created' }> => e.type === 'artifact_created')
      .filter(ev => isUserFacingArtifactPath(ev.path || ev.name))
      .map(ev => ({
        sessionId,
        artifactKey: ev.path || ev.name,
        name: ev.name,
        path: ev.path || ev.name,
        mime_type: ev.mime_type ?? '',
        size: ev.size ?? 0,
        created_at: ev.timestamp,
        modified_at: ev.timestamp,
        rendererType: resolveRendererType(ev.mime_type, ev.name),
        downloadUrl: client.getArtifactUrl(sessionId, ev.path || ev.name),
        source_metadata: { step_id: ev.step_id }
      }))
  }, [events, sessionId, client])

  // Workspace documents from terminal event (SSE) or REST session metadata
  const workspaceDocs = useMemo((): WorkspaceDocument[] => {
    // First try SSE terminal event (real-time)
    const terminalEvent = events.find(
      (e): e is Extract<AgentStreamEvent, { type: 'terminal' }> => e.type === 'terminal' && e.status === 'completed'
    )
    if (terminalEvent?.workspace_documents?.length) {
      return terminalEvent.workspace_documents
    }
    // Fall back to REST session metadata (authoritative for completed sessions)
    return session?.workspace_documents ?? []
  }, [events, session])

  // Merge SSE artifacts with REST artifacts, deduplicating by artifact key
  const artifacts = useMemo((): ArtifactFile[] => {
    const normalizeKey = (artifact: ArtifactFile) =>
      (artifact.path || artifact.name || artifact.artifactKey).split('/').filter(Boolean).pop()?.toLowerCase() ??
      artifact.artifactKey.toLowerCase()

    const rankArtifact = (artifact: ArtifactFile) => {
      let score = 0
      if (artifact.size > 0) score += 1000
      if (artifact.path && artifact.path !== artifact.name) score += 100
      if (artifact.rendererType !== 'unknown') score += 10
      return score
    }

    const mergedByKey = new Map<string, ArtifactFile>()
    for (const artifact of [...restArtifacts, ...sseArtifacts]) {
      const key = normalizeKey(artifact)
      const existing = mergedByKey.get(key)
      if (!existing || rankArtifact(artifact) > rankArtifact(existing)) {
        mergedByKey.set(key, artifact)
      }
    }

    const merged = [...mergedByKey.values()]
    const hasProviderChart = merged.some(
      artifact =>
        artifact.rendererType === 'chart' &&
        typeof (artifact.source_metadata as { step_id?: unknown } | undefined)?.step_id === 'string' &&
        String((artifact.source_metadata as { step_id?: string }).step_id).startsWith('provider-artifact-')
    )
    const visible = hasProviderChart
      ? merged.filter(artifact => {
          const stepId = (artifact.source_metadata as { step_id?: unknown } | undefined)?.step_id
          const isProvider = typeof stepId === 'string' && stepId.startsWith('provider-artifact-')
          const isSseUnknownOrJson =
            typeof stepId === 'string' &&
            !isProvider &&
            (artifact.rendererType === 'unknown' ||
              artifact.rendererType === 'code' ||
              artifact.path.toLowerCase().endsWith('.json'))
          return !isSseUnknownOrJson
        })
      : merged

    return visible.sort((a, b) => a.created_at.localeCompare(b.created_at))
  }, [restArtifacts, sseArtifacts])

  const activeArtifact = useMemo((): ArtifactFile | null => {
    if (!activeArtifactId || !sessionId) return null
    const found = artifacts.find(a => artifactMatchesId(a, activeArtifactId))
    if (found) return found
    if (!isUserFacingArtifactPath(activeArtifactId)) return null
    const path = activeArtifactId.replace(/^\/+/, '')
    const name = path.split('/').filter(Boolean).pop() ?? path
    const now = new Date().toISOString()
    return {
      sessionId,
      artifactKey: path,
      name,
      path,
      mime_type: '',
      size: 0,
      created_at: now,
      modified_at: now,
      rendererType: resolveRendererType('', path),
      downloadUrl: client.getArtifactUrl(sessionId, path)
    }
  }, [artifacts, activeArtifactId, sessionId, client])

  return {
    artifacts,
    workspaceDocs,
    activeArtifactId,
    activeArtifact,
    setActiveArtifactId,
    refreshArtifacts: fetchArtifacts
  }
}
