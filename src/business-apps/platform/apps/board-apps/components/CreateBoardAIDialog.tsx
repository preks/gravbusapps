/**
 * CreateBoardAIDialog - create a board from a natural language prompt,
 * with optional sample data generation and system data source suggestions.
 *
 * Flow:
 * 1. Prompt input + toggles (sample data, suggest system data)
 * 2. If "suggest data" checked -> "Next" moves to data source review step
 *    - User picks ONE primary source (rows) and toggles auxiliary sources (select options)
 * 3. "Create" builds a single-sheet board with data wired in
 */

import React, { useState, useCallback } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Spinner,
  toast
} from '@newwork/nw-design-system'
import { Sparkles, ArrowLeft, ArrowRight } from 'lucide-react'
import { useBoardAI, type DataSourceSuggestion } from '../hooks/useBoardAI'
import { BoardApiService } from '../services/BoardApiService'
import { serializeRegistryCatalog, ENTITY_REGISTRY } from '../queries/entityQueries'
import { DataSourcesStep } from './create-board-ai/DataSourcesStep'
import { PromptStep } from './create-board-ai/PromptStep'
import { transformAIPlanToBoard } from './create-board-ai/transformAIPlan'
import { wireDataSources } from './create-board-ai/wireDataSources'
import type { Board } from '../types'

type Step = 'prompt' | 'dataSources'

export interface CreateBoardAIDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  onBoardCreated: (board: Partial<Board>) => Promise<Board | null>
  onComplete?: (boardId: string) => void
  'data-testid'?: string
}

export const CreateBoardAIDialog: React.FC<CreateBoardAIDialogProps> = ({
  open,
  onOpenChange,
  accessToken,
  onBoardCreated,
  onComplete,
  'data-testid': testId = 'create-board-ai-dialog'
}) => {
  const [step, setStep] = useState<Step>('prompt')
  const [prompt, setPrompt] = useState('')
  const [includeSampleData, setIncludeSampleData] = useState(true)
  const [suggestDataSources, setSuggestDataSources] = useState(false)
  const [insertingRows, setInsertingRows] = useState(false)
  const [wiringDS, setWiringDS] = useState(false)

  const [importLimit, setImportLimit] = useState<string>('100')

  const [suggestions, setSuggestions] = useState<DataSourceSuggestion[]>([])
  const [selectedDS, setSelectedDS] = useState<Set<string>>(new Set())
  const [dsSummary, setDsSummary] = useState<string>()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [fieldSelections, setFieldSelections] = useState<Map<string, Set<string>>>(new Map())

  const { isProcessing, error, createBoardFromPrompt, analyzeDataSources } = useBoardAI(accessToken)

  const initFieldSelections = useCallback((sources: DataSourceSuggestion[]) => {
    const map = new Map<string, Set<string>>()
    for (const s of sources) {
      const def = ENTITY_REGISTRY[s.entityType]
      if (!def) continue
      const defaultFields = new Set(def.fields.filter(f => f.key !== 'id' && f.defaultVisible).map(f => f.key))
      map.set(s.entityType, defaultFields)
    }
    setFieldSelections(map)
  }, [])

  const handleToggleField = useCallback((entityType: string, fieldKey: string) => {
    setFieldSelections(prev => {
      const next = new Map(prev)
      const fields = new Set(next.get(entityType) ?? [])
      if (fields.has(fieldKey)) fields.delete(fieldKey)
      else fields.add(fieldKey)
      next.set(entityType, fields)
      return next
    })
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!prompt.trim()) return
    setIsAnalyzing(true)
    const catalog = serializeRegistryCatalog()
    const result = await analyzeDataSources(prompt.trim(), catalog)
    setIsAnalyzing(false)
    if (result?.suggestions) {
      const withRoles = result.suggestions.map(s => ({
        ...s,
        role: s.role || (s.importMode === 'rows' ? ('primary' as const) : ('auxiliary' as const))
      }))
      setSuggestions(withRoles)
      setSelectedDS(new Set(withRoles.filter(s => s.confidence >= 0.5).map(s => s.entityType)))
      setDsSummary(result.summary)
      initFieldSelections(withRoles)
    }
  }, [prompt, analyzeDataSources, initFieldSelections])

  const handleNext = useCallback(async () => {
    setStep('dataSources')
    if (suggestions.length === 0) await handleAnalyze()
  }, [suggestions.length, handleAnalyze])

  const toggleDS = useCallback((entityType: string) => {
    setSelectedDS(prev => {
      const next = new Set(prev)
      if (next.has(entityType)) next.delete(entityType)
      else next.add(entityType)
      return next
    })
  }, [])

  const handleSetPrimary = useCallback((entityType: string) => {
    setSuggestions(prev =>
      prev.map(s => {
        if (s.entityType === entityType) {
          return { ...s, role: 'primary' as const, importMode: 'rows' as const }
        }
        if (s.role === 'primary') {
          return { ...s, role: 'auxiliary' as const, importMode: 'selectOptions' as const }
        }
        return s
      })
    )
    setSelectedDS(prev => new Set([...prev, entityType]))
  }, [])

  const getSelectedSuggestions = useCallback(
    () => suggestions.filter(s => selectedDS.has(s.entityType)),
    [suggestions, selectedDS]
  )

  const handleCreate = useCallback(async () => {
    if (!prompt.trim()) return

    const selectedSources = step === 'dataSources' ? getSelectedSuggestions() : []
    const plan = await createBoardFromPrompt(
      prompt.trim(),
      includeSampleData,
      selectedSources.length > 0 ? selectedSources : undefined
    )
    if (!plan) return

    const board = transformAIPlanToBoard(plan)
    const createdBoard = await onBoardCreated(board)

    if (createdBoard) {
      const sheetId = createdBoard.sheets?.[0]?.id

      if (includeSampleData && plan.sampleRows?.length && sheetId) {
        setInsertingRows(true)
        try {
          const BATCH = 5
          for (let i = 0; i < plan.sampleRows.length; i += BATCH) {
            await Promise.all(
              plan.sampleRows
                .slice(i, i + BATCH)
                .map(rowData => BoardApiService.createRow(createdBoard.id, sheetId, rowData).catch(() => null))
            )
          }
          toast.success(`Added ${plan.sampleRows.length} sample rows`)
        } catch {
          toast.error('Board created but sample data insertion failed')
        } finally {
          setInsertingRows(false)
        }
      }

      if (selectedSources.length > 0 && sheetId) {
        setWiringDS(true)
        try {
          const parsedLimit = importLimit === 'all' ? undefined : Number(importLimit) || 100
          const result = await wireDataSources(createdBoard, sheetId, selectedSources, parsedLimit, fieldSelections)
          const parts: string[] = []
          if (result.rowsImported > 0) parts.push(`${result.rowsImported} rows imported`)
          if (result.selectColumnsPopulated > 0) parts.push(`${result.selectColumnsPopulated} select columns populated`)
          if (parts.length > 0) toast.success(`Data sources connected: ${parts.join(', ')}`)
        } catch {
          toast.error('Board created but some data source connections failed')
        } finally {
          setWiringDS(false)
        }
      }

      onComplete?.(createdBoard.id)
    }

    resetState()
    onOpenChange(false)
    toast.success(`Board "${plan.suggestedName}" created`)
  }, [
    prompt,
    step,
    includeSampleData,
    importLimit,
    createBoardFromPrompt,
    getSelectedSuggestions,
    onBoardCreated,
    onComplete,
    onOpenChange
  ])

  const resetState = useCallback(() => {
    setPrompt('')
    setStep('prompt')
    setSuggestions([])
    setSelectedDS(new Set())
    setDsSummary(undefined)
    setImportLimit('100')
    setFieldSelections(new Map())
  }, [])

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) resetState()
      onOpenChange(isOpen)
    },
    [onOpenChange, resetState]
  )

  const busy = isProcessing || insertingRows || isAnalyzing || wiringDS
  const statusLabel = isAnalyzing
    ? 'Analyzing data sources...'
    : insertingRows
      ? 'Adding sample data...'
      : wiringDS
        ? 'Connecting data sources...'
        : 'Generating board...'

  const showNextButton = step === 'prompt' && suggestDataSources

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={step === 'dataSources' ? 'gba:max-w-xl' : 'gba:max-w-md'}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Sparkles className="gba:w-4 gba:h-4 gba:text-primary" />
            Create Board with AI
          </DialogTitle>
        </DialogHeader>

        {step === 'prompt' && (
          <PromptStep
            prompt={prompt}
            onPromptChange={setPrompt}
            includeSampleData={includeSampleData}
            onIncludeSampleDataChange={v => {
              setIncludeSampleData(v)
              if (v) setSuggestDataSources(false)
            }}
            suggestDataSources={suggestDataSources}
            onSuggestDataSourcesChange={v => {
              setSuggestDataSources(v)
              if (v) setIncludeSampleData(false)
            }}
            error={error}
            busy={busy}
            testId={testId}
          />
        )}

        {step === 'dataSources' && (
          <DataSourcesStep
            suggestions={suggestions}
            selectedDS={selectedDS}
            onToggle={toggleDS}
            onSetPrimary={handleSetPrimary}
            isAnalyzing={isAnalyzing}
            summary={dsSummary}
            onAnalyze={handleAnalyze}
            hasPrompt={!!prompt.trim()}
            importLimit={importLimit}
            onImportLimitChange={setImportLimit}
            fieldSelections={fieldSelections}
            onToggleField={handleToggleField}
            data-testid={`${testId}-ds`}
          />
        )}

        <DialogFooter>
          {step === 'dataSources' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep('prompt')}
              disabled={busy}
              className="gba:mr-auto"
              data-testid={`${testId}-back`}
            >
              <ArrowLeft className="gba:w-3.5 gba:h-3.5 gba:mr-1" /> Back
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={busy}
            data-testid={`${testId}-cancel`}
          >
            Cancel
          </Button>
          {showNextButton ? (
            <Button size="sm" onClick={handleNext} disabled={!prompt.trim() || busy} data-testid={`${testId}-next-ds`}>
              {busy ? (
                <>
                  <Spinner className="gba:w-3.5 gba:h-3.5 gba:mr-1" />
                  {statusLabel}
                </>
              ) : (
                <>
                  Next <ArrowRight className="gba:w-3.5 gba:h-3.5 gba:ml-1" />
                </>
              )}
            </Button>
          ) : (
            <Button size="sm" onClick={handleCreate} disabled={!prompt.trim() || busy} data-testid={`${testId}-submit`}>
              {busy ? (
                <>
                  <Spinner className="gba:w-3.5 gba:h-3.5 gba:mr-1" />
                  {statusLabel}
                </>
              ) : (
                <>
                  <Sparkles className="gba:w-3.5 gba:h-3.5 gba:mr-1" /> Create
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
