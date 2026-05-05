import type { AssetSummaryData } from '../components/displays/asset-summary'
import type { TeamAvailabilityData } from '../components/displays/team-availability'
import type { CrmFunnelData } from '../components/displays/crm-funnel'
import type { WorkflowAnalyticsData } from '../components/displays/workflow-analytics'

/**
 * AI Assistant Models and Types
 * Based on gravity-platform's EveryChat implementation
 */

export type Color =
  | 'red'
  | 'green'
  | 'blue'
  | 'yellow'
  | 'purple'
  | 'orange'
  | 'pink'
  | 'gray'
  | 'black'
  | 'white'
  | null

export type TextBlockData = {
  type: 'textBlock'
  text: string
}

export type TableData = {
  type: 'table'
  columnsTitles: string[]
  rowsContents: string[][]
  title: string
  description: string
}

export type ScatterSeries = {
  name: string
  data: { x: number; y: number }[]
  markerStyle: '+' | '.' | '*' | null
  lineStyle: 'solid' | 'dashed' | 'dotted' | null
  color: Color
}

export type BarSeries = {
  name: string
  data: { x: string | number; y: number }[]
  color: Color
}

export type BarGraphData = {
  type: 'bar'
  series: BarSeries[]
  title: string
  description: string
}

export type ScatterGraphData = {
  type: 'scatter'
  series: ScatterSeries[]
  title: string
  description: string
}

export type EntityData = {
  type: 'entity'
  entity:
    | 'lead'
    | 'contact'
    | 'opportunity'
    // display-only entity text fields (provided by backend for robust rendering)
    | 'content_entry'
    | 'crm_note'
    | 'crm_document'
    | 'irm_note'
    | 'irm_document'
    | 'investment_note'
    | 'investment_document'
    | 'company'
    | 'account'
    | 'absence'
    | 'employee_absence'
    | 'expense_request'
    | 'expense_plan'
    | 'expense_item'
    | 'service_ticket'
    | 'investment_opportunity'
    | 'investment_lead'
    | 'investment_contact'
    | 'investment_company'
    | 'investment_account'
    | 'employee'
    | 'reminder'
    | 'blink'
    | 'quick_task'
    | 'service_workflow'
  id: string
  operation?: 'create' | 'update' | 'delete' | 'read'
  // New enriched fields coming from backend to avoid hardcoded queries
  text_title?: string
  text_human?: string
  text_full?: string | Record<string, unknown> | null
  tool?: string
  flow_proposal?: string
  /** Normalized entity link URL with optional alternateId fragment for redirects */
  link?: string
}

export type ReminderData = {
  type: 'reminder'
  workflowId: string
  title: string
  message?: string
  reminderDateTime: string // ISO datetime
  reminderDateTimeFormatted: string
  status: 'pending' | 'due' | 'completed' | 'dismissed'
  createdAt: string
}

export type FileData = {
  type: 'file'
  filename: string
  content: string
  mimeType: string
}

export type CalendarDuration = { type: 'allDay' } | { type: 'time'; start: string; end: string }

export type CalendarEvent = {
  id: string
  date: string
  label?: string
  tooltip?: string
  color?: Color
  duration?: CalendarDuration
}

export type CalendarViewData = {
  type: 'calendar'
  view: 'year' | 'month' | 'week' | 'day'
  startDate: string
  events: CalendarEvent[]
  title: string
  description: string
}

export type NavigationData = {
  type: 'navigation'
  url: string
  description: string
  reason: string
}

export type ChatReferenceData = {
  type: 'chat_reference'
  id: string
  message_id?: string
  conversation_type?: string
  snippet: string
  sender_name?: string
  timestamp?: string
}

export type { AssetSummaryData, TeamAvailabilityData }
export type { CrmFunnelData }
export type { WorkflowAnalyticsData }

export type ValueFormat = 'currency' | 'percent' | 'number' | 'date' | 'none'

export type ChartAxisSpec = {
  label?: string
  valueFormat?: ValueFormat
}

export type LinePoint = {
  x: string | number
  y: number
  tooltip?: string
}

export type LineSeries = {
  name: string
  data: LinePoint[]
  color?: Color
}

export type LineChartData = {
  type: 'lineChart'
  title: string
  description: string
  series: LineSeries[]
  subtitle?: string
  xAxis?: ChartAxisSpec
  yAxis?: ChartAxisSpec
  showLegend?: boolean
}

export type AreaChartData = {
  type: 'areaChart'
  title: string
  description: string
  series: LineSeries[]
  subtitle?: string
  xAxis?: ChartAxisSpec
  yAxis?: ChartAxisSpec
  stacked?: boolean
  showLegend?: boolean
}

export type StackedBarSegment = {
  name: string
  value: number
  color?: Color
}

export type StackedBarCategory = {
  category: string
  segments: StackedBarSegment[]
}

export type StackedBarChartData = {
  type: 'stackedBarChart'
  title: string
  description: string
  categories: StackedBarCategory[]
  subtitle?: string
  xAxis?: ChartAxisSpec
  yAxis?: ChartAxisSpec
  horizontal?: boolean
  showLegend?: boolean
}

export type PieSegment = {
  name: string
  value: number
  tooltip?: string
  color?: Color
}

export type PieChartData = {
  type: 'pieChart'
  title: string
  description: string
  segments: PieSegment[]
  donut?: boolean
  subtitle?: string
  valueFormat?: ValueFormat
}

export type MetricCardItem = {
  label: string
  value: string
  delta?: string
  deltaDirection?: 'up' | 'down' | 'neutral'
  hint?: string
  emphasis?: 'default' | 'primary' | 'success' | 'warning' | 'destructive'
}

export type MetricCardsData = {
  type: 'metricCards'
  title: string
  description: string
  cards: MetricCardItem[]
  columns?: number
}

export type HeatmapData = {
  type: 'heatmap'
  title: string
  description: string
  rowLabels: string[]
  columnLabels: string[]
  values: (number | null)[][]
  valueFormat?: ValueFormat
  cellLabels?: (string | null)[][]
}

export type TimelineEvent = {
  id: string
  title: string
  subtitle?: string
  timestamp: string
  status?: string
  color?: Color
}

export type TimelineData = {
  type: 'timeline'
  title: string
  description: string
  events: TimelineEvent[]
}

export type GanttTask = {
  id: string
  label: string
  start: string
  end: string
  progress?: number
  group?: string
  color?: Color
}

export type GanttData = {
  type: 'gantt'
  title: string
  description: string
  tasks: GanttTask[]
}

export type TreemapNodeData = {
  name: string
  size: number
  children?: TreemapNodeData[]
  color?: Color
}

export type TreemapData = {
  type: 'treemap'
  title: string
  description: string
  root: TreemapNodeData
  valueFormat?: ValueFormat
}

export type KanbanCard = {
  id: string
  title: string
  subtitle?: string
  status?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

export type KanbanColumn = {
  id: string
  title: string
  cards: KanbanCard[]
}

export type KanbanBoardData = {
  type: 'kanbanBoard'
  title: string
  description: string
  columns: KanbanColumn[]
}

export type DisplayData =
  | TextBlockData
  | TableData
  | ScatterGraphData
  | BarGraphData
  | EntityData
  | FileData
  | CalendarViewData
  | NavigationData
  | ReminderData
  | CrmFunnelData
  | WorkflowAnalyticsData
  | AssetSummaryData
  | TeamAvailabilityData
  | ChatReferenceData
  | LineChartData
  | AreaChartData
  | StackedBarChartData
  | PieChartData
  | MetricCardsData
  | HeatmapData
  | TimelineData
  | GanttData
  | TreemapData
  | KanbanBoardData

export type NextStepProposal = {
  heading: string
  message: string
}

export type AnswerOutput = {
  type: 'answer'
  displayData: DisplayData[]
  nextStepProposals: NextStepProposal[] | string[]
}

export type ToolOutput = {
  type: 'tool'
  name: string
  reason?: string
}

export type LoadingOutput = {
  type: 'loading'
}

export type ErrorOutput = {
  type: 'error'
  text?: string
}

export type BulkFlowProposalItem = {
  key: string
  label?: string
  overrides: Record<string, any>
  metadata?: Record<string, any>
}

export type BulkFlowProposal = {
  varying_field: string
  items: BulkFlowProposalItem[]
  item_label?: string
  require_explicit_item_confirmation?: boolean
}

export type FlowProposalOutput = {
  type: 'flow_proposal'
  flow_name: string
  module_name: string
  uuid: string
  operation?: 'create' | 'update' | 'delete'
  submitted?: boolean
  arguments: {
    flow?: Record<string, any>
    task?: Record<string, any>
  }
  flow_schema: {
    required?: string[]
    properties?: Record<string, any>
  }
  bulk_operation?: BulkFlowProposal
}

export type DocumentStreamStartOutput = {
  type: 'document_stream_start'
  edit_run_id: string
  document_id?: string | null
  mode: 'document' | 'selection'
  sequence: number
}

export type DocumentStreamChunkOutput = {
  type: 'document_stream_chunk'
  edit_run_id: string
  document_id?: string | null
  mode: 'document' | 'selection'
  sequence: number
  chunk: string
  is_final: boolean
}

export type DocumentStreamCompleteOutput = {
  type: 'document_stream_complete'
  edit_run_id: string
  document_id: string
  mode: 'document' | 'selection'
  sequence: number
  changed: boolean
  change_summary: string
}

export type DocumentStreamErrorOutput = {
  type: 'document_stream_error'
  edit_run_id: string
  document_id?: string | null
  mode?: 'document' | 'selection' | null
  sequence: number
  error_code: string
  message: string
}

/**
 * Cursor-style reasoning step. Emitted by the backend when the agent starts a
 * tool call (or a tool-internal sub-operation like a GraphQL generate / RAG
 * lookup). Patched later with a ReasoningStepUpdateOutput when it finishes.
 * Persists across the final `answer` — users can expand a step after the
 * turn completes to inspect what actually happened.
 */
export type ReasoningStepKind =
  | 'tool_call'
  | 'handoff'
  | 'graphql_generate'
  | 'graphql_execute'
  | 'internal_search'
  | 'rag_lookup'
  | 'thought'

export type ReasoningStepStatus = 'running' | 'done' | 'error'

export type ReasoningStepOutput = {
  type: 'reasoning_step'
  id: string
  parent_id?: string | null
  kind: ReasoningStepKind
  title: string
  status: ReasoningStepStatus
  args?: unknown
  result?: unknown
  error?: string | null
  started_at?: number | null
  ended_at?: number | null
  /**
   * Free-form assistant commentary captured for this step (the model
   * "thinking out loud" before deciding to call this tool). Populated
   * either inline by the backend or by `applyNarrationAttach` when a
   * streaming text bubble is reclassified as narration of this step.
   */
  narration?: string | null
}

/**
 * Patch for an existing ReasoningStepOutput (keyed by `id`). The frontend
 * shallow-merges any non-undefined fields into the previously-appended step.
 */
export type ReasoningStepUpdateOutput = {
  type: 'reasoning_step_update'
  id: string
  status?: ReasoningStepStatus
  args?: unknown
  result?: unknown
  error?: string | null
  ended_at?: number | null
  narration?: string | null
}

/**
 * Incremental assistant-message token for token-by-token rendering of the
 * final answer. `run_id` groups deltas belonging to the same streaming
 * bubble. The canonical `AnswerOutput` still arrives at turn-end and
 * replaces the streaming bubble with the structured payload.
 */
export type TextDeltaOutput = {
  type: 'text_delta'
  delta: string
  run_id?: string | null
}

/**
 * Sent by the backend when a streaming `answer` bubble is actually narration
 * of a reasoning step rather than the final answer. The hook locates the
 * streaming bubble whose `__runId` matches `text_item_id`, moves its text
 * into the matching step's `narration` field, and removes the bubble.
 *
 * This is what keeps the chat tidy when the agent "thinks out loud" between
 * tool calls — only the LAST surviving streaming bubble (the one with no
 * subsequent tool call) ends up displayed as the answer.
 */
export type NarrationAttachOutput = {
  type: 'narration_attach'
  text_item_id: string
  step_id: string
}

export type OutputItem =
  | AnswerOutput
  | ToolOutput
  | LoadingOutput
  | ErrorOutput
  | FlowProposalOutput
  | DocumentStreamStartOutput
  | DocumentStreamChunkOutput
  | DocumentStreamCompleteOutput
  | DocumentStreamErrorOutput
  | ReasoningStepOutput
  | ReasoningStepUpdateOutput
  | TextDeltaOutput
  | NarrationAttachOutput

export type ChatOutput = {
  items: OutputItem[]
}

export type ChatEndpointOutput = {
  sessionId: string
}

export type FileMeta = {
  id: string
  name: string
  size: number
  type: string
}

export type Mention = {
  id: string
  type: string
  display: string
  offsets?: { start: number; end: number }
  data?: any
}

// Legacy fallback for historical turns. New turns carry mention links directly in `text`.
export type UserTurn = { side: 'user'; text: string; files?: FileMeta[]; mentions?: Mention[] }
export type AgentTurn = { side: 'agent'; outputs: OutputItem[] }
export type ConversationTurn = UserTurn | AgentTurn

// Page context types for contextual AI assistance
export interface EntityPage {
  type: 'entity'
  entity_name: string
  id: string
}

export interface OverviewPage {
  type: 'overview'
  entity_name: string
}

export interface UnknownPage {
  type: 'unknown'
  url: string
}

export type CurrentPageContext = EntityPage | OverviewPage | UnknownPage
