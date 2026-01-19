import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { FileText, Download, Table, Copy, AlertCircle, Clock } from 'lucide-react'
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
  accessToken: string
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
  // Helper function to format time duration
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
    } else {
      const days = Math.floor(minutes / 1440)
      const hours = Math.floor((minutes % 1440) / 60)
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`
    }
  }

  // Helper function to generate human-readable labels from field names
  const generateFieldLabel = (fieldName: string): string => {
    // Handle common field patterns
    const labelMap: { [key: string]: string } = {
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

    if (labelMap[fieldName]) {
      return labelMap[fieldName]
    }

    // Convert camelCase to Title Case
    return fieldName
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim()
  }

  // Helper function to format field values for display
  const formatFieldValue = (key: string, value: any): string => {
    if (value === null || value === undefined) {
      return '-'
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return 'None'
      return value.map(item => (typeof item === 'string' ? item : JSON.stringify(item))).join(', ')
    }

    // Handle dates
    if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
        }
      } catch {
        // Not a valid date, fall through to default handling
      }
    }

    // Handle booleans
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }

    // Handle objects (stringify)
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }

    // Convert to string and handle special cases
    const stringValue = String(value)

    // Format common field types
    if (key.toLowerCase().includes('email')) {
      return stringValue.toLowerCase()
    }

    if (key.toLowerCase().includes('phone')) {
      // Simple phone formatting (you can enhance this)
      return stringValue.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
    }

    return stringValue
  }

  return (
    <div className="gba:mt-0 gba:space-y-4">
      {/* Dynamic Step Data Section */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
              <Table className="gba:h-5 gba:w-5" />
              Step Data Details
              {isLoading && <Spinner className="gba:h-4 gba:w-4" />}
            </CardTitle>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Badge variant="outline">
                {stepDataMap.size} / {flowSteps.length} steps with data
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="gba:flex gba:items-center gba:gap-2"
                onClick={() => {
                  const csvContent = [
                    ['Step ID', 'Title', 'Status', 'Assigned To', 'Due Date', 'Completed At', 'Data Records'].join(','),
                    ...flowSteps.map(step =>
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
              >
                <Download className="gba:h-4 gba:w-4" />
                Export Step Data
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="gba:mb-4">
              <AlertCircle className="gba:h-4 gba:w-4" />
              <div>
                <h4 className="gba:font-semibold">Error Loading Step Data</h4>
                <p className="gba:text-sm gba:mt-1">{error}</p>
              </div>
            </Alert>
          )}

          {isLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
              <Spinner className="gba:h-8 gba:w-8" />
              <span className="gba:ml-2 gba:text-gray-600">Loading step data...</span>
            </div>
          ) : (
            <div className="gba:relative">
              {flowSteps.map((step, index) => {
                const stepData = stepDataMap.get(step.stepIndex)
                const isLast = index === flowSteps.length - 1

                return (
                  <div key={step.id} className="gba:relative gba:py-6">
                    {/* Vertical connector line */}
                    {!isLast && (
                      <div className="gba:absolute gba:left-3 gba:top-12 gba:bottom-0 gba:w-0.5 gba:bg-gray-200"></div>
                    )}
                    <div className="gba:flex gba:items-center gba:gap-3 gba:mb-4">
                      <div
                        className="gba:relative gba:flex gba:items-center gba:justify-center gba:w-6 gba:h-6 gba:rounded-full gba:text-xs gba:font-medium gba:border-2 gba:bg-white"
                        style={{
                          borderColor:
                            step.status === 'COMPLETED'
                              ? '#10b981'
                              : step.status === 'IN_PROGRESS'
                                ? '#3b82f6'
                                : '#e5e7eb',
                          backgroundColor:
                            step.status === 'COMPLETED'
                              ? '#10b981'
                              : step.status === 'IN_PROGRESS'
                                ? '#3b82f6'
                                : '#e5e7eb',
                          color: step.status === 'COMPLETED' || step.status === 'IN_PROGRESS' ? 'white' : '#6b7280'
                        }}
                      >
                        {index + 1}
                      </div>
                      <div className="gba:flex-1">
                        <h3 className="gba:font-semibold gba:text-base">{step.title}</h3>
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-gray-600">
                        <Badge variant="outline" className="gba:text-xs">
                          {step.status}
                        </Badge>
                        {step.completedAt && (
                          <span className="gba:text-green-600">
                            ✓ {new Date(step.completedAt).toLocaleDateString()}
                          </span>
                        )}
                        {step.completionTimeMinutes && (
                          <span className="gba:flex gba:items-center gba:gap-1">
                            <Clock className="gba:h-3 gba:w-3" />
                            {formatDuration(step.completionTimeMinutes)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Step Data Display - Show for all steps with data */}
                    {stepData ? (
                      <>
                        {/* Show status badge for non-completed steps with data */}
                        {step.status !== 'COMPLETED' && stepData.totalCount > 0 && (
                          <div className="gba:ml-9 gba:mb-2">
                            <Alert variant="default" className="gba:py-2">
                              <AlertCircle className="gba:h-4 gba:w-4" />
                              <div className="gba:text-sm">
                                Step is {step.status.toLowerCase().replace('_', ' ')} - showing partial data (
                                {stepData.totalCount} {stepData.totalCount === 1 ? 'submission' : 'submissions'})
                              </div>
                            </Alert>
                          </div>
                        )}
                        {stepData.totalCount === 1 ? (
                          // Single data entry - clean layout
                          <div className="gba:mt-3 gba:ml-9">
                            {/* Form-like grid layout */}
                            {stepData.data[0].formData && Object.keys(stepData.data[0].formData).length > 0 ? (
                              <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-3 lg:gba:grid-cols-4 xl:gba:grid-cols-5 gba:gap-4">
                                {Object.entries(stepData.data[0].formData).map(([key, value]) => (
                                  <div key={key} className="gba:space-y-1">
                                    <label className="gba:text-xs gba:font-medium gba:text-gray-700 gba:uppercase gba:tracking-wide">
                                      {generateFieldLabel(key)}
                                    </label>
                                    <div className="gba:bg-gray-50 gba:rounded gba:px-3 gba:py-2 gba:border gba:border-gray-200 gba:text-sm gba:text-gray-900">
                                      {formatFieldValue(key, value)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="gba:text-center gba:py-6 gba:text-gray-500 gba:text-sm">
                                No form data submitted
                              </div>
                            )}
                          </div>
                        ) : stepData.totalCount > 1 ? (
                          // Multiple data entries - table layout
                          <div className="gba:mt-3 gba:ml-9">
                            {(() => {
                              // Get all unique field keys from all data rows
                              const allFields = new Set<string>()
                              stepData.data.forEach(dataRow => {
                                if (dataRow.formData) {
                                  Object.keys(dataRow.formData).forEach(key => allFields.add(key))
                                }
                              })
                              const fieldKeys = Array.from(allFields)

                              return (
                                <div className="gba:rounded-lg gba:border gba:border-gray-200 gba:overflow-hidden">
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
                                      {stepData.data.map(dataRow => (
                                        <TableRow key={dataRow.taskId}>
                                          <TableCell>
                                            <div className="gba:flex gba:items-center gba:gap-2">
                                              <div className="gba:w-6 gba:h-6 gba:bg-gray-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-gray-600 gba:text-xs gba:font-medium">
                                                {dataRow.userName.charAt(0).toUpperCase()}
                                              </div>
                                              <div className="gba:flex gba:flex-col">
                                                <span className="gba:font-medium gba:text-sm">{dataRow.userName}</span>
                                                <span className="gba:text-xs gba:text-gray-500">{dataRow.userId}</span>
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <div className="gba:flex gba:flex-col">
                                              <span className="gba:text-sm">
                                                {new Date(dataRow.timestamp).toLocaleDateString()}
                                              </span>
                                              <span className="gba:text-xs gba:text-gray-500">
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
                                              onClick={() => {
                                                navigator.clipboard.writeText(JSON.stringify(dataRow, null, 2))
                                              }}
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
                              )
                            })()}
                            {stepData.hasMore && (
                              <div className="gba:text-center gba:py-4">
                                <Button variant="outline" size="sm">
                                  Load More ({stepData.totalCount - stepData.data.length} remaining)
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="gba:ml-9 gba:text-center gba:py-4 gba:text-gray-500 gba:text-sm">
                            <FileText className="gba:h-6 gba:w-6 gba:mx-auto gba:mb-1 gba:text-gray-400" />
                            <div>No data available for this step</div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="gba:ml-9 gba:text-center gba:py-4 gba:text-gray-500 gba:text-sm">
                        <FileText className="gba:h-6 gba:w-6 gba:mx-auto gba:mb-1 gba:text-gray-400" />
                        <div>No data available for this step</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
