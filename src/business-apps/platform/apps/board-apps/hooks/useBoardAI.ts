/** useBoardAI - AI features for boards (create, query, enrich, automate, data source analysis). */

import { useState, useCallback } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { BoardSheet, BoardColumn, BoardView, BoardGroup, DashboardWidget } from '../types'
import {
  BOARD_CREATOR_SYSTEM,
  BOARD_CREATOR_WITH_DATASOURCES_SYSTEM,
  WIDGET_SUGGEST_SYSTEM,
  MERGE_ANALYZER_SYSTEM,
  BOARD_QUERY_SYSTEM,
  DATA_SOURCE_ANALYZER_SYSTEM
} from './boardAIPrompts'

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
  /** 'primary' = main row data for the board; 'auxiliary' = populates select/dropdown columns */
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
    sampleRows: Record<string, unknown>[]
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

export function useBoardAI(accessToken: string): UseBoardAIReturn {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const promptClient = usePromptManagerClient(accessToken)

  const executePrompt = useCallback(
    async (systemPrompt: string, userPrompt: string): Promise<unknown | null> => {
      setIsProcessing(true)
      setError(null)

      try {
        let modelsResponse: { data?: Array<{ _id: string; name?: string }> }
        try {
          modelsResponse = await promptClient.getAiModels({ limit: 10, offset: 0, returnTotalRecords: false })
        } catch {
          throw new Error('AI service is not available. Make sure the Prompt Manager is running.')
        }
        if (!modelsResponse.data?.length)
          throw new Error('No AI models configured. Add a model in Prompt Manager first.')

        const model = modelsResponse.data.find(m => m.name?.toLowerCase().includes('gpt-4')) || modelsResponse.data[0]

        const formData = new FormData()
        formData.append('model_id', model._id)
        formData.append('system_content', systemPrompt)
        formData.append('user_content', userPrompt)
        formData.append('model_settings', JSON.stringify({}))

        let response: { content?: unknown }
        try {
          response = await promptClient.executePrompt(formData)
        } catch {
          throw new Error('AI prompt execution failed. Check Prompt Manager logs.')
        }
        if (!response.content) throw new Error('AI returned an empty response')

        const jsonStr = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
        const cleaned = jsonStr
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
        return JSON.parse(cleaned)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'AI request failed'
        setError(msg)
        return null
      } finally {
        setIsProcessing(false)
      }
    },
    [promptClient]
  )

  const createBoardFromPrompt = useCallback(
    async (
      prompt: string,
      includeSampleData = false,
      dataSources?: DataSourceSuggestion[]
    ): Promise<BoardAIPlan | null> => {
      const sampleDataInstr = includeSampleData
        ? ' Also include "sampleRows": an array of 10 realistic sample records whose keys match the column names.'
        : ''

      const hasDataSources = dataSources && dataSources.length > 0
      const systemPrompt = hasDataSources ? BOARD_CREATOR_WITH_DATASOURCES_SYSTEM : BOARD_CREATOR_SYSTEM

      let dataSourcesInstr = ''
      if (hasDataSources) {
        const primary = dataSources.find(ds => ds.role === 'primary')
        const auxiliary = dataSources.filter(ds => ds.role === 'auxiliary')
        const parts: string[] = []
        if (primary) {
          parts.push(
            `PRIMARY (rows): [${primary.entityType}] ${primary.purpose}\n  Fields: ${primary.suggestedFields.join(', ')}`
          )
        }
        for (const ds of auxiliary) {
          parts.push(
            `AUXILIARY (select options): [${ds.entityType}] -> column "${ds.targetColumn}" (sourceField: ${ds.sourceField})`
          )
        }
        dataSourcesInstr = `\n\nDATA SOURCES (create ONE sheet only):\n${parts.join('\n')}`
      }

      const result = await executePrompt(
        systemPrompt,
        `Create a board for: "${prompt}".${sampleDataInstr}${dataSourcesInstr} Return JSON with: { suggestedName, confidence, sheets: [{ name, columns: [{name,label,type,selectOptions?,isRequired?}], views: [{name,type,config}], groups?: [{name,colorToken?}] }]${includeSampleData ? ', sampleRows: [...]' : ''} }`
      )
      return result as BoardAIPlan | null
    },
    [executePrompt]
  )

  const queryBoardFromPrompt = useCallback(
    async (prompt: string, sheet: BoardSheet): Promise<BoardQueryPlan | null> => {
      const schemaDesc = sheet.columns.map(c => `${c.name} (${c.type})`).join(', ')
      const result = await executePrompt(
        BOARD_QUERY_SYSTEM,
        `Board columns: ${schemaDesc}\nUser query: "${prompt}"\nReturn JSON: { filters?, sorts?, groupBy?, viewName?, explanation }`
      )
      return result as BoardQueryPlan | null
    },
    [executePrompt]
  )

  const enrichColumn = useCallback(
    async (prompt: string, sheet: BoardSheet, columnId: string): Promise<EnrichmentPlan | null> => {
      const col = sheet.columns.find(c => c.id === columnId)
      const result = await executePrompt(
        'You help enrich board data. Suggest an enrichment operation for the given column and prompt. Return JSON: { targetColumn, operation, outputColumn?, explanation }',
        `Column: ${col?.name} (${col?.type}). Prompt: "${prompt}"`
      )
      return result as EnrichmentPlan | null
    },
    [executePrompt]
  )

  const generateAutomation = useCallback(
    async (prompt: string, sheet: BoardSheet): Promise<AutomationRecipe | null> => {
      const schemaDesc = sheet.columns.map(c => `${c.name} (${c.type})`).join(', ')
      const result = await executePrompt(
        'You create automation recipes for boards. Given columns and a prompt, return a JSON automation config: { name, trigger, actions: [{ type, config }], explanation }',
        `Board columns: ${schemaDesc}\nAutomation request: "${prompt}"`
      )
      return result as AutomationRecipe | null
    },
    [executePrompt]
  )

  const suggestWidgets = useCallback(
    async (
      columns: Array<{ name: string; type: string; label: string }>,
      sampleRows: Record<string, unknown>[]
    ): Promise<WidgetSuggestion | null> => {
      const schemaDesc = columns.map(c => `${c.name} (${c.type}, label: "${c.label}")`).join(', ')
      const sample = JSON.stringify(sampleRows.slice(0, 5))
      const result = await executePrompt(
        WIDGET_SUGGEST_SYSTEM,
        `Board columns: ${schemaDesc}\nSample rows: ${sample}\nSuggest 3-6 useful dashboard widgets. Return JSON: { widgets: [...], explanation }`
      )
      return result as WidgetSuggestion | null
    },
    [executePrompt]
  )

  const analyzeMerge = useCallback(
    async (
      existingColumns: Array<{ name: string; type: string; label: string }>,
      existingRowSample: Record<string, unknown>[],
      newEntityName: string,
      newFields: Array<{ key: string; label: string; type: string }>,
      newRecordSample: Record<string, unknown>[]
    ): Promise<MergePlan | null> => {
      const existingDesc = existingColumns.map(c => `${c.name} (${c.type})`).join(', ')
      const sampleRows = JSON.stringify(existingRowSample.slice(0, 3))
      const newDesc = newFields.map(f => `${f.key} (${f.type})`).join(', ')
      const newSample = JSON.stringify(newRecordSample.slice(0, 3))

      const result = await executePrompt(
        MERGE_ANALYZER_SYSTEM,
        `EXISTING BOARD:\nColumns: ${existingDesc}\nSample rows: ${sampleRows}\n\nNEW ENTITY: ${newEntityName}\nFields: ${newDesc}\nSample records: ${newSample}\n\nReturn JSON: { strategy, joinKey?, explanation, confidence, columnMapping? }`
      )
      return result as MergePlan | null
    },
    [executePrompt]
  )

  const analyzeDataSources = useCallback(
    async (prompt: string, registryCatalog: string): Promise<DataSourceAnalysis | null> => {
      const result = await executePrompt(
        DATA_SOURCE_ANALYZER_SYSTEM,
        `BOARD DESCRIPTION: "${prompt}"\n\nAVAILABLE DATA SOURCES:\n${registryCatalog}\n\nAnalyze which data sources are relevant and return JSON: { suggestions: [...], summary: "..." }`
      )
      return result as DataSourceAnalysis | null
    },
    [executePrompt]
  )

  const reset = useCallback(() => {
    setIsProcessing(false)
    setError(null)
  }, [])

  return {
    isProcessing,
    error,
    createBoardFromPrompt,
    queryBoardFromPrompt,
    enrichColumn,
    generateAutomation,
    suggestWidgets,
    analyzeMerge,
    analyzeDataSources,
    reset
  }
}
