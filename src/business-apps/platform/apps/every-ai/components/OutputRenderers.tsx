import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@newwork/nw-design-system'
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
import EntityLink, { markdownUrlTransform } from './links/EntityLink'
import NavigationDisplay from './displays/NavigationDisplay'
import { ReminderDisplay } from './displays/ReminderDisplay'

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
          className="gba:border-2 gba:border-warning/40 gba:bg-warning-secondary/40 gba:shadow-lg"
          data-testid="flow-proposal-fallback"
        >
          <CardHeader>
            <div className="gba:flex gba:items-center gba:gap-2">
              <svg className="gba:h-5 gba:w-5 gba:text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <CardTitle className="gba:text-warning">Form temporarily unavailable</CardTitle>
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
        <div className="gba:h-2.5 gba:w-2.5 gba:rounded-full gba:bg-gradient-to-br gba:from-primary gba:to-info gba:animate-pulse gba:shadow-lg" />
        <div
          className="gba:h-2.5 gba:w-2.5 gba:rounded-full gba:bg-gradient-to-br gba:from-info gba:to-success gba:animate-pulse gba:shadow-lg"
          style={{ animationDelay: '0.2s' }}
        />
        <div
          className="gba:h-2.5 gba:w-2.5 gba:rounded-full gba:bg-gradient-to-br gba:from-success gba:to-primary gba:animate-pulse gba:shadow-lg"
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
      <div className="gba:h-6 gba:w-6 gba:rounded-full gba:bg-gradient-to-br gba:from-primary gba:to-info gba:flex gba:items-center gba:justify-center gba:shadow-md">
        <svg
          className="gba:h-3.5 gba:w-3.5 gba:text-primary-foreground"
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
export const TextBlockDisplay: React.FC<{ data: TextBlockData; accessToken: string }> = ({ data, accessToken }) => {
  return (
    <div className="gba:prose gba:prose-sm gba:max-w-none gba:text-foreground" data-testid="text-block-display">
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
        {data.text}
      </ReactMarkdown>
    </div>
  )
}

// Premium Table Display
export const TableDisplay: React.FC<{ data: TableData }> = ({ data }) => {
  return (
    <Card className="gba:border-2 gba:shadow-lg gba:overflow-hidden" data-testid="table-display">
      {data.title && (
        <CardHeader className="gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
          <CardTitle className="gba:text-lg gba:font-bold gba:bg-gradient-to-r gba:from-primary gba:to-info gba:bg-clip-text gba:text-transparent">
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
          <CardTitle className="gba:text-lg gba:font-bold gba:bg-gradient-to-r gba:from-primary gba:to-info gba:bg-clip-text gba:text-transparent">
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
                        className="gba:h-full gba:bg-gradient-to-r gba:from-primary gba:to-info gba:rounded-lg gba:flex gba:items-center gba:justify-end gba:pr-3 gba:transition-all gba:shadow-md group-hover:gba:shadow-lg"
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
  switch (item.entity) {
    case 'employee':
      return <EmployeeDisplay key={item.id} employeeId={item.id} accessToken={accessToken} operation={item.operation} />
    case 'lead':
      return <LeadDisplay key={item.id} leadId={item.id} accessToken={accessToken} operation={item.operation} />
    case 'contact':
      return <ContactDisplay key={item.id} contactId={item.id} accessToken={accessToken} operation={item.operation} />
    case 'opportunity':
    case 'investment_opportunity':
      return (
        <OpportunityDisplay
          key={item.id}
          opportunityId={item.id}
          accessToken={accessToken}
          operation={item.operation}
        />
      )
    case 'company':
    case 'account':
    case 'investment_company':
    case 'investment_account':
      return <CompanyDisplay key={item.id} companyId={item.id} accessToken={accessToken} operation={item.operation} />
    case 'expense_request':
    case 'expense_plan':
    case 'expense_item':
      return (
        <ExpenseDisplay
          key={item.id}
          expenseId={item.id}
          accessToken={accessToken}
          operation={item.operation}
          entityType={item.entity as 'expense_request' | 'expense_plan' | 'expense_item'}
        />
      )
    case 'investment_lead':
      return <LeadDisplay key={item.id} leadId={item.id} accessToken={accessToken} operation={item.operation} />
    case 'investment_contact':
      return <ContactDisplay key={item.id} contactId={item.id} accessToken={accessToken} operation={item.operation} />
    case 'absence':
    case 'employee_absence':
      return <AbsenceDisplay key={item.id} absenceId={item.id} accessToken={accessToken} operation={item.operation} />
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
    default: {
      // Fallback for any unhandled entity types (should never happen with current types)
      const entityType = item.entity as string
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
  return (
    <Card data-testid="scatter-graph-display">
      {data.title && (
        <CardHeader>
          <CardTitle className="gba:text-base">{data.title}</CardTitle>
          {data.description && <p className="gba:text-sm gba:text-muted-foreground">{data.description}</p>}
        </CardHeader>
      )}
      <CardContent>
        <div className="gba:space-y-4">
          {data.series.map((series, idx) => (
            <div key={idx}>
              <p className="gba:text-sm gba:font-medium gba:mb-2">{series.name}</p>
              <div className="gba:text-xs gba:text-muted-foreground">{series.data.length} data points</div>
            </div>
          ))}
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
              className="gba:inline-flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:rounded-xl gba:bg-gradient-to-r gba:from-primary gba:to-info gba:text-primary-foreground gba:font-semibold gba:shadow-md hover:gba:shadow-lg gba:transition-all gba:text-sm"
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

// Answer Output Renderer
export const AnswerOutputRenderer: React.FC<{ data: AnswerOutput; accessToken: string }> = ({ data, accessToken }) => {
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

  return (
    <div className="gba:flex gba:flex-col gba:gap-6 gba:w-full" data-testid="answer-output-renderer">
      {deduplicatedData.map((item, idx) => (
        <div key={idx} className="gba:pt-1">
          {renderDisplayData(item, idx, accessToken)}
        </div>
      ))}
    </div>
  )
}

// Output Item Renderer
export const OutputItemRenderer: React.FC<{
  item: OutputItem
  accessToken: string
  sendMessage?: (message: string, files: File[]) => void
}> = ({ item, accessToken, sendMessage }) => {
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
          <DynamicFormDisplay data={item} onCancel={() => sendMessage?.('Cancel', [])} sendMessage={sendMessage} />
        </FlowProposalBoundary>
      )
    default:
      return null
  }
}

export default OutputItemRenderer
