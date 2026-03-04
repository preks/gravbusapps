/**
 * useSpreadsheetAI Hook
 *
 * Handles AI-powered analysis of spreadsheet data using the Prompt Manager.
 * Detects column types, relationships, and suggests app structure.
 */

import { useState, useCallback } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import {
  SPREADSHEET_ANALYZER_SYSTEM_PROMPT,
  SPREADSHEET_ANALYZER_USER_PROMPT,
  formatSheetDataForPrompt
} from '../prompts/spreadsheet-analyzer'
import type {
  ParsedExcelFile,
  SpreadsheetAnalysis,
  SheetAnalysis,
  ColumnAnalysis,
  ColumnType,
  SuggestedView,
  SheetRelationship,
  ViewConfig,
  TableViewConfig,
  DashboardViewConfig,
  KanbanViewConfig
} from '../types'

export interface UseSpreadsheetAIState {
  isAnalyzing: boolean
  error: string | null
  analysis: SpreadsheetAnalysis | null
  progress: number
}

export interface UseSpreadsheetAIResult extends UseSpreadsheetAIState {
  analyzeSpreadsheet: (parsedFile: ParsedExcelFile) => Promise<SpreadsheetAnalysis | null>
  reset: () => void
}

/**
 * Hook for AI-powered spreadsheet analysis
 */
export function useSpreadsheetAI(accessToken: string): UseSpreadsheetAIResult {
  const [state, setState] = useState<UseSpreadsheetAIState>({
    isAnalyzing: false,
    error: null,
    analysis: null,
    progress: 0
  })

  const promptClient = usePromptManagerClient(accessToken)

  /**
   * Analyze a parsed Excel file using AI
   */
  const analyzeSpreadsheet = useCallback(
    async (parsedFile: ParsedExcelFile): Promise<SpreadsheetAnalysis | null> => {
      setState(prev => ({ ...prev, isAnalyzing: true, error: null, progress: 0 }))

      try {
        setState(prev => ({ ...prev, progress: 10 }))

        // Format sheet data for the prompt
        const sheetData = formatSheetDataForPrompt(
          parsedFile.sheets.map(sheet => ({
            name: sheet.name,
            columns: sheet.columns,
            rowCount: sheet.rowCount
          }))
        )

        setState(prev => ({ ...prev, progress: 20 }))

        // Build the user prompt
        const userPrompt = SPREADSHEET_ANALYZER_USER_PROMPT.replace('{fileName}', parsedFile.fileName)
          .replace('{sheetCount}', String(parsedFile.sheets.length))
          .replace('{sheetData}', sheetData)

        setState(prev => ({ ...prev, progress: 30 }))

        // Get available AI models - catch API key errors here
        let modelsResponse
        try {
          modelsResponse = await promptClient.getAiModels({
            limit: 10,
            offset: 0,
            returnTotalRecords: false
          })
        } catch (modelsError) {
          // If we can't get models (e.g., API key issue), skip AI and use local analysis
          console.warn('Failed to get AI models, using local analysis:', modelsError)
          throw new Error('AI service unavailable, using local analysis')
        }

        if (!modelsResponse.data || modelsResponse.data.length === 0) {
          throw new Error('No AI models available. Using local analysis.')
        }

        // Preferred model ID for spreadsheet analysis
        const PREFERRED_MODEL_ID = '6799beda3544ce9d4dfaa322'

        // Try to find the preferred model, otherwise fall back to GPT-4 or first available
        const preferredModel = modelsResponse.data.find(m => m._id === PREFERRED_MODEL_ID)
        const gpt4Model = modelsResponse.data.find(m => m.name.toLowerCase().includes('gpt-4'))
        const selectedModel = preferredModel || gpt4Model || modelsResponse.data[0]
        const modelId = selectedModel._id

        setState(prev => ({ ...prev, progress: 40 }))

        // Execute the AI prompt - catch API key errors here too
        // Note: We don't include response_format in model_settings because we're not providing a response_schema.
        // The backend will return text/JSON which we'll parse ourselves.
        const formData = new FormData()
        formData.append('model_id', modelId)
        formData.append('system_content', SPREADSHEET_ANALYZER_SYSTEM_PROMPT)
        formData.append('user_content', userPrompt)
        formData.append('model_settings', JSON.stringify({}))

        setState(prev => ({ ...prev, progress: 50 }))

        let response
        try {
          response = await promptClient.executePrompt(formData)
        } catch (executeError: any) {
          // Catch API key errors and other execution errors
          // Check if it's an API key/project access error
          const errorMessage = executeError?.message || String(executeError)
          const isApiKeyError =
            errorMessage.includes('API key') ||
            errorMessage.includes('invalid_project') ||
            errorMessage.includes('401') ||
            errorMessage.includes('You do not have access')

          if (isApiKeyError) {
            // API key error - this is a backend configuration issue
            // The AI model's API key needs to be configured with correct project access
            console.warn('AI service unavailable: API key configuration issue. Using local analysis as fallback.')
            console.warn(
              'To enable AI analysis, configure the AI model API key with correct project access in prompt-manager.'
            )
          } else {
            console.warn('Failed to execute AI prompt, using local analysis:', executeError)
          }
          throw new Error('AI execution failed, using local analysis')
        }

        setState(prev => ({ ...prev, progress: 70 }))

        if (!response.content) {
          throw new Error('No response from AI')
        }

        // Parse the AI response
        let aiAnalysis: any
        try {
          aiAnalysis = typeof response.content === 'string' ? JSON.parse(response.content) : response.content
        } catch {
          console.error('Failed to parse AI response:', response.content)
          throw new Error('Failed to parse AI analysis. Using fallback analysis.')
        }

        setState(prev => ({ ...prev, progress: 80 }))

        // Transform AI response to our types
        const analysis = transformAIResponse(aiAnalysis, parsedFile)

        setState(prev => ({ ...prev, progress: 90 }))

        // Validate and enhance with local inference
        const enhancedAnalysis = enhanceWithLocalInference(analysis, parsedFile)

        setState(prev => ({
          ...prev,
          isAnalyzing: false,
          analysis: enhancedAnalysis,
          progress: 100
        }))

        return enhancedAnalysis
      } catch (error: any) {
        // Check if this is an API key error - if so, log less verbosely
        const errorMessage = error?.message || String(error)
        const isApiKeyError =
          errorMessage.includes('API key') ||
          errorMessage.includes('invalid_project') ||
          errorMessage.includes('401') ||
          errorMessage.includes('You do not have access') ||
          errorMessage.includes('AI service unavailable') ||
          errorMessage.includes('AI execution failed')

        if (isApiKeyError) {
          // Silently fall back for API key errors - this is expected in some environments
          // Expected in environments without AI credentials; fallback remains fully functional.
        } else {
          console.warn('AI analysis failed, using local analysis:', error)
        }

        // Always fall back to local inference - AI is optional
        try {
          setState(prev => ({ ...prev, progress: 60 }))
          const fallbackAnalysis = performLocalAnalysis(parsedFile)
          setState(prev => ({
            ...prev,
            isAnalyzing: false,
            analysis: fallbackAnalysis,
            // Show a friendly message, not the technical error
            error: null, // Clear error - local analysis worked fine
            progress: 100
          }))
          return fallbackAnalysis
        } catch (fallbackError) {
          console.error('Local analysis also failed:', fallbackError)
          setState(prev => ({
            ...prev,
            isAnalyzing: false,
            error: 'Analysis failed. Please try again or upload a different file.',
            progress: 0
          }))
          return null
        }
      }
    },
    [promptClient]
  )

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      isAnalyzing: false,
      error: null,
      analysis: null,
      progress: 0
    })
  }, [])

  return {
    ...state,
    analyzeSpreadsheet,
    reset
  }
}

/**
 * Transform AI response to our SpreadsheetAnalysis type
 */
function transformAIResponse(aiResponse: any, parsedFile: ParsedExcelFile): SpreadsheetAnalysis {
  const sheets: SheetAnalysis[] = (aiResponse.sheets || []).map((sheet: any) => {
    const columns: ColumnAnalysis[] = (sheet.columns || []).map((col: any) => ({
      name: col.name || 'Unknown',
      detectedType: validateColumnType(col.detectedType),
      isRequired: col.isRequired ?? false,
      isUnique: col.isUnique ?? false,
      sampleValues: col.sampleValues || [],
      selectOptions: col.selectOptions,
      formula: col.formula,
      description: col.description,
      validation: col.validation
    }))

    const suggestedViews: SuggestedView[] = (sheet.suggestedViews || []).map((view: any) => ({
      type: validateViewType(view.type),
      name: view.name || 'Default View',
      description: view.description || '',
      config: transformViewConfig(view.config, view.type)
    }))

    return {
      name: sheet.name || 'Sheet',
      purpose: sheet.purpose || 'Data storage',
      columns,
      suggestedViews: suggestedViews.length > 0 ? suggestedViews : getDefaultViews(columns),
      primaryKeyColumn: sheet.primaryKeyColumn,
      isLookupTable: sheet.isLookupTable ?? false
    }
  })

  const relationships: SheetRelationship[] = (aiResponse.relationships || []).map((rel: any) => ({
    fromSheet: rel.fromSheet || '',
    fromColumn: rel.fromColumn || '',
    toSheet: rel.toSheet || '',
    toColumn: rel.toColumn || '',
    type: rel.type || 'one-to-many'
  }))

  return {
    sheets,
    relationships,
    suggestedAppType: validateAppType(aiResponse.suggestedAppType),
    suggestedAppName: aiResponse.suggestedAppName || parsedFile.fileName.replace(/\.[^.]+$/, ''),
    confidence: Math.min(Math.max(aiResponse.confidence || 0.5, 0), 1)
  }
}

/**
 * Validate column type
 */
function validateColumnType(type: string): ColumnType {
  const validTypes: ColumnType[] = [
    'text',
    'number',
    'currency',
    'percentage',
    'date',
    'datetime',
    'email',
    'phone',
    'url',
    'select',
    'multiselect',
    'boolean',
    'calculated',
    'reference'
  ]
  return validTypes.includes(type as ColumnType) ? (type as ColumnType) : 'text'
}

/**
 * Validate view type
 */
function validateViewType(type: string): 'table' | 'form' | 'dashboard' | 'kanban' | 'calendar' {
  const validTypes = ['table', 'form', 'dashboard', 'kanban', 'calendar']
  return validTypes.includes(type) ? (type as any) : 'table'
}

/**
 * Validate app type
 */
function validateAppType(type: string): 'data_grid' | 'form_table' | 'dashboard' | 'mixed' {
  const validTypes = ['data_grid', 'form_table', 'dashboard', 'mixed']
  return validTypes.includes(type) ? (type as any) : 'data_grid'
}

/**
 * Transform view config from AI response
 */
function transformViewConfig(config: any, viewType: string): ViewConfig {
  switch (viewType) {
    case 'table':
      return {
        type: 'table',
        columns: config?.columns || [],
        sortBy: config?.sortBy,
        sortOrder: config?.sortOrder,
        groupBy: config?.groupBy,
        filters: config?.filters
      } as TableViewConfig

    case 'dashboard':
      return {
        type: 'dashboard',
        widgets: config?.widgets || []
      } as DashboardViewConfig

    case 'kanban':
      return {
        type: 'kanban',
        statusColumn: config?.statusColumn || '',
        titleColumn: config?.titleColumn || '',
        descriptionColumn: config?.descriptionColumn
      } as KanbanViewConfig

    case 'calendar':
      return {
        type: 'calendar',
        dateColumn: config?.dateColumn || '',
        titleColumn: config?.titleColumn || '',
        endDateColumn: config?.endDateColumn
      }

    case 'form':
    default:
      return {
        type: 'form',
        fields: config?.fields || [],
        layout: config?.layout || 'single'
      }
  }
}

/**
 * Get default views for a sheet
 */
function getDefaultViews(columns: ColumnAnalysis[]): SuggestedView[] {
  const views: SuggestedView[] = [
    {
      type: 'table',
      name: 'Table View',
      description: 'View and edit all data in a table format',
      config: {
        type: 'table',
        columns: columns.map(c => c.name)
      }
    }
  ]

  // Add form view if there are editable fields
  if (columns.length <= 15) {
    views.push({
      type: 'form',
      name: 'Form View',
      description: 'Add and edit records using a form',
      config: {
        type: 'form',
        fields: columns.map(c => c.name),
        layout: columns.length > 6 ? 'two-column' : 'single'
      }
    })
  }

  // Check for status-like columns for Kanban
  const statusColumn = columns.find(
    c =>
      c.detectedType === 'select' &&
      (c.name.toLowerCase().includes('status') ||
        c.name.toLowerCase().includes('stage') ||
        c.name.toLowerCase().includes('state'))
  )

  if (statusColumn) {
    const titleColumn = columns.find(
      c =>
        c.name.toLowerCase().includes('name') ||
        c.name.toLowerCase().includes('title') ||
        c.name.toLowerCase().includes('subject')
    )

    if (titleColumn) {
      views.push({
        type: 'kanban',
        name: 'Kanban Board',
        description: `Visualize by ${statusColumn.name}`,
        config: {
          type: 'kanban',
          statusColumn: statusColumn.name,
          titleColumn: titleColumn.name
        }
      })
    }
  }

  // Check for numeric columns for Dashboard
  const numericColumns = columns.filter(
    c => c.detectedType === 'number' || c.detectedType === 'currency' || c.detectedType === 'percentage'
  )

  if (numericColumns.length >= 2) {
    views.push({
      type: 'dashboard',
      name: 'Dashboard',
      description: 'Visualize key metrics and trends',
      config: {
        type: 'dashboard',
        widgets: numericColumns.slice(0, 4).map(col => ({
          type: 'kpi',
          title: col.name,
          config: {
            type: 'kpi',
            column: col.name,
            aggregation: 'sum',
            format: col.detectedType === 'currency' ? 'currency' : 'number'
          }
        }))
      }
    })
  }

  return views
}

/**
 * Enhance AI analysis with local inference
 */
function enhanceWithLocalInference(analysis: SpreadsheetAnalysis, parsedFile: ParsedExcelFile): SpreadsheetAnalysis {
  // Ensure each sheet has sample values from the parsed file
  const enhancedSheets = analysis.sheets.map((sheet, sheetIndex) => {
    const parsedSheet = parsedFile.sheets[sheetIndex]

    if (!parsedSheet) return sheet

    const enhancedColumns = sheet.columns.map(col => {
      const parsedColumn = parsedSheet.columns.find(c => c.name === col.name)

      return {
        ...col,
        sampleValues: col.sampleValues.length > 0 ? col.sampleValues : parsedColumn?.sampleValues || []
      }
    })

    return {
      ...sheet,
      columns: enhancedColumns
    }
  })

  return {
    ...analysis,
    sheets: enhancedSheets
  }
}

/**
 * Perform local analysis without AI (fallback)
 */
function performLocalAnalysis(parsedFile: ParsedExcelFile): SpreadsheetAnalysis {
  const sheets: SheetAnalysis[] = parsedFile.sheets.map(sheet => {
    const columns: ColumnAnalysis[] = sheet.columns.map(col => ({
      name: col.name,
      detectedType: inferColumnTypeLocally(col.name, col.sampleValues),
      isRequired: false,
      isUnique: isLikelyUnique(col.sampleValues),
      sampleValues: col.sampleValues,
      selectOptions: getSelectOptions(col.sampleValues),
      formula: col.formula
    }))

    return {
      name: sheet.name,
      purpose: inferSheetPurpose(sheet.name, columns),
      columns,
      suggestedViews: getDefaultViews(columns),
      primaryKeyColumn: findPrimaryKey(columns),
      isLookupTable: isLikelyLookupTable(sheet.rowCount, columns)
    }
  })

  // Detect relationships
  const relationships = detectRelationships(sheets)

  return {
    sheets,
    relationships,
    suggestedAppType: determineBestAppType(sheets),
    suggestedAppName: parsedFile.fileName.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '),
    confidence: 0.6 // Lower confidence for local analysis
  }
}

/**
 * Infer column type locally based on name and values
 */
function inferColumnTypeLocally(name: string, sampleValues: unknown[]): ColumnType {
  const nameLower = name.toLowerCase()

  // Check name patterns
  if (nameLower.includes('email')) return 'email'
  if (nameLower.includes('phone') || nameLower.includes('tel')) return 'phone'
  if (nameLower.includes('url') || nameLower.includes('website') || nameLower.includes('link')) return 'url'
  if (
    nameLower.includes('date') ||
    nameLower.includes('time') ||
    nameLower.includes('created') ||
    nameLower.includes('updated')
  )
    return 'date'
  if (
    nameLower.includes('price') ||
    nameLower.includes('cost') ||
    nameLower.includes('amount') ||
    nameLower.includes('total')
  )
    return 'currency'
  if (nameLower.includes('percent') || nameLower.includes('rate') || nameLower.includes('ratio')) return 'percentage'
  if (
    nameLower.includes('status') ||
    nameLower.includes('stage') ||
    nameLower.includes('type') ||
    nameLower.includes('category')
  )
    return 'select'

  // Check sample values
  const nonNullValues = sampleValues.filter(v => v !== null && v !== undefined && v !== '')

  if (nonNullValues.length === 0) return 'text'

  // Check for numbers
  const allNumbers = nonNullValues.every(v => !isNaN(Number(v)))
  if (allNumbers) return 'number'

  // Check for booleans
  const boolValues = ['true', 'false', 'yes', 'no', '1', '0']
  const allBooleans = nonNullValues.every(v => boolValues.includes(String(v).toLowerCase()))
  if (allBooleans) return 'boolean'

  // Check for emails
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const allEmails = nonNullValues.every(v => emailPattern.test(String(v)))
  if (allEmails) return 'email'

  // Check for select (limited unique values)
  const uniqueCount = new Set(nonNullValues.map(String)).size
  if (uniqueCount <= 15 && uniqueCount < nonNullValues.length * 0.5) {
    return 'select'
  }

  return 'text'
}

/**
 * Check if values are likely unique
 */
function isLikelyUnique(sampleValues: unknown[]): boolean {
  const nonNullValues = sampleValues.filter(v => v !== null && v !== undefined && v !== '')
  const uniqueCount = new Set(nonNullValues.map(String)).size
  return uniqueCount === nonNullValues.length && nonNullValues.length > 3
}

/**
 * Get select options from sample values
 */
function getSelectOptions(sampleValues: unknown[]): string[] | undefined {
  const nonNullValues = sampleValues.filter(v => v !== null && v !== undefined && v !== '')
  const uniqueValues = Array.from(new Set(nonNullValues.map(String)))

  if (uniqueValues.length > 0 && uniqueValues.length <= 20) {
    return uniqueValues.sort((a, b) => a.localeCompare(b))
  }

  return undefined
}

/**
 * Infer sheet purpose from name and columns
 */
function inferSheetPurpose(name: string, columns: ColumnAnalysis[]): string {
  const nameLower = name.toLowerCase()
  const columnNames = columns.map(c => c.name.toLowerCase()).join(' ')

  if (nameLower.includes('sale') || columnNames.includes('revenue') || columnNames.includes('deal')) {
    return 'Sales Pipeline or Revenue Tracking'
  }
  if (nameLower.includes('expense') || columnNames.includes('expense') || columnNames.includes('cost')) {
    return 'Expense Tracking'
  }
  if (nameLower.includes('employee') || columnNames.includes('employee') || columnNames.includes('staff')) {
    return 'Employee Directory'
  }
  if (nameLower.includes('project') || columnNames.includes('project') || columnNames.includes('task')) {
    return 'Project Management'
  }
  if (nameLower.includes('inventory') || columnNames.includes('stock') || columnNames.includes('quantity')) {
    return 'Inventory Management'
  }
  if (nameLower.includes('contact') || columnNames.includes('contact') || columnNames.includes('customer')) {
    return 'Contact Management'
  }

  return 'Data Management'
}

/**
 * Find likely primary key column
 */
function findPrimaryKey(columns: ColumnAnalysis[]): string | undefined {
  // Look for ID columns
  const idColumn = columns.find(
    c => c.name.toLowerCase() === 'id' || c.name.toLowerCase().endsWith('_id') || c.name.toLowerCase().endsWith('id')
  )

  if (idColumn && idColumn.isUnique) {
    return idColumn.name
  }

  // Look for any unique column
  const uniqueColumn = columns.find(c => c.isUnique)
  return uniqueColumn?.name
}

/**
 * Check if sheet is likely a lookup table
 */
function isLikelyLookupTable(rowCount: number, columns: ColumnAnalysis[]): boolean {
  return rowCount <= 50 && columns.length <= 5
}

/**
 * Detect relationships between sheets
 */
function detectRelationships(sheets: SheetAnalysis[]): SheetRelationship[] {
  const relationships: SheetRelationship[] = []

  for (const sheet of sheets) {
    for (const col of sheet.columns) {
      // Look for foreign key patterns
      if (col.name.toLowerCase().endsWith('_id') || col.name.toLowerCase().endsWith('id')) {
        const refTableName = col.name.toLowerCase().replace(/_?id$/i, '').replace(/_/g, '')

        // Find matching sheet
        const refSheet = sheets.find(
          s =>
            s.name.toLowerCase().replace(/[_\s]/g, '') === refTableName || s.name.toLowerCase().includes(refTableName)
        )

        if (refSheet && refSheet.name !== sheet.name) {
          relationships.push({
            fromSheet: sheet.name,
            fromColumn: col.name,
            toSheet: refSheet.name,
            toColumn: refSheet.primaryKeyColumn || 'id',
            type: 'one-to-many'
          })
        }
      }
    }
  }

  return relationships
}

/**
 * Determine best app type based on sheet structure
 */
function determineBestAppType(sheets: SheetAnalysis[]): 'data_grid' | 'form_table' | 'dashboard' | 'mixed' {
  if (sheets.length === 0) return 'data_grid'

  const hasNumericColumns = sheets.some(s =>
    s.columns.some(c => ['number', 'currency', 'percentage'].includes(c.detectedType))
  )

  if (sheets.length === 1) {
    if (hasNumericColumns && sheets[0].columns.length > 5) {
      return 'dashboard'
    }
    if (sheets[0].columns.length <= 10) {
      return 'form_table'
    }
    return 'data_grid'
  }

  return 'mixed'
}
