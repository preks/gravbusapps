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

/** A chart segment/category that, when clicked, re-queries GraphQL with overrides. */
export type QueryDrilldown = {
  matchValue: string
  variables: Record<string, unknown>
  title?: string
}

/** Reusable, read-only GraphQL query embedded in chart/table payloads so the
 * frontend can paginate, filter, or drill down by re-querying GraphQL directly
 * instead of calling the agent again. */
export type DataQuerySpec = {
  type?: 'dataQuerySpec'
  query: string
  variables: Record<string, unknown>
  rowsPath?: string | null
  pageSize?: number
  totalCount?: number | null
  limitVar?: string | null
  offsetVar?: string | null
  orderByVar?: string | null
  drilldowns?: QueryDrilldown[]
}

export type BarGraphData = {
  type: 'bar'
  series: BarSeries[]
  title: string
  description: string
  querySpec?: DataQuerySpec | null
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
  querySpec?: DataQuerySpec | null
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
  querySpec?: DataQuerySpec | null
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
  querySpec?: DataQuerySpec | null
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
  querySpec?: DataQuerySpec | null
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

export type InteractiveTableDataType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'enum'
  | 'chip'
  | 'chip_list'
  | 'currency'

export type ChipCellValue = {
  id: string
  label: string
}

export type CurrencyCellValue = {
  value: number
  unit: string
}

export type InteractiveTableColumn = {
  id: string
  header: string
  dataType: InteractiveTableDataType
  entityType?: string
  sortable?: boolean
  filterable?: boolean
  width?: number
  align?: 'left' | 'right' | 'center'
}

export type InteractiveTableDefaultSort = {
  columnId: string
  direction: 'asc' | 'desc'
}

export type InteractiveTableData = {
  type: 'interactiveTable'
  title: string
  description?: string
  columns: InteractiveTableColumn[]
  rows: Array<Record<string, string | number | boolean | ChipCellValue | ChipCellValue[] | CurrencyCellValue | null>>
  defaultSort?: InteractiveTableDefaultSort
  rowEntityType?: string
  rowEntityIdColumn?: string
  totalCount?: number | null
  querySpec?: DataQuerySpec | null
}

export type DisplayData =
  | TextBlockData
  | TableData
  | InteractiveTableData
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
  session_id?: string
  run_id?: string
  message_id?: string
  flowbot_endpoint?: string
  error_message?: string
  user_description?: string
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
  /**
   * Friendly headline shown in non-technical mode (e.g. "Picking the
   * right tool for the task"). When absent, the renderer falls back to a
   * kind-level label so users never see raw `snake_case` tool names.
   */
  user_facing_title?: string | null
  /**
   * Friendly one-liner description (e.g. `Looking for "Mike's team"`).
   * Preferred over `narration` / `args.reason` in non-technical mode.
   */
  user_facing_summary?: string | null
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
  user_facing_title?: string | null
  user_facing_summary?: string | null
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

export type WebSearchPermissionRequestOutput = {
  type: 'web_search_permission_request'
  request_id: string
  reason?: string | null
  title?: string
  message?: string
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

/**
 * Status of a single item in the agent's plan / to-do list. Mirrors
 * deepagents' TodoListMiddleware state and the backend
 * AgentPlanItemStatus literal.
 */
export type AgentPlanItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export type AgentPlanItem = {
  id: string
  content: string
  status: AgentPlanItemStatus
}

/**
 * First snapshot of the agent's plan for the current turn. Frontend creates
 * one AgentPlanPanel per turn keyed by `id`; subsequent
 * AgentPlanUpdateOutput events refresh the checklist in place.
 */
export type AgentPlanOutput = {
  type: 'agent_plan'
  id: string
  items: AgentPlanItem[]
}

/**
 * Full-snapshot update of the agent plan emitted on every `write_todos`
 * call. Items array is the new full snapshot, not a delta.
 */
export type AgentPlanUpdateOutput = {
  type: 'agent_plan_update'
  id: string
  items: AgentPlanItem[]
}

/**
 * Field type for ClarificationQuestionItem. Mirrors the JSON-schema dialect
 * used by FlowProposal forms so SchemaField can render either kind.
 */
export type ClarificationFieldType = 'STRING' | 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'SELECT' | 'MULTISELECT'

/**
 * One question rendered inline in the chat as part of a clarification form.
 * The user's answer is keyed by `id` when posted back via `/v2/chat`.
 */
export type ClarificationQuestionItem = {
  id: string
  label: string
  field?: ClarificationFieldType
  options?: string[] | null
  default?: unknown
}

/**
 * Inline clarification form emitted when the agent calls the
 * `ask_clarifications` tool (which wraps LangGraph's `interrupt()`). The
 * frontend renders one ClarificationFormDisplay per output keyed by `id`
 * (the LangGraph interrupt id). On submit the answers are POSTed back to
 * `/v2/chat` with `user_input_text` set to a JSON string of shape:
 *
 *   { action: 'clarification_response', interrupt_id, data: { ...answers } }
 *
 * On cancel the action is `clarification_cancel` with the same interrupt_id.
 */
export type ClarificationRequestOutput = {
  type: 'clarification_request'
  id: string
  purpose: string
  questions: ClarificationQuestionItem[]
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
  | WebSearchPermissionRequestOutput
  | NarrationAttachOutput
  | AgentPlanOutput
  | AgentPlanUpdateOutput
  | ClarificationRequestOutput

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
