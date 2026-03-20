/**
 * Type definitions for Board AI features.
 * Extracted from useBoardAI to keep files under 300 lines.
 */

import type { BoardSheet, BoardColumn, BoardView, BoardGroup, DashboardWidget } from '../types'
import type { DataProfile } from '../types/analytics'

export interface BoardAIPlan {
  sheets: Array<{
    name: string
    columns: Partial<BoardColumn>[]
    views: Partial<BoardView>[]
    groups?: Partial<BoardGroup>[]
  }>
  suggestedName: string
  confidence: number
  sampleRows?: Record<string, unknown>[]
}

export interface WidgetSuggestion {
  widgets: Array<Partial<DashboardWidget>>
  explanation: string
}

export interface BoardQueryPlan {
  filters?: Array<{ column: string; operator: string; value: unknown }>
  sorts?: Array<{ column: string; direction: 'asc' | 'desc' }>
  groupBy?: string
  viewName?: string
  explanation: string
}

export interface EnrichmentPlan {
  targetColumn: string
  operation: 'categorize' | 'extract' | 'summarize' | 'normalize' | 'dedupe'
  outputColumn?: string
  explanation: string
}

export interface AutomationRecipe {
  name: string
  trigger: string
  actions: Array<{ type: string; config: Record<string, unknown> }>
  explanation: string
}

export interface MergePlan {
  strategy: 'addRows' | 'addColumns' | 'hybrid' | 'populateOptions'
  joinKey?: { existingColumn: string; newColumn: string }
  populateConfig?: { targetColumn: string; sourceField: string }
  explanation: string
  confidence: number
  columnMapping?: Array<{ from: string; to: string; action: 'map' | 'new' }>
}

export interface DataSourceSuggestion {
  entityType: string
  purpose: string
  importMode: 'rows' | 'selectOptions'
  role: 'primary' | 'auxiliary'
  suggestedFields: string[]
  targetColumn?: string
  sourceField?: string
  confidence: number
  explanation: string
}

export interface DataSourceAnalysis {
  suggestions: DataSourceSuggestion[]
  summary: string
}

export interface UseBoardAIReturn {
  isProcessing: boolean
  error: string | null
  createBoardFromPrompt: (
    prompt: string,
    includeSampleData?: boolean,
    dataSources?: DataSourceSuggestion[]
  ) => Promise<BoardAIPlan | null>
  queryBoardFromPrompt: (prompt: string, sheet: BoardSheet) => Promise<BoardQueryPlan | null>
  enrichColumn: (prompt: string, sheet: BoardSheet, columnId: string) => Promise<EnrichmentPlan | null>
  generateAutomation: (prompt: string, sheet: BoardSheet) => Promise<AutomationRecipe | null>
  suggestWidgets: (
    columns: Array<{ name: string; type: string; label: string }>,
    sampleRows: Record<string, unknown>[],
    profile?: DataProfile
  ) => Promise<WidgetSuggestion | null>
  askDashboardQuestion: (
    question: string,
    columns: Array<{ name: string; type: string; label: string }>,
    profile: DataProfile
  ) => Promise<WidgetSuggestion | null>
  analyzeMerge: (
    existingColumns: Array<{ name: string; type: string; label: string }>,
    existingRowSample: Record<string, unknown>[],
    newEntityName: string,
    newFields: Array<{ key: string; label: string; type: string }>,
    newRecordSample: Record<string, unknown>[]
  ) => Promise<MergePlan | null>
  analyzeDataSources: (prompt: string, registryCatalog: string) => Promise<DataSourceAnalysis | null>
  reset: () => void
}
