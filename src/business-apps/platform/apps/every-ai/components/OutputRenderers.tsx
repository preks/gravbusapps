import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import type {
  OutputItem,
  AnswerOutput,
  DisplayData,
  TextBlockData,
  TableData,
  BarGraphData,
  ScatterGraphData,
  CalendarViewData,
  EntityData
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
import ServiceTicketDisplay from './entities/ServiceTicketDisplay'
import CrmNoteDisplay from './entities/CrmNoteDisplay'
import CrmDocumentDisplay from './entities/CrmDocumentDisplay'
import IrmNoteDisplay from './entities/IrmNoteDisplay'
import IrmDocumentDisplay from './entities/IrmDocumentDisplay'
import EntityLink, { markdownUrlTransform } from './links/EntityLink'

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
        <span className="gba:text-xs">🛠️</span>
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
    case 'expense_item':
      return <ExpenseDisplay key={item.id} expenseId={item.id} accessToken={accessToken} operation={item.operation} />
    case 'investment_lead':
      return <LeadDisplay key={item.id} leadId={item.id} accessToken={accessToken} operation={item.operation} />
    case 'investment_contact':
      return <ContactDisplay key={item.id} contactId={item.id} accessToken={accessToken} operation={item.operation} />
    case 'absence':
    case 'employee_absence':
      return <AbsenceDisplay key={item.id} absenceId={item.id} accessToken={accessToken} operation={item.operation} />
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

// File Display
export const FileDisplay: React.FC<{ data: { filename: string; mimeType: string; content: string } }> = ({ data }) => {
  return (
    <Card data-testid="file-display">
      <CardContent className="gba:p-4">
        <div className="gba:flex gba:items-center gba:gap-3">
          <svg className="gba:h-8 gba:w-8 gba:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <div className="gba:flex-1">
            <p className="gba:text-sm gba:font-medium">{data.filename}</p>
            <p className="gba:text-xs gba:text-muted-foreground">{data.mimeType}</p>
          </div>
          <a
            href={`data:${data.mimeType};base64,${data.content}`}
            download={data.filename}
            className="gba:text-sm gba:text-primary hover:gba:underline"
          >
            Download
          </a>
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
    case 'entity':
      return renderEntity(item, accessToken)
    case 'file':
      return <FileDisplay key={idx} data={item} />
    default:
      return null
  }
}

// Answer Output Renderer
export const AnswerOutputRenderer: React.FC<{ data: AnswerOutput; accessToken: string }> = ({ data, accessToken }) => {
  return (
    <div className="gba:flex gba:flex-col gba:gap-6 gba:w-full" data-testid="answer-output-renderer">
      {data.displayData.map((item, idx) => (
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
      return <DynamicFormDisplay data={item} onCancel={() => {}} sendMessage={sendMessage} />
    default:
      return null
  }
}

export default OutputItemRenderer
