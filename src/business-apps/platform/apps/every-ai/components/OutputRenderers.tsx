import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@newwork/nw-design-system'
import { CheckCircleIcon, CopyIcon, PencilSimple } from '@phosphor-icons/react'
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
  FlowProposalOutput
} from '../types/models'
import type { ConversationTurn } from '../types/models'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DynamicFormDisplay from './DynamicFormDisplay'
import EmployeeDisplay from './entities/EmployeeDisplay'
import LeadDisplay from './entities/LeadDisplay'
import ContactDisplay from './entities/ContactDisplay'
import OpportunityDisplay from './entities/OpportunityDisplay'
import CompanyDisplay from './entities/CompanyDisplay'
import ExpenseDisplay from './entities/ExpenseDisplay'
import AbsenceDisplay from './entities/AbsenceDisplay'
import BlinkDisplay from './entities/BlinkDisplay'
import ServiceTicketDisplay from './entities/ServiceTicketDisplay'
import CrmNoteDisplay from './entities/CrmNoteDisplay'
import CrmDocumentDisplay from './entities/CrmDocumentDisplay'
import IrmNoteDisplay from './entities/IrmNoteDisplay'
import IrmDocumentDisplay from './entities/IrmDocumentDisplay'
import SalesActivityDisplay from './entities/SalesActivityDisplay'
import WorkflowDisplay from './entities/WorkflowDisplay'
import ContentEntryDisplay from './entities/ContentEntryDisplay'
import EntityLink, { markdownUrlTransform } from './links/EntityLink'
import NavigationDisplay from './displays/NavigationDisplay'
import { ReminderDisplay } from './displays/ReminderDisplay'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

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

// Premium Loading Display with AI animation
export const LoadingDisplay: React.FC = () => {
  return (
    <div
      className="gba:flex gba:items-center gba:gap-4 gba:p-6 gba:rounded-2xl gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border gba:border-border"
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
        EveryAI is thinking...
      </span>
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
    <div
      className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-2.5 gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:rounded-xl gba:text-sm gba:border gba:border-border/50"
      data-testid="tool-output"
    >
      <div className="gba:h-6 gba:w-6 gba:rounded-full gba:bg-gradient-to-br gba:from-ai gba:to-ai-secondary gba:flex gba:items-center gba:justify-center gba:shadow-md">
        <svg
          className="gba:h-3.5 gba:w-3.5 gba:text-ai-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
        </svg>
      </div>
      <span className="gba:text-muted-foreground gba:font-medium gba:italic">{displayText}</span>
    </div>
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
      <div className="gba:prose gba:prose-sm gba:max-w-none gba:text-foreground">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            ul: ({ ...props }) => <ul className="gba:list-disc gba:ml-6" {...props} />,
            ol: ({ ...props }) => <ol className="gba:list-decimal gba:ml-6" {...props} />,
            a: ({ href, children, ...props }) => (
              <EntityLink href={href} accessToken={accessToken} {...props}>
                {children}
              </EntityLink>
            )
          }}
          urlTransform={markdownUrlTransform}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}

// Premium Table Display
export const TableDisplay: React.FC<{ data: TableData }> = ({ data }) => {
  return (
    <Card className="gba:border-2 gba:shadow-lg gba:overflow-hidden" data-testid="table-display">
      {data.title && (
        <CardHeader className="gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
          <CardTitle className="gba:text-lg gba:font-bold gba:bg-gradient-to-r gba:from-ai gba:to-ai-secondary gba:bg-clip-text gba:text-transparent">
            {data.title}
          </CardTitle>
          {data.description && <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{data.description}</p>}
        </CardHeader>
      )}
      <CardContent className="gba:p-0">
        <div className="gba:overflow-x-auto">
          <table className="gba:w-full gba:text-sm">
            <thead className="gba:bg-muted/30">
              <tr className="gba:border-b-2 gba:border-border">
                {data.columnsTitles.map((title, idx) => (
                  <th key={idx} className="gba:text-left gba:px-4 gba:py-3 gba:font-semibold gba:text-foreground">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rowsContents.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="gba:border-b gba:border-border/50 hover:gba:bg-accent/30 gba:transition-colors"
                >
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="gba:px-4 gba:py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
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
                        className="gba:h-full gba:bg-gradient-to-r gba:from-ai gba:to-ai-secondary gba:rounded-lg gba:flex gba:items-center gba:justify-end gba:pr-3 gba:transition-all gba:shadow-md group-hover:gba:shadow-lg"
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="gba:text-xs gba:text-ai-foreground gba:font-bold">{point.y}</span>
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
    case 'employee':
      return <EmployeeDisplay key={item.id} employeeId={item.id} accessToken={accessToken} operation={item.operation} />
    case 'lead':
      return (
        <LeadDisplay
          key={item.id}
          leadId={item.id}
          accessToken={accessToken}
          operation={item.operation}
          textHuman={item.text_human}
          textTitle={item.text_title}
        />
      )
    case 'contact':
      return (
        <ContactDisplay
          key={item.id}
          contactId={item.id}
          accessToken={accessToken}
          operation={item.operation}
          textHuman={item.text_human}
          textTitle={item.text_title}
        />
      )
    case 'opportunity':
    case 'investment_opportunity':
      return (
        <OpportunityDisplay
          key={item.id}
          opportunityId={item.id}
          accessToken={accessToken}
          operation={item.operation}
          textHuman={item.text_human}
          textTitle={item.text_title}
        />
      )
    case 'company':
    case 'account':
    case 'investment_company':
    case 'investment_account':
      return (
        <CompanyDisplay
          key={item.id}
          companyId={item.id}
          accessToken={accessToken}
          operation={item.operation}
          textHuman={item.text_human}
          textTitle={item.text_title}
        />
      )
    case 'expense_request':
    case 'expense_plan':
    case 'expense_item':
      return (
        <ExpenseDisplay
          key={item.id}
          expenseId={item.id}
          accessToken={accessToken}
          operation={item.operation}
          entityType={entity as 'expense_request' | 'expense_plan' | 'expense_item'}
        />
      )
    case 'investment_lead':
      return (
        <LeadDisplay
          key={item.id}
          leadId={item.id}
          accessToken={accessToken}
          operation={item.operation}
          textHuman={item.text_human}
          textTitle={item.text_title}
        />
      )
    case 'investment_contact':
      return (
        <ContactDisplay
          key={item.id}
          contactId={item.id}
          accessToken={accessToken}
          operation={item.operation}
          textHuman={item.text_human}
          textTitle={item.text_title}
        />
      )
    case 'absence':
    case 'employee_absence':
      return (
        <AbsenceDisplay
          key={item.id}
          absenceId={item.id}
          accessToken={accessToken}
          operation={item.operation}
          textHuman={item.text_human}
          textTitle={item.text_title}
        />
      )
    case 'sales_activity':
    case 'salesActivity':
      return (
        <SalesActivityDisplay key={item.id} activityId={item.id} accessToken={accessToken} operation={item.operation} />
      )
    case 'blink':
    case 'quick_task':
      return <BlinkDisplay key={item.id} blinkId={item.id} accessToken={accessToken} operation={item.operation} />
    case 'reminder':
      return <ReminderDisplay key={item.id} entity={item} accessToken={accessToken} />
    case 'service_ticket':
      return (
        <ServiceTicketDisplay
          key={item.id}
          serviceTicketId={item.id}
          accessToken={accessToken}
          operation={item.operation}
          textHuman={item.text_human}
          textTitle={item.text_title}
        />
      )
    case 'content_entry':
      return (
        <ContentEntryDisplay
          key={item.id}
          contentEntryId={item.id}
          accessToken={accessToken}
          operation={item.operation}
        />
      )
    case 'crm_note':
      return <CrmNoteDisplay key={item.id} noteId={item.id} accessToken={accessToken} operation={item.operation} />
    case 'crm_document':
      return (
        <CrmDocumentDisplay key={item.id} documentId={item.id} accessToken={accessToken} operation={item.operation} />
      )
    case 'irm_note':
    case 'investment_note':
      return <IrmNoteDisplay key={item.id} noteId={item.id} accessToken={accessToken} operation={item.operation} />
    case 'irm_document':
    case 'investment_document':
      return (
        <IrmDocumentDisplay key={item.id} documentId={item.id} accessToken={accessToken} operation={item.operation} />
      )
    case 'service_workflow':
      return (
        <WorkflowDisplay
          key={item.id}
          workflowId={item.id}
          accessToken={accessToken}
          operation={item.operation}
          flowProposal={item.flow_proposal}
        />
      )
    default: {
      // Fallback for any unhandled entity types (should never happen with current types)
      const entityType = entity
      return (
        <Card key={item.id} data-testid="entity-display-fallback">
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-start gba:gap-3">
              <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-primary-secondary gba:flex gba:items-center gba:justify-center">
                <span className="gba:text-sm gba:font-medium gba:text-primary">
                  {entityType.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="gba:flex-1">
                <p className="gba:text-sm gba:font-medium gba:text-foreground">
                  {entityType.replace(/_/g, ' ').toUpperCase()}
                </p>
                <p className="gba:text-xs gba:text-muted-foreground">ID: {item.id}</p>
                {item.operation && (
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">Operation: {item.operation}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
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
  const gridColor = resolveCssVar('var(--nw-muted)', '#e5e7eb')
  const axisColor = resolveCssVar('var(--nw-foreground)', '#374151')

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
    red: '#ef4444',
    green: '#22c55e',
    blue: '#3b82f6',
    yellow: '#eab308',
    purple: '#a855f7',
    orange: '#f97316',
    pink: '#ec4899',
    gray: '#6b7280',
    black: '#000000',
    white: '#ffffff'
  }

  // Get color for series
  const getColor = (color: string | null) => {
    if (!color) return '#3b82f6' // default blue
    return colorMap[color] || '#3b82f6'
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
                  {/* Draw line if lineStyle is specified */}
                  {series.lineStyle && series.lineStyle !== null && points.length > 1 && (
                    <polyline
                      points={points.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeDasharray={
                        series.lineStyle === 'dashed' ? '5,5' : series.lineStyle === 'dotted' ? '2,2' : 'none'
                      }
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
  return (
    <Card data-testid="calendar-display">
      {data.title && (
        <CardHeader>
          <CardTitle className="gba:text-base">{data.title}</CardTitle>
          {data.description && <p className="gba:text-sm gba:text-muted-foreground">{data.description}</p>}
        </CardHeader>
      )}
      <CardContent>
        <div className="gba:space-y-2">
          <p className="gba:text-sm gba:text-muted-foreground">
            View: {data.view} | Start: {data.startDate}
          </p>
          <div className="gba:space-y-1">
            {data.events.map(event => (
              <div key={event.id} className="gba:p-2 gba:bg-muted gba:rounded gba:text-sm">
                <p className="gba:font-medium">{event.label || event.id}</p>
                <p className="gba:text-xs gba:text-muted-foreground">{event.date}</p>
                {event.tooltip && <p className="gba:text-xs">{event.tooltip}</p>}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Premium File Display with prominent download button
export const FileDisplay: React.FC<{ data: { filename: string; mimeType: string; content: string } }> = ({ data }) => {
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
      return <TableDisplay key={idx} data={item} />
    case 'bar':
      return <BarGraphDisplay key={idx} data={item} />
    case 'scatter':
      return <ScatterGraphDisplay key={idx} data={item} />
    case 'calendar':
      return <CalendarDisplay key={idx} data={item} />
    case 'navigation':
      return <NavigationDisplay key={idx} data={item} />
    case 'entity':
      return renderEntity(item, accessToken)
    case 'file':
      return <FileDisplay key={idx} data={item} />
    case 'reminder':
      // ReminderData is already handled via EntityData with entity: 'reminder'
      // Skip rendering to avoid duplicates
      return null
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
export const AnswerOutputRenderer: React.FC<{ data: AnswerOutput; accessToken: string }> = ({ data, accessToken }) => {
  const [copied, setCopied] = useState(false)

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
      className="gba:relative gba:group gba:flex gba:flex-col gba:gap-6 gba:w-full"
      data-testid="answer-output-renderer"
    >
      {deduplicatedData.map((item, idx) => (
        <div key={idx} className="gba:pt-1">
          {renderDisplayData(item, idx, accessToken)}
        </div>
      ))}
      <div className="gba:absolute gba:top-0 gba:right-2 gba:flex gba:items-center gba:gap-2 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:z-10">
        <Button
          variant="ghost"
          size="sm"
          className="gba:h-7 gba:w-7 gba:p-0"
          onClick={handleCopy}
          disabled={!hasTextToCopy}
          data-testid="agent-message-copy-button"
          aria-label={
            copied
              ? getTranslationFromI18nKeyAndLabel('everyAI.message.copy.copied', 'Message copied')
              : getTranslationFromI18nKeyAndLabel('everyAI.message.label', 'Copy message')
          }
        >
          {copied ? (
            <CheckCircleIcon className="gba:h-4 gba:w-4 gba:text-success" weight="bold" />
          ) : (
            <CopyIcon className="gba:h-4 gba:w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gba:h-7 gba:w-7 gba:p-0"
          onClick={e => e.stopPropagation()}
          data-testid="agent-message-edit-button"
          aria-label={getTranslationFromI18nKeyAndLabel('everyAI.message.edit.label', 'Edit message')}
        >
          <PencilSimple className="gba:h-4 gba:w-4" />
        </Button>
      </div>
    </div>
  )
}

// Output Item Renderer
export const OutputItemRenderer: React.FC<{
  item: OutputItem
  accessToken: string
  sendMessage?: (message: string, files: File[]) => void
  conversation?: ConversationTurn[]
  isVoiceMode?: boolean
}> = ({ item, accessToken, sendMessage, conversation, isVoiceMode = false }) => {
  switch (item.type) {
    case 'answer':
      return <AnswerOutputRenderer data={item} accessToken={accessToken} />
    case 'tool':
      return <ToolOutput name={item.name} reason={item.reason} />
    case 'loading':
      return <LoadingDisplay />
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
      return (
        <FlowProposalBoundary data={item} sendMessage={sendMessage}>
          <DynamicFormDisplay
            data={item}
            onCancel={() => sendMessage?.('Cancel', [])}
            sendMessage={sendMessage}
            accessToken={accessToken}
            conversation={conversation}
            isVoiceMode={isVoiceMode}
          />
        </FlowProposalBoundary>
      )
    default:
      return null
  }
}

export default OutputItemRenderer
