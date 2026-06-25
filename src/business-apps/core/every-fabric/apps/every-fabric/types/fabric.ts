/**
 * UI-specific types for the Every Fabric redesign.
 * Backend types live in enterpriseAgent.ts — this file extends them for the new UI layer.
 */

// ─── Artifacts ────────────────────────────────────────────────────────────────

/** Mime-type groups that map to specific renderers */
export type ArtifactRendererType =
  | 'html'
  | 'document'
  | 'slide'
  | 'chart'
  | 'table'
  | 'diagram'
  | 'app-preview'
  | 'code'
  | 'markdown'
  | 'unknown'

/** A file artifact produced by the agent, as returned by the REST API */
export interface ArtifactFile {
  sessionId: string
  artifactKey: string
  name: string
  path: string
  mime_type: string
  size: number
  created_at: string
  modified_at: string
  provider_tool_ref?: string | null
  source_metadata?: unknown
  /** Derived client-side: which renderer to use */
  rendererType: ArtifactRendererType
  /** Fully qualified download URL, set by useFabricArtifacts */
  downloadUrl: string
}

export function resolveRendererType(mimeType?: string | null, filename?: string | null): ArtifactRendererType {
  const safeMimeType = typeof mimeType === 'string' ? mimeType : ''
  const safeFilename = typeof filename === 'string' ? filename : ''

  // Slide deck JSON format (compound extension)
  if (safeFilename.endsWith('.slides.json') || safeMimeType === 'application/vnd.newwork.slides+json') return 'slide'
  if (safeFilename.endsWith('.chart.json') || safeMimeType === 'application/vnd.newwork.chart+json') return 'chart'
  if (safeFilename.endsWith('.dashboard.json') || safeMimeType === 'application/vnd.newwork.dashboard+json')
    return 'chart'
  if (safeFilename.endsWith('.table.json') || safeMimeType === 'application/vnd.newwork.table+json') return 'table'
  if (safeFilename.endsWith('.diagram.json') || safeMimeType === 'application/vnd.newwork.diagram+json')
    return 'diagram'
  if (safeFilename.endsWith('.canvas.tsx') || safeMimeType === 'application/vnd.newwork.app-preview+tsx')
    return 'app-preview'
  if (safeFilename.endsWith('.document.json') || safeMimeType === 'application/vnd.newwork.document+json')
    return 'document'

  if (safeMimeType === 'text/html' || safeFilename.endsWith('.html') || safeFilename.endsWith('.htm')) return 'html'
  if (safeMimeType === 'text/markdown' || safeFilename.endsWith('.md')) return 'markdown'
  if (safeFilename.endsWith('.pptx') || safeFilename.endsWith('.ppt')) return 'slide'
  if (safeFilename.endsWith('.svg') || safeFilename.endsWith('.mermaid') || safeFilename.endsWith('.mmd'))
    return 'diagram'
  if (
    safeMimeType.startsWith('text/') ||
    ['js', 'ts', 'tsx', 'jsx', 'py', 'sh', 'sql', 'json', 'yaml', 'yml', 'xml', 'csv', 'css'].some(ext =>
      safeFilename.endsWith(`.${ext}`)
    )
  )
    return 'code'
  if (safeFilename.endsWith('.docx') || safeFilename.endsWith('.doc') || safeFilename.endsWith('.txt'))
    return 'document'
  return 'unknown'
}

// ─── Task Progress ─────────────────────────────────────────────────────────────

/** Status values used by the TaskTree UI */
export type FabricTaskStatus = 'pending' | 'active' | 'done' | 'failed' | 'skipped'

/** A sub-agent spawned during task execution */
export interface FabricSubAgent {
  /** Unique identifier — step_id from the SSE event */
  id: string
  /** Display name — subagent_id ?? name from SSE event */
  name: string
  /** Task or summary shown under the expert name */
  summary?: string
  status: 'running' | 'done' | 'failed'
}

/**
 * A single task step in the progress tree.
 * Derived from session.todos, SSE terminal/write_todos payloads, step_started/step_completed, and subagent events.
 */
export interface FabricTaskNode {
  id: string
  label: string
  /** Tool name + duration, e.g. "web_search · 1.2s" */
  sublabel?: string
  status: FabricTaskStatus
  /** Sub-agents spawned during this step */
  subAgents: FabricSubAgent[]
}

// ─── Context ───────────────────────────────────────────────────────────────────

/** Minimal session summary stored in the session list */
export interface FabricSessionSummary {
  session_id: string
  input: string
  status: string
  created_at: string
  updated_at: string
  completed_at?: string | null
  config?: import('./enterpriseAgent').SessionConfig
  human_question?: string | null
}
