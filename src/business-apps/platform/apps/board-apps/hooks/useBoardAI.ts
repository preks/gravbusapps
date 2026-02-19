/**
 * useBoardAI - AI-first features for boards.
 *
 * Uses Prompt Manager for:
 * 1. AI create-board: prompt -> schema + views + groups + automations
 * 2. AI query-board: NL -> filter/sort/group plan (preview before apply)
 * 3. AI enrichment: categorize/extract/summarize columns
 * 4. AI automation recipes: NL -> automation config (validate before save)
 */

import { useState, useCallback } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { BoardSheet, BoardColumn, BoardView, BoardGroup } from '../types'

export interface BoardAIPlan {
  sheets: Array<{
    name: string
    columns: Partial<BoardColumn>[]
    views: Partial<BoardView>[]
    groups?: Partial<BoardGroup>[]
  }>
  suggestedName: string
  confidence: number
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
  /** For populateOptions: which existing column to populate, and which imported field to use */
  populateConfig?: { targetColumn: string; sourceField: string }
  explanation: string
  confidence: number
  columnMapping?: Array<{ from: string; to: string; action: 'map' | 'new' }>
}

export interface UseBoardAIReturn {
  isProcessing: boolean
  error: string | null
  createBoardFromPrompt: (prompt: string) => Promise<BoardAIPlan | null>
  queryBoardFromPrompt: (prompt: string, sheet: BoardSheet) => Promise<BoardQueryPlan | null>
  enrichColumn: (prompt: string, sheet: BoardSheet, columnId: string) => Promise<EnrichmentPlan | null>
  generateAutomation: (prompt: string, sheet: BoardSheet) => Promise<AutomationRecipe | null>
  analyzeMerge: (
    existingColumns: Array<{ name: string; type: string; label: string }>,
    existingRowSample: Record<string, unknown>[],
    newEntityName: string,
    newFields: Array<{ key: string; label: string; type: string }>,
    newRecordSample: Record<string, unknown>[]
  ) => Promise<MergePlan | null>
  reset: () => void
}

const BOARD_CREATOR_SYSTEM = `You are an expert at creating structured board schemas from natural language descriptions.
Given a user prompt, produce a JSON board plan with sheets, columns (typed), views, and optional groups.
Column types: text, number, currency, percentage, date, datetime, email, phone, url, select, multiselect,
boolean, status, people, attachment, relation, formula, progress, tags, rating, timeline, link, button.
Status/select columns must include selectOptions with value, label, and colorToken (use design tokens: primary, success, info, warning, destructive, muted).
Always include at least one table view. Add kanban if there's a status column. Add calendar if there are date columns.
Return valid JSON only.`

const MERGE_ANALYZER_SYSTEM = `You analyze how two datasets should be combined in a board/spreadsheet.
Given an existing board schema (columns + sample rows) and a new incoming entity (fields + sample records),
decide the best merge strategy:
- "addRows": The new data represents the same kind of records. Add them as new rows, creating any missing columns.
- "addColumns": The new data enriches existing rows. Match via a join key and add new fields as columns.
- "hybrid": Some records match existing rows (enrich), others are new (add as rows).
If "addColumns" or "hybrid", identify the join key: which existing column matches which new field (e.g. existing "id" = new "employeeId").
Also map new fields to suggest column names.
Return valid JSON only: { strategy, joinKey?: { existingColumn, newColumn }, explanation, confidence (0-1), columnMapping?: [{ from, to, action }] }`

const BOARD_QUERY_SYSTEM = `You are an expert at translating natural language queries into structured board query plans.
Given a user question and the board schema, produce a JSON query plan with filters, sorts, groupBy, and an explanation.
Use column names from the schema. Filter operators: equals, not_equals, contains, greater, less, is_empty, is_not_empty, in.
Return valid JSON only.`

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
    async (prompt: string): Promise<BoardAIPlan | null> => {
      const result = await executePrompt(
        BOARD_CREATOR_SYSTEM,
        `Create a board for: "${prompt}". Return JSON with: { suggestedName, confidence, sheets: [{ name, columns: [{name,label,type,selectOptions?,isRequired?}], views: [{name,type,config}], groups?: [{name,colorToken?}] }] }`
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
    analyzeMerge,
    reset
  }
}
