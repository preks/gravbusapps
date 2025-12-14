import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import { Calendar, Clock, RefreshCw, CheckCircle, Bot } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { MarkdownRenderer } from './components/MarkdownRenderer'

/**
 * Parse TableData from Python repr string format
 * Example: "displayData=[TableData(type='table', columnsTitles=['Name', 'Value'], rowsContents=[['A', '1'], ['B', '2']])]"
 */
function parseTableDataFromMessage(
  message: string
): { columnsTitles: string[]; rowsContents: string[][]; title?: string; description?: string } | null {
  try {
    // Try to extract TableData from the message string
    // Match the entire TableData(...) structure
    const tableDataMatch = message.match(/TableData\([^)]+\)/)
    if (!tableDataMatch) return null

    const tableDataStr = tableDataMatch[0]

    // Extract columnsTitles - match array of strings
    const columnsMatch = tableDataStr.match(/columnsTitles=\[([^\]]+)\]/)
    if (!columnsMatch) return null

    // Parse columns - extract quoted strings
    const columnsStr = columnsMatch[1]
    const columnsTitles: string[] = []
    const columnRegex = /['"]([^'"]+)['"]/g
    let columnMatch
    while ((columnMatch = columnRegex.exec(columnsStr)) !== null) {
      columnsTitles.push(columnMatch[1])
    }

    if (columnsTitles.length === 0) return null

    // Extract rowsContents - match nested array structure
    // This regex finds the rowsContents array content
    const rowsMatch = tableDataStr.match(/rowsContents=\[(.*?)\]/s)
    if (!rowsMatch) return null

    const rowsStr = rowsMatch[1]
    const rowsContents: string[][] = []

    // Find all row arrays [['cell1', 'cell2'], ['cell3', 'cell4']]
    const rowArrayRegex = /\[(.*?)\]/gs
    let rowMatch
    while ((rowMatch = rowArrayRegex.exec(rowsStr)) !== null) {
      const rowStr = rowMatch[1]
      const row: string[] = []

      // Extract cells from this row
      const cellRegex = /['"]([^'"]+)['"]/g
      let cellMatch
      while ((cellMatch = cellRegex.exec(rowStr)) !== null) {
        row.push(cellMatch[1])
      }

      if (row.length > 0) {
        rowsContents.push(row)
      }
    }

    if (rowsContents.length === 0) return null

    // Extract title and description if present
    const titleMatch = tableDataStr.match(/title=['"]([^'"]+)['"]/)
    const descriptionMatch = tableDataStr.match(/description=['"]([^'"]+)['"]/)

    return {
      columnsTitles,
      rowsContents,
      title: titleMatch ? titleMatch[1] : undefined,
      description: descriptionMatch ? descriptionMatch[1] : undefined
    }
  } catch (error) {
    console.error('Failed to parse TableData from message:', error)
    return null
  }
}

/**
 * Render TableData as a beautiful table component with proper handling of long content
 */
function renderTableData(tableData: {
  columnsTitles: string[]
  rowsContents: string[][]
  title?: string
  description?: string
}) {
  return (
    <div className="gba:space-y-3">
      {tableData.title && (
        <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-2">{tableData.title}</h3>
      )}
      {tableData.description && (
        <p className="gba:text-sm gba:text-muted-foreground gba:mb-3">{tableData.description}</p>
      )}
      <div className="gba:overflow-x-auto gba:rounded-lg gba:border gba:border-border gba:shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              {tableData.columnsTitles.map((column, idx) => (
                <TableHead
                  key={idx}
                  className="gba:bg-muted/50 gba:font-semibold gba:text-muted-foreground gba:py-3 gba:px-4 gba:whitespace-nowrap"
                >
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.rowsContents.map((row, rowIdx) => (
              <TableRow key={rowIdx} className="gba:hover:bg-muted/30">
                {row.map((cell, cellIdx) => {
                  const cellContent = String(cell || '').trim()
                  const isEmpty = !cellContent || cellContent === ''
                  const isLong = cellContent.length > 200

                  return (
                    <TableCell
                      key={cellIdx}
                      className={`gba:py-3 gba:px-4 gba:max-w-xs gba:break-words ${
                        isEmpty ? 'gba:text-muted-foreground/50 gba:italic' : 'gba:text-foreground'
                      }`}
                      title={isLong ? cellContent : undefined}
                    >
                      {isEmpty ? (
                        <span className="gba:text-xs">—</span>
                      ) : isLong ? (
                        <div className="gba:max-h-32 gba:overflow-y-auto">{cellContent}</div>
                      ) : (
                        cellContent
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

/**
 * Props for the scheduled task result form
 */
interface ScheduledTaskResultProps extends BusinessAppContextProps {
  onClose?: () => void
}

/**
 * Extended additionalData interface for scheduled task results
 */
interface ScheduledTaskAdditionalData {
  [k: string]: unknown
  message?: string
  title?: string
  tags?: {
    app?: string
    taskId?: string
    taskName?: string
    createdVia?: string
  }
  psi_taskPayload?: {
    [k: string]: unknown
  }
  psi_processMetadata?: {
    [k: string]: unknown
  }
  psi_taskStatus?: string
  psi_taskCompletedAt?: string
  scheduledAt?: string
  dueDate?: string
}

/**
 * ScheduledTaskResult - A form component for displaying scheduled task results
 * in the EveryBox inbox with beautiful markdown rendering.
 */
const ScheduledTaskResultContent: React.FC<ScheduledTaskResultProps> = ({
  accessToken,
  additionalData
  // userInfo and onClose are available for future use
}) => {
  const [isCompleting, setIsCompleting] = useState(false)

  // Cast additionalData to extended interface
  const taskData = additionalData as ScheduledTaskAdditionalData | undefined

  // Extract task information
  const message = taskData?.message || ''
  const title = taskData?.title || taskData?.tags?.taskName || 'Scheduled Task Result'
  const taskName = taskData?.tags?.taskName || 'Scheduled Task'
  const scheduledTaskId = taskData?.tags?.taskId
  const scheduledAt = taskData?.scheduledAt
  const processMetadata = taskData?.psi_processMetadata || {}
  const taskStatus = taskData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const taskCompletedAt = processMetadata?.completedAt || taskData?.psi_taskCompletedAt
  const isTaskCompleted = taskStatus === 'COMPLETED' || !!taskCompletedAt

  // Format the scheduled time
  const formattedScheduledAt = useMemo(() => {
    if (!scheduledAt) return null
    try {
      const date = new Date(scheduledAt)
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return scheduledAt
    }
  }, [scheduledAt])

  // Handle task completion (acknowledge/dismiss)
  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      // Dispatch process continue event to mark the task as complete
      dispatchProcessContinueEvent(new CustomEvent('process-continue'), {
        acknowledged: true,
        completedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to complete task:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <TaskFormLayout>
      {/* Header */}
      <TaskDetailHeader
        title={title}
        subtitle={
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground">
            <Bot className="gba:h-4 gba:w-4" />
            <span>Automated report from EveryAI</span>
          </div>
        }
        badge={<Badge variant={isTaskCompleted ? 'success' : 'info'}>{isTaskCompleted ? 'Completed' : 'New'}</Badge>}
      />

      {/* Main Content */}
      <div className="gba:flex-1 gba:overflow-auto gba:p-6 gba:space-y-6">
        {/* Task Metadata Card */}
        <Card>
          <CardHeader className="gba:pb-3">
            <CardTitle className="gba:text-lg gba:flex gba:items-center gba:gap-2">
              <RefreshCw className="gba:h-5 gba:w-5 gba:text-primary" />
              {taskName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:flex gba:flex-wrap gba:gap-4 gba:text-sm gba:text-muted-foreground">
              {formattedScheduledAt && (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Calendar className="gba:h-4 gba:w-4" />
                  <span>Executed: {formattedScheduledAt}</span>
                </div>
              )}
              {scheduledTaskId && (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Clock className="gba:h-4 gba:w-4" />
                  <span>Task ID: {scheduledTaskId.slice(0, 8)}...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card className="gba:overflow-hidden">
          <CardHeader className="gba:pb-3">
            <CardTitle className="gba:text-lg">Results</CardTitle>
          </CardHeader>
          <CardContent className="gba:p-6">
            {message ? (
              (() => {
                // Try to parse TableData from the message (for Python repr format)
                const tableData = parseTableDataFromMessage(message)

                if (tableData && tableData.columnsTitles.length > 0 && tableData.rowsContents.length > 0) {
                  // Render as a beautiful table
                  return renderTableData(tableData)
                } else {
                  // Check if message is already a markdown table or contains markdown
                  // Clean up any JSON wrapping if present
                  let cleanMessage = message.trim()

                  // If message looks like JSON with a "message" field, extract it
                  if (cleanMessage.startsWith('{') && cleanMessage.includes('"message"')) {
                    try {
                      const parsed = JSON.parse(cleanMessage)
                      if (parsed.message && typeof parsed.message === 'string') {
                        cleanMessage = parsed.message
                      }
                    } catch {
                      // Not valid JSON, use as-is
                    }
                  }

                  // Fall back to markdown rendering (handles markdown tables beautifully)
                  return (
                    <div className="gba:w-full">
                      <MarkdownRenderer content={cleanMessage} accessToken={accessToken} />
                    </div>
                  )
                }
              })()
            ) : (
              <p className="gba:text-muted-foreground gba:italic">No results available for this scheduled task.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer with actions */}
      {!isTaskCompleted && (
        <TaskDetailFooter>
          <Button variant="default" onClick={handleComplete} disabled={isCompleting} className="gba:gap-2">
            {isCompleting ? <Spinner className="gba:h-4 gba:w-4" /> : <CheckCircle className="gba:h-4 gba:w-4" />}
            {isCompleting ? 'Acknowledging...' : 'Acknowledge'}
          </Button>
        </TaskDetailFooter>
      )}
    </TaskFormLayout>
  )
}

/**
 * Main export with error boundary wrapper
 */
export const ScheduledTaskResult: React.FC<ScheduledTaskResultProps> = props => {
  return <ScheduledTaskResultContent {...props} />
}

export default ScheduledTaskResult
