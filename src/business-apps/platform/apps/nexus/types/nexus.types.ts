// ── Artifact Types ─────────────────────────────────────────────

export type ArtifactType = 'document' | 'analysis' | 'slides'
export type ArtifactStatus = 'generating' | 'complete' | 'error'

export interface NexusArtifact {
  id: string
  sessionId: string
  type: ArtifactType
  title: string
  status: ArtifactStatus
  content: DocumentContent | AnalysisContent | SlidesContent
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface DocumentContent {
  markdown: string
  title: string
}

export interface AnalysisSection {
  type: 'narrative' | 'chart' | 'table'
  title?: string
  content?: string
  chart?: AnalysisChart
  table?: AnalysisTable
}

export interface AnalysisContent {
  summary: string
  kpis: AnalysisKpi[]
  charts: AnalysisChart[]
  tables: AnalysisTable[]
  insights: string[]
  sections?: AnalysisSection[]
}

export interface AnalysisKpi {
  label: string
  value: string
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

export interface AnalysisChart {
  type: 'bar' | 'line' | 'pie' | 'area'
  title: string
  data: Record<string, unknown>[]
  xKey: string
  yKey: string
  description?: string
}

export interface AnalysisTable {
  title: string
  headers: string[]
  rows: string[][]
}

export interface SlidesContent {
  title: string
  subtitle?: string
  slides: GeneratedSlide[]
  sources?: string[]
}

export interface GeneratedSlide {
  layout: string
  title: string
  subtitle?: string
  description?: string
  bullets?: string[]
  leftTitle?: string
  leftColumn?: string[]
  rightTitle?: string
  rightColumn?: string[]
  steps?: Array<{ title: string; description: string }>
  items?: Array<{ date: string; title: string; description: string }>
  metrics?: Array<{
    label: string
    value: string
    trend?: string
    trendValue?: string
  }>
  data?: Array<{ label: string; value: number }>
  headers?: string[]
  rows?: string[][]
  content?: string
  imageUrl?: string
  imageKeywords?: string
  imageAttribution?: string
  sectionNumber?: number
  source?: string
}

// ── Session Types ──────────────────────────────────────────────

export interface NexusSession {
  id: string
  userId: string
  title: string
  scope: 'all' | 'space' | 'none'
  spaceId?: string
  llmProvider?: string
  contextConfig?: {
    dataAccessEnabled?: boolean
    webSearchEnabled?: boolean
    deepResearchEnabled?: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface NexusActiveRunSnapshot {
  sessionId: string
  status: string | null
  artifactId?: string
  artifactType?: ArtifactType
  startedAt: string
}

export interface NexusHistoryAck {
  success: boolean
  history?: NexusMessage[]
  artifacts?: NexusArtifact[]
  activeRun?: NexusActiveRunSnapshot | null
  error?: string
}

export interface NexusMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  artifactId?: string
  sources?: NexusSource[]
  createdAt: string
}

export interface NexusSource {
  contentType: 'document' | 'note' | 'spreadsheet' | 'web'
  contentId: string
  title: string
  chunkText: string
  similarity: number
  /** URL for web sources */
  url?: string
  /** Origin of the source: internal doc/note/sheet, web, or system data */
  origin?: 'internal' | 'web' | 'system'
  /** Citation number [n] used in deep research reports */
  sourceNo?: number
}

// ── Socket Event Types ─────────────────────────────────────────

export type NexusIntent = 'chat' | 'generate-document' | 'generate-analysis' | 'refine-artifact' | 'fetch-data'

export interface NexusCompleteEvent {
  userMessage: NexusMessage
  assistantMessage: NexusMessage
  artifact?: NexusArtifact
  intent: NexusIntent
}

export interface ArtifactStartEvent {
  id: string
  type: ArtifactType
  title: string
}

export interface ArtifactChunkEvent {
  artifactId: string
  chunk: string
  chunkType: string
}

export interface ArtifactCompleteEvent {
  artifactId: string
  artifact: NexusArtifact
}
