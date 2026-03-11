import React, { useState, useEffect } from 'react'
import {
  Button,
  Badge,
  Alert,
  Spinner,
  Table as TableComponent,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@newwork/nw-design-system'
import { FileText, Download, Copy, AlertCircle } from 'lucide-react'
import { useFlowProgressClient } from '@/common/network/flows/useFlowProgressClient'

// Interfaces for the Data tab
interface StepStatus {
  completed: number
  total: number
  remaining: number
}

interface ProcessHealth {
  isOnTrack: boolean
  hasFailures: boolean
  isStalled: boolean
  statusMessage: string
}

interface TimeInsights {
  avgStepDurationMinutes?: number
  avgTaskCompletionMinutes?: number
  estimatedCompletionDate?: string
  isOverdue: boolean
  minutesRunning: number
  minutesSinceLastUpdate: number
  workflowStartTime: string
  lastActivityTime?: string
}

interface StepDataRow {
  flowId: string
  taskId: string
  userId: string
  userName: string
  timestamp: string
  stepTitle: string
  formData: { [key: string]: any }
}

interface StepDataResponse {
  data: StepDataRow[]
  totalCount: number
  hasMore: boolean
  stepIndex: number
  flowId: string
  pagination: {
    offset: number
    limit: number
  }
}

interface FlowDetailData {
  flowId: string
  flowName: string
  templateId: string
  status: string
  startTime: string
  updateTime: string
  endTime?: string
  progressPercentage: number
  stepStatus: StepStatus
  currentStep: number
  processHealth: ProcessHealth
  timeInsights: TimeInsights
  durationHours?: number
  durationMinutes?: number
}

interface FlowStep {
  id: string
  title: string
  status: string
  stepIndex: number
  assignedTo?: string
  dueDate?: string
  completedAt?: string
  completionTimeMinutes?: number
}

interface DataTabProps {
  flowData: FlowDetailData
  flowSteps: FlowStep[]
  accessToken?: string
}

const FIELD_LABEL_MAP: Record<string, string> = {
  startDate: 'Start Date',
  endDate: 'End Date',
  employeeName: 'Employee Name',
  laptopType: 'Laptop Type',
  accessories: 'Accessories',
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email Address',
  phone: 'Phone Number',
  department: 'Department',
  position: 'Position',
  manager: 'Manager',
  requestType: 'Request Type',
  priority: 'Priority',
  description: 'Description',
  comments: 'Comments',
  approvalStatus: 'Approval Status',
  dueDate: 'Due Date',
  completedDate: 'Completed Date',
  assignedTo: 'Assigned To',
  createdBy: 'Created By',
  modifiedBy: 'Modified By',
  status: 'Status',
  amount: 'Amount',
  currency: 'Currency',
  category: 'Category',
  subcategory: 'Subcategory'
}

function generateFieldLabel(fieldName: string): string {
  if (FIELD_LABEL_MAP[fieldName]) return FIELD_LABEL_MAP[fieldName]
  const spaced = Array.from(fieldName)
    .map((c, i) => (i > 0 && c >= 'A' && c <= 'Z' ? ' ' + c : c))
    .join('')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function formatFieldValue(key: string, value: any): string {
  if (value === null || value === undefined) return '-'
  if (Array.isArray(value)) {
    if (value.length === 0) return 'None'
    return value.map(item => (typeof item === 'string' ? item : JSON.stringify(item))).join(', ')
  }
  if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
    try {
      const date = new Date(value)
      if (!Number.isNaN(date.getTime())) return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
    } catch {
      /* not a valid date */
    }
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  const stringValue = String(value)
  if (key.toLowerCase().includes('email')) return stringValue.toLowerCase()
  if (key.toLowerCase().includes('phone')) return stringValue.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
  return stringValue
}

interface SingleFormDataProps {
  formData: { [key: string]: any }
}

const SingleFormData: React.FC<SingleFormDataProps> = ({ formData }) => {
  const hasFormData = formData && Object.keys(formData).length > 0
  return (
    <div className="gba:mt-3">
      {hasFormData ? (
        <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-3 lg:gba:grid-cols-4 xl:gba:grid-cols-5 gba:gap-4">
          {Object.entries(formData).map(([key, value]) => (
            <div key={key} className="gba:space-y-1">
              <label className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                {generateFieldLabel(key)}
              </label>
              <div className="gba:rounded gba:border gba:border-border gba:bg-muted/30 gba:px-3 gba:py-2 gba:text-sm gba:text-foreground">
                {formatFieldValue(key, value)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="gba:py-6 gba:text-center gba:text-sm gba:text-muted-foreground">No form data submitted</div>
      )}
    </div>
  )
}

interface MultiRowDataTableProps {
  data: StepDataRow[]
  totalCount: number
}

const MultiRowDataTable: React.FC<MultiRowDataTableProps> = ({ data, totalCount }) => {
  const allFields = new Set<string>()
  for (const dataRow of data) {
    if (dataRow.formData) {
      for (const key of Object.keys(dataRow.formData)) allFields.add(key)
    }
  }
  const fieldKeys = Array.from(allFields)
  return (
    <div className="gba:mt-3">
      <div className="gba:overflow-hidden gba:rounded-lg gba:border gba:border-border">
        <TableComponent>
          <TableHeader>
            <TableRow>
              <TableHead className="gba:w-[200px]">Submitted By</TableHead>
              <TableHead className="gba:w-[180px]">Timestamp</TableHead>
              {fieldKeys.map(key => (
                <TableHead key={key}>{generateFieldLabel(key)}</TableHead>
              ))}
              <TableHead className="gba:w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(dataRow => (
              <TableRow key={dataRow.taskId}>
                <TableCell>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:flex gba:h-6 gba:w-6 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted gba:text-xs gba:font-medium gba:text-muted-foreground">
                      {dataRow.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="gba:flex gba:flex-col">
                      <span className="gba:font-medium gba:text-sm">{dataRow.userName}</span>
                      <span className="gba:text-xs gba:text-muted-foreground">{dataRow.userId}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="gba:flex gba:flex-col">
                    <span className="gba:text-sm">{new Date(dataRow.timestamp).toLocaleDateString()}</span>
                    <span className="gba:text-xs gba:text-muted-foreground">
                      {new Date(dataRow.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </TableCell>
                {fieldKeys.map(key => (
                  <TableCell key={key}>
                    <div
                      className="gba:text-sm gba:max-w-[300px] gba:truncate"
                      title={formatFieldValue(key, dataRow.formData?.[key])}
                    >
                      {formatFieldValue(key, dataRow.formData?.[key])}
                    </div>
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gba:h-8 gba:w-8 gba:p-0"
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(dataRow, null, 2))}
                    title="Copy to clipboard"
                  >
                    <Copy className="gba:h-4 gba:w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableComponent>
      </div>
      {totalCount > data.length && (
        <div className="gba:text-center gba:py-4">
          <Button variant="outline" size="sm">
            Load More ({totalCount - data.length} remaining)
          </Button>
        </div>
      )}
    </div>
  )
}

export const DataTab: React.FC<DataTabProps> = ({ flowData, flowSteps, accessToken }) => {
  const [stepDataMap, setStepDataMap] = useState<Map<number, StepDataResponse>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const contextForClient = {
    accessToken
    // Add other required properties as needed
  } as any // Temporary type assertion - ideally we'd get the full context from parent
  const { getStepDataByReference } = useFlowProgressClient(contextForClient)

  // Load step data for all steps (including non-completed) - only on tab selection
  const loadStepData = async () => {
    if (hasLoaded || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const stepDataPromises = flowSteps
        // Load data for all steps, not just completed ones
        .map(async step => {
          try {
            // Use new clean API with step reference
            const stepReference = `step_${step.stepIndex}`
            const stepData = await getStepDataByReference(flowData.flowId, stepReference, { limit: 20 })
            return { stepIndex: step.stepIndex, data: stepData }
          } catch (err) {
            console.warn(`Failed to load data for step ${step.stepIndex}:`, err)
            return null
          }
        })

      const stepDataResults = await Promise.all(stepDataPromises)
      const newStepDataMap = new Map<number, StepDataResponse>()

      stepDataResults.forEach(result => {
        if (result) {
          newStepDataMap.set(result.stepIndex, result.data)
        }
      })

      setStepDataMap(newStepDataMap)
      setHasLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load step data')
    } finally {
      setIsLoading(false)
    }
  }

  // Load data when component mounts (tab is selected)
  useEffect(() => {
    if (flowData.flowId && accessToken && flowSteps.length > 0) {
      loadStepData()
    }
  }, []) // Empty dependency array - load once on mount

  const stepsWithData = flowSteps.filter(step => (stepDataMap.get(step.stepIndex)?.totalCount ?? 0) > 0)

  return (
    <div className="gba:mt-0 gba:space-y-4">
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
        <Badge variant="outline">{stepsWithData.length} steps with data</Badge>
        <Button
          variant="outline"
          size="sm"
          className="gba:flex gba:items-center gba:gap-2"
          onClick={() => {
            const csvContent = [
              ['Step ID', 'Title', 'Status', 'Assigned To', 'Due Date', 'Completed At', 'Data Records'].join(','),
              ...stepsWithData.map(step =>
                [
                  step.id,
                  `"${step.title}"`,
                  step.status,
                  step.assignedTo || '',
                  step.dueDate || '',
                  step.completedAt || '',
                  stepDataMap.get(step.stepIndex)?.totalCount || 0
                ].join(',')
              )
            ].join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `flow-${flowData.flowId}-steps.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}
          disabled={!stepsWithData.length}
        >
          <Download className="gba:h-4 gba:w-4" />
          Export Step Data
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="gba:h-4 gba:w-4" />
          <div>
            <h4 className="gba:font-semibold">Error Loading Step Data</h4>
            <p className="gba:mt-1 gba:text-sm">{error}</p>
          </div>
        </Alert>
      )}

      {isLoading ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Spinner className="gba:h-8 gba:w-8" />
          <span className="gba:ml-2 gba:text-muted-foreground">Loading step data...</span>
        </div>
      ) : stepsWithData.length ? (
        <div className="gba:space-y-4">
          {stepsWithData.map(step => {
            const stepData = stepDataMap.get(step.stepIndex)
            if (!stepData) return null

            return (
              <div
                key={step.id}
                className="gba:space-y-4 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-4"
              >
                <div className="gba:flex gba:flex-wrap gba:items-start gba:justify-between gba:gap-3">
                  <div className="gba:min-w-0 gba:flex-1">
                    <h3 className="gba:text-base gba:font-semibold gba:text-foreground">{step.title}</h3>
                  </div>
                  <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                    <Badge variant="outline" className="gba:text-xs">
                      {step.status}
                    </Badge>
                    <Badge variant="secondary" className="gba:text-xs">
                      {stepData.totalCount} {stepData.totalCount === 1 ? 'record' : 'records'}
                    </Badge>
                  </div>
                </div>

                {step.status !== 'COMPLETED' ? (
                  <Alert variant="default" className="gba:py-2">
                    <AlertCircle className="gba:h-4 gba:w-4" />
                    <div className="gba:text-sm">
                      Step is {step.status.toLowerCase().split('_').join(' ')} and currently shows captured partial
                      data.
                    </div>
                  </Alert>
                ) : null}

                {stepData.totalCount === 1 ? (
                  <SingleFormData formData={stepData.data[0].formData} />
                ) : (
                  <MultiRowDataTable data={stepData.data} totalCount={stepData.totalCount} />
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-muted/20 gba:px-4 gba:py-10 gba:text-center gba:text-sm gba:text-muted-foreground">
          <FileText className="gba:mx-auto gba:mb-2 gba:h-6 gba:w-6" />
          No step data captured yet.
        </div>
      )}
    </div>
  )
}
