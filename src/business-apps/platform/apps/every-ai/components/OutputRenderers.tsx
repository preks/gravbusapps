import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'
import { CheckCircleIcon, CopyIcon } from '@phosphor-icons/react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'
import { navigateTo } from '@/common/utils/navigationUtils'
import type {
  OutputItem,
  AnswerOutput,
  DisplayData,
  TextBlockData,
  TableData,
  BarGraphData,
  ScatterGraphData,
  CalendarViewData,
  EntityData,
  FlowProposalOutput,
  ConversationTurn,
  DocumentStreamChunkOutput,
  DocumentStreamCompleteOutput,
  DocumentStreamErrorOutput,
  DocumentStreamStartOutput,
  ReasoningStepOutput,
  ReasoningStepKind
} from '../types/models'
import DynamicFormDisplay from './DynamicFormDisplay'
// Standardized entity card
import GenericEntityDisplay from './entities/GenericEntityDisplay'
import WorkflowDisplay from './entities/WorkflowDisplay'
import { MarkdownWithChipsRenderer, UnifiedTableRenderer } from '@/common/components/markdown'
import NavigationDisplay from './displays/NavigationDisplay'
import { ReminderDisplay } from './displays/ReminderDisplay'
import { RemoteFormDisplay } from './displays/RemoteFormDisplay'
import { CrmFunnelDisplay } from './displays/crm-funnel'
import { AssetSummaryDisplay } from './displays/asset-summary'
import { TeamAvailabilityDisplay } from './displays/team-availability'
import { FlowbotCalendarDisplay } from './displays/calendar/FlowbotCalendarDisplay'
import { ChatSnippetDisplay } from './displays/ChatSnippetDisplay'
import {
  AreaChartDisplay,
  GanttDisplay,
  HeatmapDisplay,
  KanbanBoardDisplay,
  LineChartDisplay,
  MetricCardsDisplay,
  PieChartDisplay,
  StackedBarChartDisplay,
  TimelineDisplay,
  TreemapDisplay
} from './displays/visual-elements'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  REASONING_KIND_LABEL,
  REASONING_STATUS_STYLE,
  extractCodeHint,
  formatReasoningDuration,
  prettifyJson
} from './reasoningStepUtils'

interface FlowProposalBoundaryProps {
  data: FlowProposalOutput
  sendMessage?: (message: string, files: File[]) => void
  children: React.ReactNode
}

interface FlowProposalBoundaryState {
  hasError: boolean
  error?: Error
}

class FlowProposalBoundary extends React.Component<FlowProposalBoundaryProps, FlowProposalBoundaryState> {
  constructor(props: FlowProposalBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): FlowProposalBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[EveryAI][FlowProposalBoundary] Failed to render flow proposal', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  handleSubmitAsIs = () => {
    const { data, sendMessage } = this.props
    if (!sendMessage) return

    const payload = {
      action: 'form_submission',
      flow_name: data.flow_name || '',
      module_name: data.module_name || '',
      uuid: data.uuid || '',
      data: {
        flow: data.arguments?.flow || {},
        ...(data.arguments?.task ? { task: data.arguments.task } : {})
      }
    }

    try {
      const message = JSON.stringify(payload, null, 2)
      sendMessage(message, [])
      this.setState({ hasError: false, error: undefined })
    } catch (err) {
      console.error('[EveryAI][FlowProposalBoundary] Failed to serialise submission payload', err, payload)
    }
  }

  handleCancel = () => {
    const { sendMessage } = this.props
    sendMessage?.('Cancel', [])
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    const { hasError, error } = this.state

    if (hasError) {
      return (
        <Card
          className="gba:border-2 gba:border-ai/40 gba:bg-ai-secondary/40 gba:shadow-lg"
          data-testid="flow-proposal-fallback"
        >
          <CardHeader>
            <div className="gba:flex gba:items-center gba:gap-2">
              <svg className="gba:h-5 gba:w-5 gba:text-ai" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <CardTitle className="gba:text-ai">Form temporarily unavailable</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            <p className="gba:text-sm gba:text-muted-foreground">
              I couldn&rsquo;t render the workflow form safely. You can submit the request with the suggested values or
              cancel and try again.
            </p>
            {error?.message && (
              <div className="gba:text-xs gba:text-muted-foreground gba:bg-muted/50 gba:p-3 gba:rounded-md gba:border gba:border-border/60">
                <strong>Error details:</strong> {error.message}
              </div>
            )}
            <div className="gba:flex gba:flex-wrap gba:gap-3">
              <Button className="gba:bg-success" onClick={this.handleSubmitAsIs}>
                Submit as suggested
              </Button>
              <Button variant="outline" onClick={this.handleRetry}>
                Retry form
              </Button>
              <Button variant="destructive" onClick={this.handleCancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children as React.ReactElement
  }
}

// Catmull-Rom-style cubic bezier path used by the custom SVG scatter renderer.
const buildSmoothPath = (points: Array<{ x: number; y: number }>) => {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`

  let path = `M ${points[0]!.x} ${points[0]!.y}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[i + 2] ?? p2

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }

  return path
}

// Premium Loading Display with AI animation
export const LoadingDisplay: React.FC<{ onCancel?: () => void }> = ({ onCancel }) => {
  const { t } = useTranslation(translations)

  return (
    <div
      className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:p-6 gba:rounded-2xl gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border gba:border-border"
      data-testid="loading-display"
    >
      <div className="gba:flex gba:items-center gba:gap-2">
        <div className="gba:h-2.5 gba:w-2.5 gba:rounded-full gba:bg-gradient-to-br gba:from-ai gba:to-ai-secondary gba:animate-pulse gba:shadow-lg" />
        <div
          className="gba:h-2.5 gba:w-2.5 gba:rounded-full gba:bg-gradient-to-br gba:from-ai-secondary gba:to-success gba:animate-pulse gba:shadow-lg"
          style={{ animationDelay: '0.2s' }}
        />
        <div
          className="gba:h-2.5 gba:w-2.5 gba:rounded-full gba:bg-gradient-to-br gba:from-success gba:to-ai gba:animate-pulse gba:shadow-lg"
          style={{ animationDelay: '0.4s' }}
        />
      </div>
      <span className="gba:text-sm gba:text-muted-foreground gba:font-medium gba:animate-pulse">
        {t('everyai-thinking')}
      </span>
      {onCancel && (
        <button
          onClick={onCancel}
          className="gba:flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-full gba:bg-destructive/10 hover:gba:bg-destructive/20 gba:transition-colors gba:flex-shrink-0"
          data-testid="cancel-generation-button"
          title="Cancel generation"
          aria-label="Cancel generation"
        >
          <svg
            className="gba:h-4 gba:w-4 gba:text-destructive"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

// Premium Error Display
export const ErrorDisplay: React.FC<{ text?: string }> = ({ text }) => {
  return (
    <Card
      className="gba:bg-gradient-to-br gba:from-destructive-secondary gba:to-destructive-secondary/50 gba:border-2 gba:border-destructive/30 gba:shadow-lg"
      data-testid="error-display"
    >
      <CardContent className="gba:p-5">
        <div className="gba:flex gba:items-start gba:gap-4">
          <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-destructive/20 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
            <svg className="gba:h-5 gba:w-5 gba:text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="gba:text-sm gba:font-semibold gba:text-destructive gba:mb-1">Unable to Process</p>
            <p className="gba:text-sm gba:text-foreground">
              {text || "I'm having trouble with that request. Please try rephrasing or try again in a moment."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Premium Tool Output Display
export const ToolOutput: React.FC<{ name: string; reason?: string }> = ({ name, reason }) => {
  const formatToolName = (raw: string): string => {
    return raw
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  const displayText = reason || formatToolName(name)

  return (
    <div className="gba:text-xs gba:text-muted-foreground gba:font-medium gba:italic" data-testid="tool-output">
      {displayText}
    </div>
  )
}

export const DocumentStreamStartDisplay: React.FC<{ data: DocumentStreamStartOutput }> = () => null

export const DocumentStreamChunkDisplay: React.FC<{ data: DocumentStreamChunkOutput; accessToken: string }> = () => null

export const DocumentStreamCompleteDisplay: React.FC<{ data: DocumentStreamCompleteOutput }> = () => null

export const DocumentStreamErrorDisplay: React.FC<{ data: DocumentStreamErrorOutput }> = ({ data }) => {
  return (
    <Card
      className="gba:border gba:border-destructive/40 gba:bg-destructive-secondary/20"
      data-testid="document-stream-error"
    >
      <CardContent className="gba:p-4">
        <div className="gba:text-sm gba:font-semibold gba:text-destructive gba:mb-1">Document stream failed</div>
        <div className="gba:text-sm gba:text-foreground">{data.message}</div>
      </CardContent>
    </Card>
  )
}

// Text Block Display with Markdown support
// Normalize minor authoring glitches in markdown (e.g. "[text] (url)" → "[text](url)")
const normalizeLinkSpacing = (input: string): string => {
  if (!input) return input
  return input.replace(/\[([^\]]+)\]\s+\(\s*([a-zA-Z0-9_]+:\/\/[^)\s]+?)\s*\)/g, (_m, text, url) => {
    return `[${text}](${url})`
  })
}

export const TextBlockDisplay: React.FC<{ data: TextBlockData; accessToken: string }> = ({ data, accessToken }) => {
  const content = normalizeLinkSpacing(data.text)

  // NOTE: Copy behaviour for AI answers is now handled once at the AnswerOutput level
  // (see AnswerOutputRenderer / agent-message-copy-button). We deliberately keep this
  // component focused on rendering the text only so the UI is consistent: one copy
  // button per AI message, just like in OpenAI Chat.

  return (
    <div className="gba:relative" data-testid="text-block-display">
      <MarkdownWithChipsRenderer
        content={content}
        accessToken={accessToken}
        variant="ai"
        renderHttpLinksAsChips={false}
      />
    </div>
  )
}

// Premium Table Display - now uses unified table renderer with chip support
export const TableDisplay: React.FC<{ data: TableData; accessToken: string }> = ({ data, accessToken }) => {
  return (
    <UnifiedTableRenderer
      columnsTitles={data.columnsTitles}
      rowsContents={data.rowsContents}
      title={data.title}
      description={data.description}
      accessToken={accessToken}
      showCard={true}
      data-testid="table-display"
    />
  )
}

// Premium Bar Graph Display
export const BarGraphDisplay: React.FC<{ data: BarGraphData }> = ({ data }) => {
  return (
    <Card className="gba:border-2 gba:shadow-lg gba:overflow-hidden" data-testid="bar-graph-display">
      {data.title && (
        <CardHeader className="gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
          <CardTitle className="gba:text-lg gba:font-bold gba:bg-gradient-to-r gba:from-ai gba:to-ai-secondary gba:bg-clip-text gba:text-transparent">
            {data.title}
          </CardTitle>
          {data.description && <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{data.description}</p>}
        </CardHeader>
      )}
      <CardContent className="gba:p-6">
        <div className="gba:space-y-4">
          {data.series.map((series, idx) => (
            <div key={idx} className="gba:space-y-2">
              <p className="gba:text-sm gba:font-semibold gba:text-foreground">{series.name}</p>
              {series.data.map((point, pointIdx) => {
                const maxValue = Math.max(...series.data.map(p => p.y))
                const percentage = (point.y / maxValue) * 100
                return (
                  <div key={pointIdx} className="gba:flex gba:items-center gba:gap-3 gba:group">
                    <span className="gba:text-xs gba:text-muted-foreground gba:w-24 gba:truncate gba:font-medium">
                      {point.x}
                    </span>
                    <div className="gba:flex-1 gba:h-8 gba:bg-muted gba:rounded-lg gba:overflow-hidden gba:relative">
                      <div
                        className="gba:h-full gba:bg-primary gba:rounded-lg gba:flex gba:items-center gba:justify-end gba:pr-3 gba:transition-all gba:shadow-md group-hover:gba:shadow-lg"
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="gba:text-xs gba:text-primary-foreground gba:font-bold">{point.y}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Entity Display Router
function renderEntity(item: EntityData, accessToken: string) {
  const entity = item.entity as string
  switch (entity) {
    case 'reminder':
      return <ReminderDisplay key={item.id} entity={item} accessToken={accessToken} />
    case 'service_workflow':
      return (
        <WorkflowDisplay
          key={item.id}
          workflowId={item.id}
          accessToken={accessToken}
          operation={item.operation}
          flowProposal={item.flow_proposal}
          textTitle={item.text_title}
          tool={item.tool}
          link={item.link}
          textFull={item.text_full}
        />
      )
    default: {
      return (
        <GenericEntityDisplay
          key={item.id}
          entity={entity}
          id={item.id}
          accessToken={accessToken}
          operation={item.operation}
          textHuman={item.text_human}
          textTitle={item.text_title}
          link={item.link}
          variant="decorative"
        />
      )
    }
  }
}

// Scatter Graph Display
export const ScatterGraphDisplay: React.FC<{ data: ScatterGraphData }> = ({ data }) => {
  // Helper to resolve CSS variables for SVG (client-side only)
  const resolveCssVar = (cssVar: string, fallback: string): string => {
    if (!cssVar.startsWith('var(')) return cssVar
    if (typeof window === 'undefined' || typeof document === 'undefined') return fallback

    const varName = cssVar.substring(4, cssVar.length - 1).trim()
    const resolved = window.getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    return resolved || fallback
  }

  // Resolve design token colors for SVG
  const gridColor = resolveCssVar('var(--nw-border)', 'var(--nw-border)')
  const axisColor = resolveCssVar('var(--nw-foreground)', 'var(--nw-foreground)')

  // Calculate bounds for all series
  const allPoints = data.series.flatMap(series => series.data)
  const xValues = allPoints.map(p => p.x)
  const yValues = allPoints.map(p => p.y)

  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)
  const minY = Math.min(...yValues)
  const maxY = Math.max(...yValues)

  // Add padding (10% on each side)
  const xRange = maxX - minX || 1
  const yRange = maxY - minY || 1
  const xPadding = xRange * 0.1
  const yPadding = yRange * 0.1

  const xMin = minX - xPadding
  const xMax = maxX + xPadding
  const yMin = minY - yPadding
  const yMax = maxY + yPadding

  // SVG dimensions
  const width = 800
  const height = 500
  const padding = { top: 40, right: 40, bottom: 60, left: 60 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  // Scale functions
  const scaleX = (x: number) => ((x - xMin) / (xMax - xMin)) * plotWidth + padding.left
  const scaleY = (y: number) => plotHeight - ((y - yMin) / (yMax - yMin)) * plotHeight + padding.top

  // Color mapping
  const colorMap: Record<string, string> = {
    red: 'var(--nw-destructive)',
    green: 'var(--nw-success)',
    blue: 'var(--nw-chart-3)',
    yellow: 'var(--nw-highlight)',
    purple: 'var(--nw-chart-2)',
    orange: 'var(--nw-warning)',
    pink: 'var(--nw-ai-2)',
    gray: 'var(--nw-muted-foreground)',
    black: 'var(--nw-foreground)',
    white: 'var(--nw-background)'
  }

  // Get color for series
  const getColor = (color: string | null) => {
    if (!color) return 'var(--nw-chart-3)'
    return colorMap[color] || 'var(--nw-chart-3)'
  }

  // Generate tick marks
  const xTicks = 8
  const yTicks = 6
  const xTickStep = (xMax - xMin) / xTicks
  const yTickStep = (yMax - yMin) / yTicks

  return (
    <Card data-testid="scatter-graph-display" className="gba:border-2 gba:shadow-lg gba:overflow-hidden">
      {data.title && (
        <CardHeader>
          <CardTitle className="gba:text-lg gba:font-bold">{data.title}</CardTitle>
          {data.description && <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{data.description}</p>}
        </CardHeader>
      )}
      <CardContent className="gba:p-6">
        <div className="gba:overflow-x-auto">
          <svg width={width} height={height} className="gba:w-full gba:h-auto" viewBox={`0 0 ${width} ${height}`}>
            {/* Grid lines - vertical */}
            {Array.from({ length: xTicks + 1 }, (_, i) => {
              const x = scaleX(xMin + i * xTickStep)
              return (
                <line
                  key={`grid-v-${i}`}
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + plotHeight}
                  stroke={gridColor}
                  strokeWidth="1"
                />
              )
            })}

            {/* Grid lines - horizontal */}
            {Array.from({ length: yTicks + 1 }, (_, i) => {
              const y = scaleY(yMin + i * yTickStep)
              return (
                <line
                  key={`grid-h-${i}`}
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + plotWidth}
                  y2={y}
                  stroke={gridColor}
                  strokeWidth="1"
                />
              )
            })}

            {/* X-axis */}
            <line
              x1={padding.left}
              y1={padding.top + plotHeight}
              x2={padding.left + plotWidth}
              y2={padding.top + plotHeight}
              stroke={axisColor}
              strokeWidth="2"
            />

            {/* Y-axis */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={padding.top + plotHeight}
              stroke={axisColor}
              strokeWidth="2"
            />

            {/* X-axis ticks and labels */}
            {Array.from({ length: xTicks + 1 }, (_, i) => {
              const xValue = xMin + i * xTickStep
              const x = scaleX(xValue)
              return (
                <g key={`x-tick-${i}`}>
                  <line
                    x1={x}
                    y1={padding.top + plotHeight}
                    x2={x}
                    y2={padding.top + plotHeight + 5}
                    stroke={axisColor}
                    strokeWidth="2"
                  />
                  <text
                    x={x}
                    y={padding.top + plotHeight + 20}
                    textAnchor="middle"
                    className="gba:text-xs gba:fill-foreground"
                    fontSize="12"
                  >
                    {xValue.toFixed(1)}
                  </text>
                </g>
              )
            })}

            {/* Y-axis ticks and labels */}
            {Array.from({ length: yTicks + 1 }, (_, i) => {
              const yValue = yMin + i * yTickStep
              const y = scaleY(yValue)
              return (
                <g key={`y-tick-${i}`}>
                  <line x1={padding.left} y1={y} x2={padding.left - 5} y2={y} stroke={axisColor} strokeWidth="2" />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="gba:text-xs gba:fill-foreground"
                    fontSize="12"
                  >
                    {yValue.toFixed(1)}
                  </text>
                </g>
              )
            })}

            {/* Plot series */}
            {data.series.map((series, seriesIdx) => {
              const color = getColor(series.color)
              const points = series.data.map(p => ({ x: scaleX(p.x), y: scaleY(p.y) }))

              return (
                <g key={`series-${seriesIdx}`}>
                  {/* Draw connecting curve between points */}
                  {points.length > 1 && (
                    <path
                      d={buildSmoothPath(points)}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeDasharray={
                        series.lineStyle === 'dashed' ? '5,5' : series.lineStyle === 'dotted' ? '2,2' : 'none'
                      }
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.8}
                    />
                  )}

                  {/* Draw markers */}
                  {points.map((point, pointIdx) => {
                    const markerSize = 6
                    const markerStyle = series.markerStyle || '.'

                    if (markerStyle === '.') {
                      // Circle dot
                      return (
                        <circle
                          key={`point-${pointIdx}`}
                          cx={point.x}
                          cy={point.y}
                          r={markerSize / 2}
                          fill={color}
                          stroke={color}
                          strokeWidth="1"
                        />
                      )
                    } else if (markerStyle === '+') {
                      // Plus sign
                      return (
                        <g key={`point-${pointIdx}`}>
                          <line
                            x1={point.x - markerSize}
                            y1={point.y}
                            x2={point.x + markerSize}
                            y2={point.y}
                            stroke={color}
                            strokeWidth="2"
                          />
                          <line
                            x1={point.x}
                            y1={point.y - markerSize}
                            x2={point.x}
                            y2={point.y + markerSize}
                            stroke={color}
                            strokeWidth="2"
                          />
                        </g>
                      )
                    } else if (markerStyle === '*') {
                      // Star
                      return (
                        <g key={`point-${pointIdx}`}>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r={markerSize / 2}
                            fill={color}
                            stroke={color}
                            strokeWidth="1"
                          />
                          <line
                            x1={point.x - markerSize}
                            y1={point.y}
                            x2={point.x + markerSize}
                            y2={point.y}
                            stroke={color}
                            strokeWidth="1"
                          />
                          <line
                            x1={point.x}
                            y1={point.y - markerSize}
                            x2={point.x}
                            y2={point.y + markerSize}
                            stroke={color}
                            strokeWidth="1"
                          />
                        </g>
                      )
                    }
                    return null
                  })}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="gba:flex gba:flex-wrap gba:gap-4 gba:mt-4 gba:justify-center">
          {data.series.map((series, idx) => {
            const color = getColor(series.color)
            return (
              <div key={`legend-${idx}`} className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:w-4 gba:h-4 gba:rounded-full" style={{ backgroundColor: color }} />
                <span className="gba:text-sm gba:text-foreground">{series.name}</span>
                <span className="gba:text-xs gba:text-muted-foreground">({series.data.length} points)</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Calendar Display
export const CalendarDisplay: React.FC<{ data: CalendarViewData }> = ({ data }) => {
  return <FlowbotCalendarDisplay data={data} />
}

function isSpreadsheetFile(mimeType: string, filename: string): boolean {
  const spreadsheetMimeTypes = [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
  if (spreadsheetMimeTypes.some(t => mimeType.toLowerCase().includes(t))) {
    return true
  }
  const lower = filename.toLowerCase()
  return lower.endsWith('.csv') || lower.endsWith('.xls') || lower.endsWith('.xlsx')
}

interface FileDisplayProps {
  data: { filename: string; mimeType: string; content: string }
  accessToken?: string
}

// Premium File Display with prominent download button
export const FileDisplay: React.FC<FileDisplayProps> = ({ data, accessToken }) => {
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const handleOpenInSpreadsheet = async () => {
    if (!accessToken) return
    setIsImporting(true)
    setImportError(null)
    try {
      const baseUrl = resolveFlowbotBaseUrl()
      const response = await fetch(`${baseUrl}/flowbot/api/agent/import-csv-to-spreadsheet`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename: data.filename,
          content: data.content,
          mimeType: data.mimeType
        })
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `HTTP ${response.status}`)
      }
      const { url } = await response.json()
      navigateTo(url)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to open in EverySpreadsheet')
    } finally {
      setIsImporting(false)
    }
  }
  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return (
        <svg className="gba:h-10 gba:w-10 gba:text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      )
    }
    if (mimeType.includes('pdf')) {
      return (
        <svg className="gba:h-10 gba:w-10 gba:text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      )
    }
    return (
      <svg className="gba:h-10 gba:w-10 gba:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    )
  }

  const getFileSize = () => {
    const bytes = Math.ceil((data.content.length * 3) / 4) // Approximate base64 size
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card
      className="gba:border-2 gba:shadow-lg gba:overflow-hidden gba:group hover:gba:shadow-xl gba:transition-all"
      data-testid="file-display"
    >
      <CardContent className="gba:p-6">
        <div className="gba:flex gba:items-start gba:gap-4">
          <div className="gba:flex-shrink-0 gba:h-16 gba:w-16 gba:rounded-xl gba:bg-gradient-to-br gba:from-muted/50 gba:to-muted/30 gba:flex gba:items-center gba:justify-center gba:border-2 gba:border-border group-hover:gba:border-primary/50 gba:transition-all">
            {getFileIcon(data.mimeType)}
          </div>
          <div className="gba:flex-1 gba:min-w-0">
            <h4 className="gba:text-base gba:font-bold gba:text-foreground gba:mb-1 gba:truncate">{data.filename}</h4>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-3">
              {data.mimeType.split('/').pop()?.toUpperCase() || 'FILE'} • {getFileSize()}
            </p>
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              <a
                href={`data:${data.mimeType};base64,${data.content}`}
                download={data.filename}
                className="gba:inline-flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:rounded-xl gba:bg-gradient-to-r gba:from-ai gba:to-ai-secondary gba:text-ai-foreground gba:font-semibold gba:shadow-md hover:gba:shadow-lg gba:transition-all gba:text-sm"
              >
                <svg className="gba:h-5 gba:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>Download File</span>
              </a>
              {isSpreadsheetFile(data.mimeType, data.filename) && accessToken && (
                <button
                  type="button"
                  onClick={handleOpenInSpreadsheet}
                  disabled={isImporting}
                  data-testid="open-in-everyspreadsheet"
                  className="gba:inline-flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:rounded-xl gba:bg-success gba:text-success-foreground gba:font-semibold gba:shadow-md hover:gba:shadow-lg gba:transition-all gba:text-sm disabled:gba:opacity-60 disabled:gba:cursor-not-allowed"
                >
                  <svg className="gba:h-5 gba:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>{isImporting ? 'Opening…' : 'Open in EverySpreadsheet'}</span>
                </button>
              )}
            </div>
            {importError && <p className="gba:mt-2 gba:text-xs gba:text-destructive">{importError}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Display Data Renderer
function renderDisplayData(item: DisplayData, idx: number, accessToken: string) {
  switch (item.type) {
    case 'textBlock':
      return <TextBlockDisplay key={idx} data={item} accessToken={accessToken} />
    case 'table':
      return <TableDisplay key={idx} data={item} accessToken={accessToken} />
    case 'bar':
      return <BarGraphDisplay key={idx} data={item} />
    case 'scatter':
      return <ScatterGraphDisplay key={idx} data={item} />
    case 'calendar':
      return <CalendarDisplay key={idx} data={item} />
    case 'crmFunnel':
      return <CrmFunnelDisplay key={idx} data={item} />
    case 'assetSummary':
      return <AssetSummaryDisplay key={idx} data={item} />
    case 'teamAvailability':
      return <TeamAvailabilityDisplay key={idx} data={item} />
    case 'navigation':
      return <NavigationDisplay key={idx} data={item} />
    case 'entity':
      return renderEntity(item, accessToken)
    case 'file':
      return <FileDisplay key={idx} data={item} accessToken={accessToken} />
    case 'chat_reference':
      return <ChatSnippetDisplay key={idx} data={item} />
    case 'reminder':
      // ReminderData is already handled via EntityData with entity: 'reminder'
      // Skip rendering to avoid duplicates
      return null
    case 'lineChart':
      return <LineChartDisplay key={idx} data={item} />
    case 'areaChart':
      return <AreaChartDisplay key={idx} data={item} />
    case 'stackedBarChart':
      return <StackedBarChartDisplay key={idx} data={item} />
    case 'pieChart':
      return <PieChartDisplay key={idx} data={item} />
    case 'metricCards':
      return <MetricCardsDisplay key={idx} data={item} />
    case 'heatmap':
      return <HeatmapDisplay key={idx} data={item} />
    case 'timeline':
      return <TimelineDisplay key={idx} data={item} />
    case 'gantt':
      return <GanttDisplay key={idx} data={item} />
    case 'treemap':
      return <TreemapDisplay key={idx} data={item} />
    case 'kanbanBoard':
      return <KanbanBoardDisplay key={idx} data={item} />
    default:
      return null
  }
}

// Extract text from answer output for copying
function extractTextFromAnswerOutput(data: AnswerOutput): string {
  const textParts: string[] = []
  data.displayData.forEach(item => {
    if (item.type === 'textBlock' && item.text) {
      textParts.push(item.text)
    }
  })
  return textParts.join('\n\n')
}

// Answer Output Renderer
export const AnswerOutputRenderer: React.FC<{
  data: AnswerOutput
  accessToken: string
  sessionId?: string
}> = ({ data, accessToken, sessionId }) => {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null)
  const [isSendingFeedback, setIsSendingFeedback] = useState(false)

  // Deduplicate reminder entities to prevent double display
  const deduplicatedData = data.displayData.filter((item, idx, arr) => {
    // If this is a reminder entity, check if it's a duplicate
    if (item.type === 'entity' && item.entity === 'reminder') {
      // Find the first occurrence of this reminder ID
      const firstIdx = arr.findIndex(
        other => other.type === 'entity' && other.entity === 'reminder' && other.id === item.id
      )
      // Only keep the first occurrence
      return firstIdx === idx
    }
    return true
  })

  const textToCopy = extractTextFromAnswerOutput(data)
  const hasTextToCopy = textToCopy.trim().length > 0

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!hasTextToCopy) return
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  return (
    <div
      className="gba:relative gba:group gba:flex gba:flex-col gba:gap-3 gba:w-full"
      data-testid="answer-output-renderer"
    >
      {deduplicatedData.map((item, idx) => (
        <div key={idx}>{renderDisplayData(item, idx, accessToken)}</div>
      ))}
      <div className="gba:absolute gba:top-full gba:left-0 gba:mt-1 gba:flex gba:items-center gba:gap-2 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:z-10">
        <Button
          variant="ghost"
          size="icon"
          className="gba:h-7 gba:w-7 gba:p-0"
          onClick={handleCopy}
          disabled={!hasTextToCopy}
          data-testid="agent-message-copy-button"
          aria-label={
            copied
              ? getTranslationFromI18nKeyAndLabel('everyAI.message.copy.copied', 'Message copied')
              : getTranslationFromI18nKeyAndLabel('everyAI.message.copy.label', 'Copy message')
          }
        >
          {copied ? (
            <CheckCircleIcon className="gba:h-4 gba:w-4 gba:text-success" weight="bold" />
          ) : (
            <CopyIcon className="gba:h-4 gba:w-4" />
          )}
        </Button>

        {sessionId && (
          <>
            {/* Like button: visible unless current feedback is 'dislike' */}
            {feedback !== 'dislike' && (
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-7 gba:w-7 gba:p-0"
                disabled={isSendingFeedback}
                onClick={async e => {
                  e.stopPropagation()
                  if (!sessionId) return

                  const isSame = feedback === 'like'
                  const nextFeedback = isSame ? null : 'like'
                  setFeedback(nextFeedback)

                  if (!nextFeedback) {
                    // User cleared feedback – do not send anything to backend
                    return
                  }

                  setIsSendingFeedback(true)
                  try {
                    const baseUrl = resolveFlowbotBaseUrl()
                    await fetch(`${baseUrl}/flowbot/api/agent/feedback`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`
                      },
                      body: JSON.stringify({
                        session_id: sessionId,
                        message_id: null,
                        feedback: 'like',
                        source: 'every-ai',
                        assistant: 'Every'
                      })
                    })
                  } catch (error) {
                    console.error('[EveryAI] Failed to send like feedback:', error)
                  } finally {
                    setIsSendingFeedback(false)
                  }
                }}
                data-testid="everyai-feedback-like-button"
                aria-label="Like this AI response"
              >
                <ThumbsUp
                  className={`gba:h-4 gba:w-4 ${
                    feedback === 'like' ? 'gba:text-foreground gba:fill-current' : 'gba:text-muted-foreground'
                  }`}
                />
              </Button>
            )}

            {/* Dislike button: visible unless current feedback is 'like' */}
            {feedback !== 'like' && (
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-7 gba:w-7 gba:p-0"
                disabled={isSendingFeedback}
                onClick={async e => {
                  e.stopPropagation()
                  if (!sessionId) return

                  const isSame = feedback === 'dislike'
                  const nextFeedback = isSame ? null : 'dislike'
                  setFeedback(nextFeedback)

                  if (!nextFeedback) {
                    // User cleared feedback – do not send anything to backend
                    return
                  }

                  setIsSendingFeedback(true)
                  try {
                    const baseUrl = resolveFlowbotBaseUrl()
                    await fetch(`${baseUrl}/flowbot/api/agent/feedback`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`
                      },
                      body: JSON.stringify({
                        session_id: sessionId,
                        message_id: null,
                        feedback: 'dislike',
                        source: 'every-ai',
                        assistant: 'Every'
                      })
                    })
                  } catch (error) {
                    console.error('[EveryAI] Failed to send dislike feedback:', error)
                  } finally {
                    setIsSendingFeedback(false)
                  }
                }}
                data-testid="everyai-feedback-dislike-button"
                aria-label="Dislike this AI response"
              >
                <ThumbsDown
                  className={`gba:h-4 gba:w-4 ${
                    feedback === 'dislike' ? 'gba:text-foreground gba:fill-current' : 'gba:text-muted-foreground'
                  }`}
                />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cursor-style expandable reasoning step
// ---------------------------------------------------------------------------

/**
 * Short, human-friendly label for each step kind. Used alongside the title so
 * a glance at the collapsed row already tells the user WHAT kind of action
 * ran (tool call vs. RAG lookup vs. inner GraphQL generation).
 */
const ReasoningSection: React.FC<{ title: string; payload: unknown; kind: ReasoningStepKind }> = ({
  title,
  payload,
  kind
}) => {
  if (payload === undefined || payload === null || payload === '') return null
  const codeHint = extractCodeHint(kind, payload)
  const [showFull, setShowFull] = useState(false)

  const json = prettifyJson(payload)
  const TRUNCATE_CHARS = 2000
  const isLarge = json.length > TRUNCATE_CHARS
  const displayed = showFull || !isLarge ? json : json.slice(0, TRUNCATE_CHARS) + '…'

  return (
    <div className="gba:flex gba:flex-col gba:gap-1">
      <div className="gba:text-[10px] gba:uppercase gba:tracking-wide gba:text-muted-foreground gba:font-semibold">
        {title}
      </div>
      {codeHint ? (
        <pre className="gba:text-xs gba:font-mono gba:whitespace-pre-wrap gba:break-words gba:bg-muted/60 gba:border gba:border-border gba:rounded gba:p-2 gba:overflow-x-auto">
          <code data-language={codeHint.language}>{codeHint.code}</code>
        </pre>
      ) : (
        <pre className="gba:text-xs gba:font-mono gba:whitespace-pre-wrap gba:break-words gba:bg-muted/60 gba:border gba:border-border gba:rounded gba:p-2 gba:overflow-x-auto">
          <code>{displayed}</code>
        </pre>
      )}
      {isLarge && !codeHint && (
        <button
          type="button"
          onClick={() => setShowFull(prev => !prev)}
          className="gba:self-start gba:text-[11px] gba:text-primary gba:underline-offset-2 hover:gba:underline"
        >
          {showFull ? 'Collapse' : 'Show full'}
        </button>
      )}
    </div>
  )
}

/**
 * Cursor-style collapsible row for a single reasoning step. Collapsed by
 * default; expand state is kept per mounted row so reloading the page
 * returns to the default collapsed state (users treat them as debug-ish
 * artifacts, not first-class content).
 *
 * Rendering does NOT recurse into nested children here — the parent
 * ``ReasoningStepTree`` component handles the indentation because children
 * may arrive before or after their parent in the output list.
 */
export const ReasoningStepDisplay: React.FC<{
  step: ReasoningStepOutput
  children?: React.ReactNode
  depth?: number
}> = ({ step, children, depth = 0 }) => {
  const [expanded, setExpanded] = useState(false)
  const kindLabel = REASONING_KIND_LABEL[step.kind] ?? 'Step'
  const statusClass = REASONING_STATUS_STYLE[step.status] ?? 'gba:text-muted-foreground'
  const duration = formatReasoningDuration(step.started_at, step.ended_at)
  const statusIcon =
    step.status === 'running' ? (
      <span
        className="gba:inline-block gba:h-2 gba:w-2 gba:rounded-full gba:bg-primary gba:animate-pulse"
        aria-hidden
      />
    ) : step.status === 'done' ? (
      <CheckCircleIcon className="gba:h-3.5 gba:w-3.5" weight="fill" />
    ) : (
      <span className="gba:inline-block gba:h-2 gba:w-2 gba:rounded-full gba:bg-destructive" aria-hidden />
    )

  return (
    <div
      className="gba:flex gba:flex-col gba:gap-1 gba:text-xs"
      style={depth > 0 ? { marginLeft: `${depth * 14}px` } : undefined}
      data-testid={`reasoning-step-${step.kind}`}
    >
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="gba:flex gba:items-center gba:gap-2 gba:rounded gba:px-1.5 gba:py-1 gba:text-left hover:gba:bg-muted/60 gba:transition-colors"
        aria-expanded={expanded}
      >
        <span className={`gba:flex gba:items-center ${statusClass}`}>{statusIcon}</span>
        <span className="gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:text-[10px] gba:font-semibold">
          {kindLabel}
        </span>
        <span className="gba:text-foreground gba:font-medium gba:truncate">{step.title}</span>
        {duration && <span className="gba:text-muted-foreground gba:text-[11px] gba:ml-auto">{duration}</span>}
        <span
          className="gba:text-muted-foreground gba:transition-transform"
          style={{ transform: expanded ? 'rotate(90deg)' : undefined }}
          aria-hidden
        >
          ›
        </span>
      </button>
      {expanded && (
        <div
          className="gba:flex gba:flex-col gba:gap-2 gba:pl-6 gba:pr-2 gba:py-2 gba:border-l gba:border-border/60"
          data-testid="reasoning-step-body"
        >
          {step.narration && (
            <div
              className="gba:text-xs gba:italic gba:text-muted-foreground gba:whitespace-pre-wrap gba:break-words"
              data-testid="reasoning-step-narration"
            >
              {step.narration}
            </div>
          )}
          <ReasoningSection title="Input" payload={step.args} kind={step.kind} />
          <ReasoningSection title="Output" payload={step.result} kind={step.kind} />
          {step.error && (
            <div className="gba:text-xs gba:text-destructive gba:font-mono gba:whitespace-pre-wrap gba:break-words">
              {step.error}
            </div>
          )}
        </div>
      )}
      {children && expanded && <div className="gba:mt-1 gba:flex gba:flex-col gba:gap-1">{children}</div>}
    </div>
  )
}

/**
 * Render a reasoning step inside the output list. This single-step renderer
 * is plugged into ``OutputItemRenderer``'s switch; nested children are
 * handled via ``parent_id`` lookups at the conversation layer (future work)
 * — for now each step renders flat and nests via its own ``parent_id`` only
 * if the parent is provided via ``children``.
 */
const ReasoningStepRenderer: React.FC<{ item: ReasoningStepOutput }> = ({ item }) => {
  return <ReasoningStepDisplay step={item} />
}

/**
 * Collapsed-by-default container that hides a turn's reasoning trail behind
 * one button once the agent has finished talking. While the answer is still
 * streaming each step renders inline (handled by ``UnifiedAIMessageRenderer``);
 * after the canonical answer arrives we want the chat to be visually tidy
 * but the reasoning to still be one click away — exactly like Cursor.
 */
export const ReasoningStepsGroup: React.FC<{
  steps: ReasoningStepOutput[]
  defaultExpanded?: boolean
}> = ({ steps, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded)
  if (steps.length === 0) return null

  const hasError = steps.some(s => s.status === 'error')
  const stillRunning = steps.some(s => s.status === 'running')
  const totalDuration = computeGroupDuration(steps)

  const summaryIcon = hasError ? (
    <span className="gba:inline-block gba:h-2 gba:w-2 gba:rounded-full gba:bg-destructive" aria-hidden />
  ) : stillRunning ? (
    <span className="gba:inline-block gba:h-2 gba:w-2 gba:rounded-full gba:bg-primary gba:animate-pulse" aria-hidden />
  ) : (
    <CheckCircleIcon className="gba:h-3.5 gba:w-3.5 gba:text-emerald-600 dark:gba:text-emerald-400" weight="fill" />
  )

  return (
    <div className="gba:flex gba:flex-col gba:gap-1 gba:text-xs" data-testid="reasoning-steps-group">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="gba:self-start gba:flex gba:items-center gba:gap-2 gba:rounded gba:px-1.5 gba:py-1 gba:text-left hover:gba:bg-muted/60 gba:transition-colors gba:text-muted-foreground"
        aria-expanded={expanded}
        data-testid="reasoning-steps-group-toggle"
      >
        <span className="gba:flex gba:items-center">{summaryIcon}</span>
        <span className="gba:text-[11px] gba:font-medium">
          {expanded ? 'Hide reasoning' : `Show reasoning · ${steps.length} step${steps.length === 1 ? '' : 's'}`}
        </span>
        {totalDuration && !expanded && (
          <span className="gba:text-[11px] gba:text-muted-foreground/80">· {totalDuration}</span>
        )}
        <span
          className="gba:transition-transform"
          style={{ transform: expanded ? 'rotate(90deg)' : undefined }}
          aria-hidden
        >
          ›
        </span>
      </button>
      {expanded && (
        <div
          className="gba:flex gba:flex-col gba:gap-1 gba:pl-2 gba:border-l gba:border-border/60 gba:ml-1"
          data-testid="reasoning-steps-group-body"
        >
          {steps.map(step => (
            <ReasoningStepDisplay key={step.id} step={step} />
          ))}
        </div>
      )}
    </div>
  )
}

function computeGroupDuration(steps: ReasoningStepOutput[]): string | null {
  const starts = steps.map(s => s.started_at).filter((t): t is number => typeof t === 'number')
  const ends = steps.map(s => s.ended_at).filter((t): t is number => typeof t === 'number')
  if (!starts.length || !ends.length) return null
  return formatReasoningDuration(Math.min(...starts), Math.max(...ends))
}

// Output Item Renderer
export const OutputItemRenderer: React.FC<{
  item: OutputItem
  accessToken: string
  sendMessage?: (message: string, files: File[]) => void
  conversation?: ConversationTurn[]
  isVoiceMode?: boolean
  sessionId?: string
  onCancelGeneration?: () => void
  isAgentGenerating?: boolean
  userInfo?: any
}> = ({
  item,
  accessToken,
  sendMessage,
  conversation,
  isVoiceMode = false,
  sessionId,
  onCancelGeneration,
  isAgentGenerating,
  userInfo
}) => {
  switch (item.type) {
    case 'answer':
      return <AnswerOutputRenderer data={item} accessToken={accessToken} sessionId={sessionId} />
    case 'tool':
      return <ToolOutput name={item.name} reason={item.reason} />
    case 'reasoning_step':
      return <ReasoningStepRenderer item={item} />
    case 'reasoning_step_update':
      // Updates are merged into their originating step by the hook before
      // this renderer ever sees them. If one slips through (replay of a
      // malformed saved message, e.g.), render nothing rather than noise.
      return null
    case 'text_delta':
      // Deltas are folded into a streaming `answer` bubble by the hook.
      return null
    case 'narration_attach':
      // Pure dispatch event: the hook moves the streaming bubble's text
      // into the matching reasoning step's `narration`. Nothing to render.
      return null
    case 'document_stream_start':
      return <DocumentStreamStartDisplay data={item} />
    case 'document_stream_chunk':
      return <DocumentStreamChunkDisplay data={item} accessToken={accessToken} />
    case 'document_stream_complete':
      return <DocumentStreamCompleteDisplay data={item} />
    case 'document_stream_error':
      return <DocumentStreamErrorDisplay data={item} />
    case 'loading':
      return <LoadingDisplay onCancel={onCancelGeneration} />
    case 'error':
      return <ErrorDisplay text={item.text} />
    case 'flow_proposal':
      if (!item.flow_schema) {
        return (
          <Card>
            <CardContent className="gba:p-4 gba:text-destructive">Missing flow schema</CardContent>
          </Card>
        )
      }

      // Check if this is a content_entry flow proposal - show RemoteFormDisplay instead
      const isContentEntryFlow =
        item.flow_name?.toLowerCase().includes('content') ||
        item.module_name?.toLowerCase().includes('content') ||
        item.flow_name === 'createContentEntry' ||
        item.flow_name === 'saveContentEntry' ||
        item.flow_name === 'frm_createContentEntry'

      if (isContentEntryFlow) {
        // Extract and transform flow proposal data for the form
        const flowData = item.arguments?.flow || {}
        const taskData = item.arguments?.task || {}
        const flowContentEntry =
          typeof flowData.contentEntry === 'object' && flowData.contentEntry ? flowData.contentEntry : null
        const taskContentEntry =
          typeof taskData.contentEntry === 'object' && taskData.contentEntry ? taskData.contentEntry : null
        const flowRootContent =
          flowData &&
          (flowData.title ||
            flowData.preview ||
            flowData.previewText ||
            flowData.content ||
            flowData.contentGroup ||
            flowData.contentTypeId ||
            flowData.role)
            ? flowData
            : null
        const taskRootContent =
          taskData &&
          (taskData.title ||
            taskData.preview ||
            taskData.previewText ||
            taskData.content ||
            taskData.contentGroup ||
            taskData.contentTypeId ||
            taskData.role)
            ? taskData
            : null

        const contentEntryData = flowContentEntry || taskContentEntry || flowRootContent || taskRootContent || {}

        // Transform the data structure to match what the form component expects
        // The form component likely reads from additionalData and expects fields at top level
        // or nested under contentEntry. We provide both for maximum compatibility.
        // IMPORTANT: Avoid circular references by creating fresh objects instead of spreading nested structures

        // Create a clean contentEntry object without circular references
        // Use nullish coalescing to preserve empty strings but default to empty string if undefined
        const cleanContentEntry = {
          title: contentEntryData.title ?? '',
          preview: contentEntryData.preview ?? '',
          previewText: contentEntryData.preview ?? '', // Some forms use previewText instead of preview
          content: contentEntryData.content ?? '',
          role: contentEntryData.role ?? '',
          contentGroup: contentEntryData.contentGroup ?? '',
          contentTypeId:
            contentEntryData.contentTypeId ?? contentEntryData.contentType ?? contentEntryData.contentTypeName ?? '',
          creatorEmployee: contentEntryData.creatorEmployee ?? ''
        }

        const formData = {
          // Primary format: Flattened fields at top level (form fields can access directly)
          ...cleanContentEntry,
          changeMode: flowData.changeMode || 'INSERT',

          // Nested format: Under contentEntry (for components expecting nested structure)
          contentEntry: cleanContentEntry,

          // Flow structure: Keep original flow structure (avoid circular reference)
          flow: {
            changeMode: flowData.changeMode || 'INSERT',
            contentEntry: cleanContentEntry
            // Don't spread flowData here to avoid circular reference
          },

          // Include flow proposal metadata
          flowProposal: {
            uuid: item.uuid,
            flow_name: item.flow_name,
            module_name: item.module_name,
            operation: item.operation
          }
        }

        return (
          <RemoteFormDisplay
            screenKey="frm_createContentEntry"
            accessToken={accessToken}
            userInfo={userInfo}
            formData={formData}
            onClose={() => {}}
            sendMessage={sendMessage}
            flowName={item.flow_name}
            moduleName={item.module_name}
            flowUuid={item.uuid}
          />
        )
      }

      // For other flow proposals, use the default DynamicFormDisplay
      return (
        <FlowProposalBoundary data={item} sendMessage={sendMessage}>
          <DynamicFormDisplay
            data={item}
            onCancel={() => sendMessage?.('Cancel', [])}
            sendMessage={sendMessage}
            accessToken={accessToken}
            conversation={conversation}
            isVoiceMode={isVoiceMode}
            isAgentGenerating={isAgentGenerating}
          />
        </FlowProposalBoundary>
      )
    default:
      return null
  }
}

export default OutputItemRenderer
