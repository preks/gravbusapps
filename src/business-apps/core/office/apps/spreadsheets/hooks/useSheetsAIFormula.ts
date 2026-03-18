import { useCallback, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { SpreadsheetColumn } from '../types'
import { evaluateFormula } from '../utils/formulaEvaluator'
import { expandFormulaFullColumnRanges } from '../utils/formulaRangeUtils'
import {
  SHEETS_AI_FORMULA_SYSTEM_PROMPT,
  buildSheetsAIFormulaUserPrompt,
  parseSheetsAIFormulaResponse
} from '../prompts/sheets-ai-formula'

const PREFERRED_MODEL_ID = '6799beda3544ce9d4dfaa322'

export interface UseSheetsAIFormulaParams {
  accessToken: string
  columns: SpreadsheetColumn[]
  sheetData: Array<Record<string, unknown>>
  onApplyFormula: (columnName: string, formula: string) => Promise<boolean>
}

export interface UseSheetsAIFormulaResult {
  intent: string
  setIntent: Dispatch<SetStateAction<string>>
  selectedColumn: string
  setSelectedColumn: Dispatch<SetStateAction<string>>
  generatedFormula: string
  explanation: string
  previewValue: string
  isGenerating: boolean
  isApplying: boolean
  error: string | null
  generateFormula: () => Promise<void>
  applyFormula: () => Promise<boolean>
}

const buildFallback = (intent: string, columns: SpreadsheetColumn[]): { formula: string; explanation: string } => {
  const lower = intent.toLowerCase()
  const numeric = columns.find(column => ['number', 'currency', 'percentage'].includes(String(column.type)))
  if (lower.includes('average') || lower.includes('avg')) {
    return {
      formula: numeric ? `=AVERAGE(${numeric.name})` : '=AVERAGE(A:A)',
      explanation: 'Fallback formula using AVERAGE over a numeric column.'
    }
  }
  if (lower.includes('if')) {
    const first = columns[0]?.name ?? 'A'
    return {
      formula: `=IF(${first}>0,"Yes","No")`,
      explanation: 'Fallback conditional formula template.'
    }
  }
  return {
    formula: numeric ? `=SUM(${numeric.name})` : '=SUM(A:A)',
    explanation: 'Fallback formula using SUM over a numeric column.'
  }
}

const withExactRanges = (rawFormula: string, rowCount: number): string =>
  expandFormulaFullColumnRanges(rawFormula, { rowCount, dataStartRow: 2 })

export const useSheetsAIFormula = ({
  accessToken,
  columns,
  sheetData,
  onApplyFormula
}: UseSheetsAIFormulaParams): UseSheetsAIFormulaResult => {
  const promptClient = usePromptManagerClient(accessToken)
  const [intent, setIntent] = useState('')
  const [selectedColumn, setSelectedColumn] = useState(columns[0]?.name ?? '')
  const [generatedFormula, setGeneratedFormula] = useState('')
  const [explanation, setExplanation] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewValue = useMemo(() => {
    if (!generatedFormula || sheetData.length === 0) return ''
    const value = evaluateFormula(generatedFormula, {
      row: sheetData[0],
      allRows: sheetData,
      columns: columns.map(column => ({ id: column.id, name: column.name })),
      currentRowIndex: 0
    })
    return value == null ? '' : String(value)
  }, [columns, generatedFormula, sheetData])

  const generateFormula = useCallback(async () => {
    if (!intent.trim()) return
    setError(null)
    setIsGenerating(true)
    try {
      const modelsResponse = await promptClient.getAiModels({
        limit: 10,
        offset: 0,
        returnTotalRecords: false
      })
      const selectedModel =
        modelsResponse.data?.find(model => model._id === PREFERRED_MODEL_ID) ??
        modelsResponse.data?.find(model => model.name.toLowerCase().includes('gpt-4')) ??
        modelsResponse.data?.[0]
      if (!selectedModel) throw new Error('No AI models available')

      const formData = new FormData()
      formData.append('model_id', selectedModel._id)
      formData.append('system_content', SHEETS_AI_FORMULA_SYSTEM_PROMPT)
      formData.append('user_content', buildSheetsAIFormulaUserPrompt(intent, columns, sheetData.slice(0, 80)))
      formData.append('model_settings', JSON.stringify({}))

      const response = await promptClient.executePrompt(formData)
      const parsed = parseSheetsAIFormulaResponse(response.content)
      if (!parsed) {
        const fallback = buildFallback(intent, columns)
        setGeneratedFormula(withExactRanges(fallback.formula, sheetData.length))
        setExplanation(fallback.explanation)
        return
      }
      setGeneratedFormula(withExactRanges(parsed.formula, sheetData.length))
      setExplanation(parsed.explanation)
    } catch (aiError) {
      const fallback = buildFallback(intent, columns)
      setGeneratedFormula(withExactRanges(fallback.formula, sheetData.length))
      setExplanation(fallback.explanation)
      setError(aiError instanceof Error ? aiError.message : 'Failed to generate AI formula')
    } finally {
      setIsGenerating(false)
    }
  }, [columns, intent, promptClient, sheetData])

  const applyFormula = useCallback(async (): Promise<boolean> => {
    if (!selectedColumn || !generatedFormula) return false
    setIsApplying(true)
    try {
      return await onApplyFormula(selectedColumn, generatedFormula)
    } finally {
      setIsApplying(false)
    }
  }, [generatedFormula, onApplyFormula, selectedColumn])

  return {
    intent,
    setIntent,
    selectedColumn,
    setSelectedColumn,
    generatedFormula,
    explanation,
    previewValue,
    isGenerating,
    isApplying,
    error,
    generateFormula,
    applyFormula
  }
}
