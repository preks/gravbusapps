import React, { memo, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Tabs, TabsContent, TabsList, TabsTrigger, Badge, useTranslation } from '@newwork/nw-design-system'
import { Sparkles, X, AlertTriangle, Clipboard, Wand2, RefreshCw, ClipboardCheck } from 'lucide-react'
import type { SpreadsheetColumn } from '../types'
import { useSheetsAIFormula } from '../hooks/useSheetsAIFormula'
import { useSheetsAIAnalyze } from '../hooks/useSheetsAIAnalyze'
import { useSheetsAIReview } from '../hooks/useSheetsAIReview'
import { useSpreadsheetAnalyticsAI } from '../hooks/useSpreadsheetAnalyticsAI'
import { useSpreadsheetPromptManagerClient } from '../hooks/useSpreadsheetPromptManagerClient'
import translations from '../_i18n'

export interface SheetsAIPanelProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'formula' | 'analyze' | 'review' | 'insights'
  appId: string
  sheetId: string
  sheetName: string
  accessToken: string
  columns: SpreadsheetColumn[]
  sheetData: Record<string, unknown>[]
  onApplyFormula: (columnName: string, formula: string) => Promise<boolean>
  onCreateReviewComment: (content: string) => Promise<boolean>
  onOpenCheckpointDialog: () => void
  getHeaderRowFromGrid?: () => Map<string, string> | null
  getSheetDataFromGrid?: () => Record<string, unknown>[] | null
  'data-testid'?: string
}

const isRowEmpty = (row: Record<string, unknown>): boolean =>
  Object.values(row).every(value => value == null || (typeof value === 'string' && value.trim() === ''))

const getCellText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'object') {
    const objectValue = value as { v?: unknown; m?: unknown; f?: unknown }
    if (objectValue.v !== undefined && objectValue.v !== null) return getCellText(objectValue.v)
    if (objectValue.m !== undefined && objectValue.m !== null) return getCellText(objectValue.m)
    if (typeof objectValue.f === 'string') return objectValue.f.trim()
  }
  return ''
}

const hasMeaningfulValue = (value: unknown): boolean => getCellText(value).length > 0

export const SheetsAIPanel: React.FC<SheetsAIPanelProps> = memo(function SheetsAIPanel({
  isOpen,
  onClose,
  initialTab = 'formula',
  sheetName,
  accessToken,
  columns,
  sheetData,
  onApplyFormula,
  onCreateReviewComment,
  onOpenCheckpointDialog,
  getHeaderRowFromGrid,
  getSheetDataFromGrid,
  'data-testid': testId = 'sheets-ai-panel'
}) {
  const { t, locale } = useTranslation(translations)
  const spreadsheetPromptClient = useSpreadsheetPromptManagerClient(accessToken)
  const [activeTab, setActiveTab] = useState('formula')
  const showTabs = initialTab === 'analyze' || initialTab === 'review' || initialTab === 'insights'
  const panelTitle = useMemo(() => {
    switch (activeTab) {
      case 'formula':
        return t('sheets-ai-title-formula')
      case 'analyze':
        return t('sheets-ai-title-analyze')
      case 'review':
        return t('sheets-ai-title-review')
      case 'insights':
        return t('sheets-ai-title-insights')
      default:
        return t('sheets-ai-title-default')
    }
  }, [activeTab, t])
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
    }
  }, [initialTab, isOpen])

  const headerMap = isOpen ? (getHeaderRowFromGrid?.() ?? null) : null
  const baseRows = isOpen ? (getSheetDataFromGrid?.() ?? sheetData) : sheetData
  const normalizedRows = useMemo(() => {
    const nonEmpty = baseRows.filter(row => !isRowEmpty(row))
    if (!headerMap || headerMap.size === 0) return nonEmpty
    return nonEmpty.map(row => {
      const next: Record<string, unknown> = {}
      columns.forEach(column => {
        const key = column.name
        const mappedName = headerMap.get(key) ?? key
        next[mappedName] = row[key]
      })
      return next
    })
  }, [baseRows, columns, headerMap])
  const columnsForAI = useMemo(
    () =>
      columns.map(column => ({
        ...column,
        name: (headerMap?.get(column.name) || '').trim() || column.name,
        label: headerMap?.get(column.name) || column.label
      })),
    [columns, headerMap]
  )
  const aiContext = useMemo(() => {
    const populatedColumns = columnsForAI.filter(column =>
      normalizedRows.some(row => hasMeaningfulValue(row[column.name]))
    )
    const populatedRows = normalizedRows
      .map(row => {
        const next: Record<string, unknown> = {}
        populatedColumns.forEach(column => {
          const value = row[column.name]
          if (hasMeaningfulValue(value)) next[column.name] = value
        })
        return next
      })
      .filter(row => Object.keys(row).length > 0)
    return {
      columns: populatedColumns,
      rows: populatedRows
    }
  }, [columnsForAI, normalizedRows])

  const formula = useSheetsAIFormula({
    promptClient: spreadsheetPromptClient,
    columns: aiContext.columns,
    sheetData: aiContext.rows,
    onApplyFormula,
    locale
  })
  const analyze = useSheetsAIAnalyze({
    promptClient: spreadsheetPromptClient,
    sheetName,
    columns: aiContext.columns,
    sheetData: aiContext.rows,
    locale
  })
  const review = useSheetsAIReview({
    promptClient: spreadsheetPromptClient,
    sheetName,
    columns: aiContext.columns,
    sheetData: aiContext.rows,
    locale
  })
  const { insights, insightsError, isLoadingInsights, generateInsights } = useSpreadsheetAnalyticsAI({
    promptClient: spreadsheetPromptClient,
    sheetName,
    columns: aiContext.columns,
    sheetData: aiContext.rows,
    locale
  })

  if (isOpen) {
    const copyGeneratedFormula = async () => {
      if (!formula.generatedFormula) return
      try {
        await navigator.clipboard.writeText(formula.generatedFormula)
      } catch {
        // noop
      }
    }
    const copyText = async (text: string) => {
      if (!text) return
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        // noop
      }
    }

    const getScoreVariant = (score: number): 'secondary' | 'success' | 'warning' => {
      if (score >= 80) return 'success'
      if (score >= 60) return 'secondary'
      return 'warning'
    }

    const getSeverityStyles = (severity: 'low' | 'medium' | 'high') => {
      if (severity === 'high') {
        return {
          container: 'gba:border-destructive/30 gba:bg-destructive/5',
          icon: 'gba:text-destructive',
          badgeVariant: 'warning' as const
        }
      }
      if (severity === 'medium') {
        return {
          container: 'gba:border-warning/30 gba:bg-warning/5',
          icon: 'gba:text-warning-foreground',
          badgeVariant: 'warning' as const
        }
      }
      return {
        container: 'gba:border-success/30 gba:bg-success/5',
        icon: 'gba:text-success-foreground',
        badgeVariant: 'success' as const
      }
    }

    return createPortal(
      <div className="gba:fixed gba:inset-0" style={{ zIndex: 999999 }} data-testid={testId}>
        <div className="gba:absolute gba:inset-0 gba:bg-transparent" onClick={onClose} />
        <div
          className="gba:fixed gba:bottom-0 gba:bg-background gba:border-l gba:border-border/50 gba:overflow-hidden gba:flex gba:flex-col"
          style={{
            top: 100,
            right: 16,
            bottom: 32,
            width: 380,
            maxWidth: '95vw',
            zIndex: 1000000,
            boxShadow: '-4px 0 24px rgba(0,0,0,0.08)'
          }}
        >
          <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-b gba:border-border/50 gba:bg-gradient-to-b gba:from-muted/20 gba:to-transparent">
            <div className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:w-7 gba:h-7 gba:rounded-md gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                <Sparkles className="gba:h-4 gba:w-4 gba:text-primary" />
              </div>
              <div>
                <h2 className="gba:font-semibold gba:text-sm">{panelTitle}</h2>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {t('analytics-rows-cols', { rows: normalizedRows.length, cols: columns.length })}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="gba:h-8 gba:w-8 gba:p-0 gba:rounded-full hover:gba:bg-muted"
            >
              <X className="gba:w-4 gba:h-4" />
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:flex-1 gba:flex gba:flex-col gba:min-h-0">
            {showTabs && (
              <div className="gba:flex gba:gap-1 gba:p-1 gba:bg-muted/30">
                <TabsList className="gba:w-full gba:h-auto gba:bg-transparent gba:p-0 gba:gap-1">
                  <TabsTrigger
                    value="analyze"
                    className="gba:flex-1 gba:rounded-lg gba:px-3 gba:py-1.5 gba:text-sm gba:font-medium gba:transition-all data-[state=active]:gba:bg-background data-[state=active]:gba:text-foreground data-[state=active]:gba:shadow-sm data-[state=inactive]:gba:text-muted-foreground data-[state=inactive]:hover:gba:text-foreground data-[state=inactive]:hover:gba:bg-background/50"
                  >
                    {t('sheets-ai-tab-analyze')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="review"
                    className="gba:flex-1 gba:rounded-lg gba:px-3 gba:py-1.5 gba:text-sm gba:font-medium gba:transition-all data-[state=active]:gba:bg-background data-[state=active]:gba:text-foreground data-[state=active]:gba:shadow-sm data-[state=inactive]:gba:text-muted-foreground data-[state=inactive]:hover:gba:text-foreground data-[state=inactive]:hover:gba:bg-background/50"
                  >
                    {t('sheets-ai-tab-review')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="insights"
                    className="gba:flex-1 gba:rounded-lg gba:px-3 gba:py-1.5 gba:text-sm gba:font-medium gba:transition-all data-[state=active]:gba:bg-background data-[state=active]:gba:text-foreground data-[state=active]:gba:shadow-sm data-[state=inactive]:gba:text-muted-foreground data-[state=inactive]:hover:gba:text-foreground data-[state=inactive]:hover:gba:bg-background/50"
                  >
                    {t('sheets-ai-tab-insights')}
                  </TabsTrigger>
                </TabsList>
              </div>
            )}

            <div className="gba:flex-1 gba:overflow-auto gba:p-3">
              <TabsContent value="formula" className="gba:space-y-4">
                <p className="gba:text-sm gba:text-primary">{t('sheets-ai-formula-description')}</p>
                <p className="gba:text-xs gba:text-primary/80">
                  {t('sheets-ai-columns-label')}{' '}
                  {columns
                    .slice(0, 5)
                    .map(column => headerMap?.get(column.name) ?? column.label ?? column.name)
                    .join(', ')}
                  {columns.length > 5 ? t('sheets-ai-ellipsis') : ''}
                </p>
                <textarea
                  className="gba:w-full gba:min-h-[96px] gba:rounded-md gba:border gba:border-primary/20 gba:bg-primary/5 gba:px-3 gba:py-2 gba:text-sm"
                  placeholder={t('sheets-ai-formula-placeholder')}
                  value={formula.intent}
                  onChange={event => formula.setIntent(event.target.value)}
                />
                <Button
                  onClick={() => void formula.generateFormula()}
                  disabled={formula.isGenerating || !formula.intent.trim()}
                  className="gba:w-full gba:bg-primary enabled:gba:bg-primary enabled:gba:text-primary-foreground"
                >
                  <Wand2 className="gba:w-4 gba:h-4 gba:mr-2" />
                  {formula.isGenerating ? t('analytics-generating') : t('sheets-ai-generate-formula')}
                </Button>
                {formula.error && (
                  <p className="gba:text-xs gba:text-amber-700 gba:bg-amber-50 gba:border gba:border-amber-200 gba:rounded-md gba:p-2">
                    {formula.error}
                  </p>
                )}
                {formula.generatedFormula && (
                  <div className="gba:border gba:border-primary/20 gba:bg-primary/5 gba:rounded-md gba:p-3 gba:space-y-2">
                    <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                      <code className="gba:text-sm gba:text-primary">{formula.generatedFormula}</code>
                      <Button variant="secondary" size="sm" onClick={() => void copyGeneratedFormula()}>
                        <Clipboard className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('sheets-ai-copy')}
                      </Button>
                    </div>
                    <p className="gba:text-xs gba:text-muted-foreground">{formula.explanation}</p>
                    {formula.previewValue && (
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {t('sheets-ai-preview-result', { value: formula.previewValue })}
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="analyze" className="gba:h-full gba:flex gba:flex-col gba:gap-4">
                {analyze.result ? (
                  <div className="gba:space-y-4">
                    <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
                      <p className="gba:text-sm gba:text-muted-foreground">
                        {t('sheets-ai-columns-detected', { rows: normalizedRows.length, columns: columns.length })}
                      </p>
                      <Button onClick={() => void analyze.runAnalysis()} disabled={analyze.isLoading}>
                        <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
                        {analyze.isLoading ? t('sheets-ai-analyzing') : t('sheets-ai-analyze-sheet')}
                      </Button>
                    </div>
                    {analyze.error && (
                      <p className="gba:text-xs gba:text-amber-700 gba:bg-amber-50 gba:border gba:border-amber-200 gba:rounded-md gba:p-2">
                        {analyze.error}
                      </p>
                    )}
                    <div className="gba:grid gba:grid-cols-3 gba:gap-2">
                      <Badge variant={getScoreVariant(analyze.result.metrics.completeness)}>
                        {t('sheets-ai-completeness', { score: analyze.result.metrics.completeness })}
                      </Badge>
                      <Badge variant={getScoreVariant(analyze.result.metrics.consistency)}>
                        {t('sheets-ai-consistency', { score: analyze.result.metrics.consistency })}
                      </Badge>
                      <Badge variant={getScoreVariant(analyze.result.metrics.validity)}>
                        {t('sheets-ai-validity', { score: analyze.result.metrics.validity })}
                      </Badge>
                    </div>
                    <div className="gba:border gba:border-primary/20 gba:bg-primary/5 gba:rounded-md gba:p-3">
                      <h4 className="gba:text-sm gba:font-medium gba:mb-2">{t('sheets-ai-narrative')}</h4>
                      <p className="gba:text-sm gba:text-foreground/90">{analyze.result.narrative}</p>
                    </div>
                    <div className="gba:space-y-2">
                      <h4 className="gba:text-sm gba:font-medium">{t('sheets-ai-anomalies')}</h4>
                      {analyze.result.anomalies.length === 0 ? (
                        <div className="gba:border gba:border-success/30 gba:bg-success/5 gba:rounded-md gba:p-3">
                          <p className="gba:text-sm gba:text-success-foreground">{t('sheets-ai-no-anomalies')}</p>
                        </div>
                      ) : (
                        analyze.result.anomalies.map((anomaly, index) => {
                          const styles = getSeverityStyles(anomaly.severity)
                          return (
                            <div
                              key={`${anomaly.title}-${index}`}
                              className={`gba:border gba:rounded-md gba:p-3 ${styles.container}`}
                            >
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <AlertTriangle className={`gba:w-4 gba:h-4 ${styles.icon}`} />
                                <span className="gba:text-sm gba:font-medium">{anomaly.title}</span>
                                <Badge variant={styles.badgeVariant}>
                                  {t(`sheets-ai-severity-${anomaly.severity}`)}
                                </Badge>
                              </div>
                              <p className="gba:text-sm gba:text-foreground/80 gba:mt-1">{anomaly.detail}</p>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="gba:flex-1 gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-center gba:px-4 gba:py-6">
                    <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-muted/50 gba:flex gba:items-center gba:justify-center gba:mb-3">
                      <RefreshCw className="gba:h-6 gba:w-6 gba:text-muted-foreground/60" />
                    </div>
                    <p className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
                      {t('sheets-ai-no-analysis')}
                    </p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:max-w-[220px] gba:mb-4">
                      {t('sheets-ai-analysis-empty-description')}
                    </p>
                    {analyze.error && (
                      <p className="gba:w-full gba:max-w-[260px] gba:text-xs gba:text-amber-700 gba:bg-amber-50 gba:border gba:border-amber-200 gba:rounded-md gba:p-2 gba:mb-3">
                        {analyze.error}
                      </p>
                    )}
                    <Button
                      onClick={() => void analyze.runAnalysis()}
                      disabled={analyze.isLoading}
                      className="gba:min-w-[180px]"
                    >
                      <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
                      {analyze.isLoading ? t('sheets-ai-analyzing') : t('sheets-ai-analyze-sheet')}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="review" className="gba:h-full gba:flex gba:flex-col gba:gap-4">
                {review.review ? (
                  <div className="gba:space-y-3">
                    <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
                      {review.lastReviewedAt ? (
                        <p className="gba:text-xs gba:text-muted-foreground">
                          {t('sheets-ai-last-reviewed')}{' '}
                          {new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(
                            new Date(review.lastReviewedAt)
                          )}
                        </p>
                      ) : (
                        <span />
                      )}
                      <Button
                        onClick={() => void review.runReview()}
                        disabled={review.isRunning}
                        className="gba:bg-success enabled:gba:bg-success enabled:gba:text-success-foreground"
                      >
                        <ClipboardCheck className="gba:w-4 gba:h-4 gba:mr-2" />
                        {review.isRunning ? t('sheets-ai-running-review') : t('sheets-ai-run-review')}
                      </Button>
                    </div>
                    {review.error && (
                      <p className="gba:text-xs gba:text-amber-700 gba:bg-amber-50 gba:border gba:border-amber-200 gba:rounded-md gba:p-2">
                        {review.error}
                      </p>
                    )}
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <div className="gba:h-16 gba:w-16 gba:rounded-2xl gba:bg-success/15 gba:border gba:border-success/30 gba:flex gba:items-center gba:justify-center gba:text-3xl gba:font-semibold gba:text-success-foreground">
                        {review.review.overallScore}
                      </div>
                      <div>
                        <p className="gba:text-sm gba:font-medium">{t('sheets-ai-overall-quality-score')}</p>
                        <p className="gba:text-sm gba:text-muted-foreground">{review.review.summary}</p>
                      </div>
                    </div>
                    <div className="gba:space-y-2">
                      {review.review.dimensions.map(dimension => (
                        <div
                          key={dimension.label}
                          className="gba:border gba:border-secondary/30 gba:bg-secondary/5 gba:rounded-md gba:p-3"
                        >
                          <div className="gba:flex gba:items-center gba:justify-between">
                            <span className="gba:text-sm gba:font-medium">{dimension.label}</span>
                            <Badge variant={getScoreVariant(dimension.score)}>{dimension.score}</Badge>
                          </div>
                          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{dimension.insight}</p>
                        </div>
                      ))}
                    </div>
                    <div className="gba:flex gba:flex-wrap gba:gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => void onCreateReviewComment(review.review?.summary ?? '')}
                        disabled={!review.review?.summary}
                      >
                        <Clipboard className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('sheets-ai-add-summary-to-comments')}
                      </Button>
                      <Button variant="secondary" onClick={onOpenCheckpointDialog}>
                        {t('menu-save-checkpoint')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="gba:flex-1 gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-center gba:px-4 gba:py-6">
                    <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-muted/50 gba:flex gba:items-center gba:justify-center gba:mb-3">
                      <ClipboardCheck className="gba:h-6 gba:w-6 gba:text-muted-foreground/60" />
                    </div>
                    <p className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
                      {t('sheets-ai-no-review')}
                    </p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:max-w-[220px] gba:mb-4">
                      {t('sheets-ai-review-empty-description')}
                    </p>
                    {review.error && (
                      <p className="gba:w-full gba:max-w-[260px] gba:text-xs gba:text-amber-700 gba:bg-amber-50 gba:border gba:border-amber-200 gba:rounded-md gba:p-2 gba:mb-3">
                        {review.error}
                      </p>
                    )}
                    <Button
                      onClick={() => void review.runReview()}
                      disabled={review.isRunning}
                      className="gba:min-w-[180px] gba:bg-success enabled:gba:bg-success enabled:gba:text-success-foreground"
                    >
                      <ClipboardCheck className="gba:w-4 gba:h-4 gba:mr-2" />
                      {review.isRunning ? t('sheets-ai-running-review') : t('sheets-ai-run-review')}
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="insights" className="gba:h-full gba:flex gba:flex-col gba:gap-4">
                {insights.length > 0 ? (
                  <>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Button
                        onClick={() => void generateInsights()}
                        disabled={isLoadingInsights}
                        className="gba:flex-1"
                      >
                        <Sparkles className="gba:w-4 gba:h-4 gba:mr-2" />
                        {isLoadingInsights ? t('analytics-generating') : t('sheets-ai-title-insights')}
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => void copyText(insights.join('\n'))}
                        disabled={insights.length === 0}
                      >
                        <Clipboard className="gba:w-4 gba:h-4" />
                      </Button>
                    </div>

                    {insightsError && (
                      <p className="gba:text-xs gba:text-warning-foreground gba:bg-warning/10 gba:border gba:border-warning/30 gba:rounded-md gba:p-2">
                        {t('analytics-using-local-fallback', { error: insightsError })}
                      </p>
                    )}
                    <div className="gba:space-y-2">
                      {insights.map(item => (
                        <div
                          key={item.slice(0, 60)}
                          className="gba:text-sm gba:p-3 gba:rounded-md gba:bg-success/5 gba:border gba:border-success/20"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="gba:flex-1 gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-center gba:px-4 gba:py-6">
                    <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-muted/50 gba:flex gba:items-center gba:justify-center gba:mb-3">
                      <Sparkles className="gba:h-6 gba:w-6 gba:text-muted-foreground/60" />
                    </div>
                    <p className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
                      {t('sheets-ai-no-insights')}
                    </p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:max-w-[220px] gba:mb-4">
                      {t('analytics-insights-empty')}
                    </p>
                    {insightsError && (
                      <p className="gba:w-full gba:max-w-[260px] gba:text-xs gba:text-warning-foreground gba:bg-warning/10 gba:border gba:border-warning/30 gba:rounded-md gba:p-2 gba:mb-3">
                        {t('analytics-using-local-fallback', { error: insightsError })}
                      </p>
                    )}
                    <Button
                      onClick={() => void generateInsights()}
                      disabled={isLoadingInsights}
                      className="gba:min-w-[180px]"
                    >
                      <Sparkles className="gba:w-4 gba:h-4 gba:mr-2" />
                      {isLoadingInsights ? t('analytics-generating') : t('sheets-ai-run-insights')}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>,
      document.body
    )
  }
  return null
})
