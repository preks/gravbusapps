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
  text_full?: string | null
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
  view: 'year' | 'month' | 'week'
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

export type { TeamAvailabilityData } from '../components/displays/team-availability'
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
  | TeamAvailabilityData

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
}

export type OutputItem = AnswerOutput | ToolOutput | LoadingOutput | ErrorOutput | FlowProposalOutput

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
