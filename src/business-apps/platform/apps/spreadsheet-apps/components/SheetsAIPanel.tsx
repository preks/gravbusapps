import React, { memo, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Tabs, TabsContent, TabsList, TabsTrigger, Badge } from '@newwork/nw-design-system'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Sparkles,
  X,
  Send,
  AlertTriangle,
  Clipboard,
  Wand2,
  RefreshCw,
  MessageCircle,
  ClipboardCheck
} from 'lucide-react'
import type { SpreadsheetColumn } from '../types'
import { useSheetsAIFormula } from '../hooks/useSheetsAIFormula'
import { useSheetsAIAnalyze } from '../hooks/useSheetsAIAnalyze'
import { useSheetsAIChat } from '../hooks/useSheetsAIChat'
import { useSheetsAIReview } from '../hooks/useSheetsAIReview'

export interface SheetsAIPanelProps {
  isOpen: boolean
  onClose: () => void
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

export const SheetsAIPanel: React.FC<SheetsAIPanelProps> = memo(function SheetsAIPanel({
  isOpen,
  onClose,
  appId: _appId,
  sheetId: _sheetId,
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
  void _appId
  void _sheetId
  const [activeTab, setActiveTab] = useState('formula')
  const [chatInput, setChatInput] = useState('')

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

  const formula = useSheetsAIFormula({
    accessToken,
    columns,
    sheetData: normalizedRows,
    onApplyFormula
  })
  const analyze = useSheetsAIAnalyze({
    accessToken,
    sheetName,
    columns,
    sheetData: normalizedRows
  })
  const chat = useSheetsAIChat({
    accessToken,
    sheetName,
    columns,
    sheetData: normalizedRows
  })
  const review = useSheetsAIReview({
    accessToken,
    sheetName,
    columns,
    sheetData: normalizedRows
  })

  if (!isOpen) return null

  const copyGeneratedFormula = async () => {
    if (!formula.generatedFormula) return
    try {
      await navigator.clipboard.writeText(formula.generatedFormula)
    } catch {
      // noop
    }
  }

  const getMetricVariant = (score: number): 'secondary' | 'success' | 'warning' => {
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

  const getScoreVariant = (score: number): 'success' | 'secondary' | 'warning' => {
    if (score >= 80) return 'success'
    if (score >= 60) return 'secondary'
    return 'warning'
  }

  return createPortal(
    <div className="gba:fixed gba:inset-0" style={{ zIndex: 999999 }} data-testid={testId}>
      <div
        className="gba:absolute gba:inset-0 gba:bg-black/30 gba:backdrop-blur-[2px] gba:transition-opacity"
        onClick={onClose}
      />
      <div
        className="gba:absolute gba:top-0 gba:right-0 gba:bottom-0 gba:w-[560px] gba:max-w-[90vw] gba:bg-background gba:border-l gba:border-border/50 gba:overflow-hidden gba:flex gba:flex-col"
        style={{ zIndex: 1000000, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}
      >
        <div className="gba:flex gba:items-center gba:justify-between gba:px-5 gba:py-3.5 gba:border-b gba:border-border/50 gba:bg-gradient-to-r gba:from-muted/30 gba:to-transparent">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-9 gba:h-9 gba:rounded-lg gba:bg-gradient-to-br gba:from-primary/20 gba:to-primary/5 gba:flex gba:items-center gba:justify-center gba:border gba:border-primary/20">
              <Sparkles className="gba:w-4.5 gba:h-4.5 gba:text-primary" />
            </div>
            <div>
              <h2 className="gba:text-base gba:font-semibold gba:text-foreground">Sheets AI</h2>
              <p className="gba:text-xs gba:text-muted-foreground">
                {normalizedRows.length} rows x {columns.length} cols
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gba:h-8 gba:w-8 gba:p-0 gba:rounded-full gba:hover:bg-muted"
          >
            <X className="gba:w-4 gba:h-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:flex-1 gba:flex gba:flex-col gba:min-h-0">
          <div className="gba:px-5 gba:pt-4 gba:pb-2 gba:border-b gba:border-border/40">
            <TabsList className="gba:w-full">
              <TabsTrigger value="formula" className="gba:flex-1">
                Formula
              </TabsTrigger>
              <TabsTrigger value="analyze" className="gba:flex-1">
                Analyze
              </TabsTrigger>
              <TabsTrigger value="chat" className="gba:flex-1">
                Chat
              </TabsTrigger>
              <TabsTrigger value="review" className="gba:flex-1">
                Review
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="gba:flex-1 gba:overflow-auto gba:p-5">
            <TabsContent value="formula" className="gba:space-y-4">
              <p className="gba:text-sm gba:text-primary">Describe the formula you need in plain language.</p>
              <p className="gba:text-xs gba:text-primary/80">
                Columns:{' '}
                {columns
                  .slice(0, 5)
                  .map(column => headerMap?.get(column.name) ?? column.label ?? column.name)
                  .join(', ')}
                {columns.length > 5 ? '...' : ''}
              </p>
              <textarea
                className="gba:w-full gba:min-h-[96px] gba:rounded-md gba:border gba:border-primary/20 gba:bg-primary/5 gba:px-3 gba:py-2 gba:text-sm"
                placeholder='e.g., "Sum sales where region is EMEA"'
                value={formula.intent}
                onChange={event => formula.setIntent(event.target.value)}
              />
              <Button
                onClick={() => void formula.generateFormula()}
                disabled={formula.isGenerating || !formula.intent.trim()}
                className="gba:w-full gba:bg-primary enabled:gba:bg-primary enabled:gba:text-primary-foreground"
              >
                <Wand2 className="gba:w-4 gba:h-4 gba:mr-2" />
                {formula.isGenerating ? 'Generating...' : 'Generate Formula'}
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
                      Copy
                    </Button>
                  </div>
                  <p className="gba:text-xs gba:text-muted-foreground">{formula.explanation}</p>
                  {formula.previewValue && (
                    <p className="gba:text-xs gba:text-muted-foreground">
                      Preview result (sample row): {formula.previewValue}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="analyze" className="gba:space-y-4">
              <p className="gba:text-sm gba:text-muted-foreground">
                {normalizedRows.length} rows x {columns.length} columns detected
              </p>
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
                <p className="gba:text-sm gba:text-muted-foreground">Run AI quality checks and summary narrative.</p>
                <Button onClick={() => void analyze.runAnalysis()} disabled={analyze.isLoading}>
                  <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
                  {analyze.isLoading ? 'Analyzing...' : 'Analyze Sheet'}
                </Button>
              </div>
              {analyze.error && (
                <p className="gba:text-xs gba:text-amber-700 gba:bg-amber-50 gba:border gba:border-amber-200 gba:rounded-md gba:p-2">
                  {analyze.error}
                </p>
              )}
              {analyze.result && (
                <div className="gba:space-y-4">
                  <div className="gba:grid gba:grid-cols-3 gba:gap-2">
                    <Badge variant={getMetricVariant(analyze.result.metrics.completeness)}>
                      Completeness: {analyze.result.metrics.completeness}
                    </Badge>
                    <Badge variant={getMetricVariant(analyze.result.metrics.consistency)}>
                      Consistency: {analyze.result.metrics.consistency}
                    </Badge>
                    <Badge variant={getMetricVariant(analyze.result.metrics.validity)}>
                      Validity: {analyze.result.metrics.validity}
                    </Badge>
                  </div>
                  <div className="gba:border gba:border-primary/20 gba:bg-primary/5 gba:rounded-md gba:p-3">
                    <h4 className="gba:text-sm gba:font-medium gba:mb-2">Narrative</h4>
                    <p className="gba:text-sm gba:text-foreground/90">{analyze.result.narrative}</p>
                  </div>
                  <div className="gba:space-y-2">
                    <h4 className="gba:text-sm gba:font-medium">Anomalies</h4>
                    {analyze.result.anomalies.length === 0 ? (
                      <div className="gba:border gba:border-success/30 gba:bg-success/5 gba:rounded-md gba:p-3">
                        <p className="gba:text-sm gba:text-success-foreground">No high-impact anomalies detected.</p>
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
                              <Badge variant={styles.badgeVariant}>{anomaly.severity}</Badge>
                            </div>
                            <p className="gba:text-sm gba:text-foreground/80 gba:mt-1">{anomaly.detail}</p>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="chat" className="gba:space-y-3 gba:h-full">
              <div className="gba:min-h-[320px] gba:max-h-[420px] gba:overflow-auto gba:border gba:border-secondary/30 gba:bg-secondary/5 gba:rounded-md gba:p-3 gba:space-y-3">
                {chat.messages.length === 0 && (
                  <div className="gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-muted-foreground gba:text-sm">
                    <MessageCircle className="gba:w-5 gba:h-5 gba:mb-2" />
                    Ask about your spreadsheet data
                  </div>
                )}
                {chat.messages.map(message => (
                  <div
                    key={message.id}
                    className={`gba:rounded-md gba:p-2 gba:text-sm ${
                      message.role === 'user'
                        ? 'gba:bg-primary/10 gba:border gba:border-primary/20'
                        : 'gba:bg-background gba:border gba:border-secondary/20'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="gba:prose gba:prose-sm gba:max-w-none [&>*:last-child]:gba:mb-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                ))}
              </div>
              {chat.error && (
                <p className="gba:text-xs gba:text-destructive gba:bg-destructive/5 gba:border gba:border-destructive/20 gba:rounded-md gba:p-2">
                  {chat.error}
                </p>
              )}
              <div className="gba:flex gba:items-center gba:gap-2">
                <input
                  className="gba:flex-1 gba:h-10 gba:rounded-md gba:border gba:border-secondary/30 gba:bg-background gba:px-3 gba:text-sm"
                  placeholder="Ask about your data..."
                  value={chatInput}
                  onChange={event => setChatInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      const nextMessage = chatInput
                      setChatInput('')
                      void chat.sendMessage(nextMessage)
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    const nextMessage = chatInput
                    setChatInput('')
                    void chat.sendMessage(nextMessage)
                  }}
                  disabled={chat.isSending || !chatInput.trim()}
                  variant="default"
                  size="icon"
                >
                  <Send className="gba:w-4 gba:h-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="review" className="gba:space-y-4">
              <Button
                onClick={() => void review.runReview()}
                disabled={review.isRunning}
                className="gba:w-full gba:bg-success enabled:gba:bg-success enabled:gba:text-success-foreground"
              >
                <ClipboardCheck className="gba:w-4 gba:h-4 gba:mr-2" />
                {review.isRunning ? 'Running Smart Review...' : 'Run Smart Review'}
              </Button>
              {review.lastReviewedAt && (
                <p className="gba:text-xs gba:text-muted-foreground">
                  Last reviewed:{' '}
                  {new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(
                    new Date(review.lastReviewedAt)
                  )}
                </p>
              )}
              {review.error && (
                <p className="gba:text-xs gba:text-amber-700 gba:bg-amber-50 gba:border gba:border-amber-200 gba:rounded-md gba:p-2">
                  {review.error}
                </p>
              )}
              {review.review && (
                <div className="gba:space-y-3">
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div className="gba:h-16 gba:w-16 gba:rounded-2xl gba:bg-success/15 gba:border gba:border-success/30 gba:flex gba:items-center gba:justify-center gba:text-3xl gba:font-semibold gba:text-success-foreground">
                      {review.review.overallScore}
                    </div>
                    <div>
                      <p className="gba:text-sm gba:font-medium">Overall Quality Score</p>
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
                      disabled={!review.review.summary}
                    >
                      <Clipboard className="gba:w-4 gba:h-4 gba:mr-2" />
                      Add Summary to Comments
                    </Button>
                    <Button variant="secondary" onClick={onOpenCheckpointDialog}>
                      Save Checkpoint
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>,
    document.body
  )
})
