import React, { useState, useEffect, useMemo } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
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
import type { StepDataRow, StepDataResponse } from '@/common/network/flows/useFlowProgressClient'
import { useEmployeeAvatarsBatch } from '@/business-apps/core/every/apps/every-box/hooks/useEmployeeAvatarsBatch'
import { buildFileUrl } from '@/common/utils/fileUtils'
import type { StepAssignmentInfo } from '../types'
import { useResolvedActorNames } from '../useResolvedActorNames'

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
  assignedToIds?: string[]
  eligibleUserIds?: string[]
  dueDate?: string
  completedAt?: string
  completionTimeMinutes?: number
  totalTasks?: number
  completedTasks?: number
}

interface DataTabProps {
  flowData: FlowDetailData
  flowSteps: FlowStep[]
  stepAssignmentsByStepIndex: Record<number, StepAssignmentInfo>
  accessToken?: string
}

interface NormalizedFileReference {
  fileName: string
  mimeType?: string
  uploadedAt?: string
  fileSize?: number
  downloadPath: string
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

function isFileLikeObject(value: unknown): value is Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, any>
  return Boolean(
    candidate.path ||
      candidate.downloadPath ||
      candidate.fileId ||
      candidate.fileName ||
      candidate.fileMetadata?.originalFileName
  )
}

function normalizeFileReference(value: unknown): NormalizedFileReference | null {
  if (!isFileLikeObject(value)) return null

  const fileMetadata = value.fileMetadata && typeof value.fileMetadata === 'object' ? value.fileMetadata : undefined
  const downloadPath = value.downloadPath || value.path
  const fileName = value.fileName || fileMetadata?.originalFileName || value.fileId

  if (!downloadPath || !fileName) return null

  return {
    fileName,
    mimeType: value.mimeType || fileMetadata?.mimeType,
    uploadedAt: value.uploadedAt || fileMetadata?.updatedAt,
    fileSize: typeof value.fileSize === 'number' ? value.fileSize : undefined,
    downloadPath
  }
}

function extractFileReferences(value: unknown): NormalizedFileReference[] {
  if (Array.isArray(value)) {
    return value.map(normalizeFileReference).filter((file): file is NormalizedFileReference => Boolean(file))
  }

  const normalized = normalizeFileReference(value)
  return normalized ? [normalized] : []
}

function isFileLikeValue(value: unknown): boolean {
  return extractFileReferences(value).length > 0
}

function formatFileSize(fileSize?: number): string | null {
  if (!fileSize || Number.isNaN(fileSize)) return null
  if (fileSize < 1024) return `${fileSize} B`
  if (fileSize < 1024 * 1024) return `${(fileSize / 1024).toFixed(1)} KB`
  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
}

function formatMimeTypeLabel(mimeType?: string): string | null {
  if (!mimeType) return null
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType === 'application/msword') return 'Word document'
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'Word document'
  if (mimeType === 'application/vnd.ms-excel') return 'Excel spreadsheet'
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'Excel spreadsheet'
  if (mimeType.startsWith('image/')) return 'Image'
  if (mimeType.startsWith('text/')) return 'Text file'
  return mimeType
}

async function downloadFile(downloadPath: string, fileName: string, accessToken?: string): Promise<void> {
  const fileUrl = accessToken
    ? await buildFileUrl({ path: downloadPath }, accessToken)
    : buildFileUrl({ path: downloadPath })

  const link = document.createElement('a')
  link.href = fileUrl
  link.download = fileName
  link.click()

  if (fileUrl.startsWith('blob:')) {
    URL.revokeObjectURL(fileUrl)
  }
}

interface FileValueDisplayProps {
  files: NormalizedFileReference[]
  accessToken?: string
  compact?: boolean
}

const FileValueDisplay: React.FC<FileValueDisplayProps> = ({ files, accessToken, compact = false }) => {
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloadingFileName, setDownloadingFileName] = useState<string | null>(null)

  const handleDownload = async (file: NormalizedFileReference) => {
    setDownloadError(null)
    setDownloadingFileName(file.fileName)

    try {
      await downloadFile(file.downloadPath, file.fileName, accessToken)
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Failed to download file')
    } finally {
      setDownloadingFileName(null)
    }
  }

  return (
    <div className={compact ? 'gba:space-y-1.5' : 'gba:space-y-2'}>
      {files.map(file => {
        const metaParts = [
          formatMimeTypeLabel(file.mimeType),
          formatFileSize(file.fileSize),
          file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : null
        ].filter(Boolean)

        return (
          <div
            key={`${file.downloadPath}-${file.fileName}`}
            className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:min-w-0"
          >
            <div className="gba:flex gba:min-w-0 gba:flex-1 gba:items-start gba:gap-2">
              <FileText className="gba:mt-0.5 gba:h-4 gba:w-4 gba:flex-shrink-0 gba:text-blue-500" />
              <div className="gba:min-w-0 gba:flex-1">
                <div className="gba:truncate gba:font-medium gba:text-foreground gba:text-sm" title={file.fileName}>
                  {file.fileName}
                </div>
                {metaParts.length ? (
                  <div className="gba:mt-0.5 gba:text-xs gba:text-muted-foreground">{metaParts.join(' • ')}</div>
                ) : null}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gba:h-7 gba:w-7 gba:flex-shrink-0 gba:p-0"
              onClick={() => void handleDownload(file)}
              title={`Download ${file.fileName}`}
              disabled={downloadingFileName === file.fileName}
            >
              <Download className="gba:h-4 gba:w-4" />
            </Button>
          </div>
        )
      })}

      {downloadError ? <div className="gba:text-xs gba:text-destructive">{downloadError}</div> : null}
    </div>
  )
}

interface FieldValueDisplayProps {
  fieldKey: string
  value: any
  accessToken?: string
  compact?: boolean
}

const FieldValueDisplay: React.FC<FieldValueDisplayProps> = ({ fieldKey, value, accessToken, compact = false }) => {
  const fileReferences = extractFileReferences(value)

  if (fileReferences.length > 0) {
    return <FileValueDisplay files={fileReferences} accessToken={accessToken} compact={compact} />
  }

  return (
    <div
      className={`gba:text-foreground ${compact ? 'gba:max-w-[300px] gba:truncate gba:text-sm' : 'gba:text-sm'}`}
      title={compact ? formatFieldValue(fieldKey, value) : undefined}
    >
      {formatFieldValue(fieldKey, value)}
    </div>
  )
}

interface SingleFormDataProps {
  formData: { [key: string]: any }
  accessToken?: string
}

const SingleFormData: React.FC<SingleFormDataProps> = ({ formData, accessToken }) => {
  const hasFormData = formData && Object.keys(formData).length > 0
  return (
    <div className="gba:mt-3">
      {hasFormData ? (
        <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-3 lg:gba:grid-cols-4 xl:gba:grid-cols-5 gba:gap-4">
          {Object.entries(formData).map(([key, value]) => (
            <div key={key} className="gba:space-y-1">
              <label className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                {isFileLikeValue(value) ? 'Document' : generateFieldLabel(key)}
              </label>
              <div className="gba:rounded gba:border gba:border-border gba:bg-muted/20 gba:px-3 gba:py-2">
                <FieldValueDisplay fieldKey={key} value={value} accessToken={accessToken} />
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
  data: Array<{
    taskId: string
    userId: string
    userName: string
    avatarUrl?: string
    timestamp?: string
    status?: string
    formData: { [key: string]: any }
    hasSubmission?: boolean
  }>
  totalCount: number
  accessToken?: string
}

const MultiRowDataTable: React.FC<MultiRowDataTableProps> = ({ data, totalCount, accessToken }) => {
  const allFields = new Set<string>()
  const submittedCount = data.filter(row => row.hasSubmission !== false).length
  for (const dataRow of data) {
    if (dataRow.formData) {
      for (const key of Object.keys(dataRow.formData)) allFields.add(key)
    }
  }
  const fieldKeys = Array.from(allFields)
  const fileLikeColumns = new Set(
    fieldKeys.filter(key => data.some(dataRow => isFileLikeValue(dataRow.formData?.[key])))
  )
  const showCopyColumn = data.some(
    dataRow => dataRow.hasSubmission !== false && !fieldKeys.some(key => isFileLikeValue(dataRow.formData?.[key]))
  )
  return (
    <div className="gba:mt-3">
      <div className="gba:overflow-hidden gba:rounded-lg gba:border gba:border-border">
        <TableComponent>
          <TableHeader>
            <TableRow>
              <TableHead className="gba:w-[220px]">Assignee</TableHead>
              <TableHead className="gba:w-[140px]">Status</TableHead>
              <TableHead className="gba:w-[180px]">Timestamp</TableHead>
              {fieldKeys.map(key => (
                <TableHead key={key}>{fileLikeColumns.has(key) ? 'Document' : generateFieldLabel(key)}</TableHead>
              ))}
              {showCopyColumn ? <TableHead className="gba:w-[60px]"></TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(dataRow => (
              <TableRow key={`${dataRow.taskId}-${dataRow.userId}`}>
                <TableCell>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Avatar className="gba:h-7 gba:w-7">
                      {dataRow.avatarUrl ? <AvatarImage src={dataRow.avatarUrl} alt={dataRow.userName} /> : null}
                      <AvatarFallback className="gba:text-[10px] gba:font-medium">
                        {getInitials(dataRow.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="gba:font-medium gba:text-sm">{dataRow.userName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={dataRow.hasSubmission ? 'secondary' : 'outline'} className="gba:text-xs">
                    {dataRow.status || (dataRow.hasSubmission ? 'Submitted' : 'Pending')}
                  </Badge>
                </TableCell>
                <TableCell>
                  {dataRow.timestamp ? (
                    <div className="gba:flex gba:flex-col">
                      <span className="gba:text-sm">{new Date(dataRow.timestamp).toLocaleDateString()}</span>
                      <span className="gba:text-xs gba:text-muted-foreground">
                        {new Date(dataRow.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ) : (
                    <span className="gba:text-sm gba:text-muted-foreground">-</span>
                  )}
                </TableCell>
                {fieldKeys.map(key => (
                  <TableCell key={key}>
                    <FieldValueDisplay
                      fieldKey={key}
                      value={dataRow.formData?.[key]}
                      accessToken={accessToken}
                      compact
                    />
                  </TableCell>
                ))}
                {showCopyColumn ? (
                  <TableCell>
                    {dataRow.hasSubmission !== false &&
                    !fieldKeys.some(key => isFileLikeValue(dataRow.formData?.[key])) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gba:h-8 gba:w-8 gba:p-0"
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(dataRow, null, 2))}
                        title="Copy to clipboard"
                      >
                        <Copy className="gba:h-4 gba:w-4" />
                      </Button>
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </TableComponent>
      </div>
      {totalCount > submittedCount && (
        <div className="gba:text-center gba:py-4">
          <Button variant="outline" size="sm">
            Load More ({totalCount - submittedCount} remaining)
          </Button>
        </div>
      )}
    </div>
  )
}

const ACTIVE_STEP_STATUSES = new Set(['IN_PROGRESS', 'RUNNING', 'CLAIMED', 'ACTIVE'])

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || '?'
}

function getPendingStatusLabel(step: FlowStep): string {
  if (step.status === 'COMPLETED') return 'Completed'
  if (ACTIVE_STEP_STATUSES.has(step.status.toUpperCase())) return 'Waiting'
  const normalized = step.status.toLowerCase().split('_').join(' ')
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export const DataTab: React.FC<DataTabProps> = ({ flowData, flowSteps, stepAssignmentsByStepIndex, accessToken }) => {
  const [stepDataMap, setStepDataMap] = useState<Map<number, StepDataResponse>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const contextForClient = {
    accessToken
    // Add other required properties as needed
  } as any // Temporary type assertion - ideally we'd get the full context from parent
  const { getStepDataByReference } = useFlowProgressClient(contextForClient)

  const assignmentUserIds = useMemo(
    () =>
      Array.from(
        new Set(
          flowSteps.flatMap(step => [
            ...(stepAssignmentsByStepIndex[step.stepIndex]?.assignedUserIds || []),
            ...(step.assignedToIds || []),
            ...(step.eligibleUserIds || [])
          ])
        )
      ),
    [flowSteps, stepAssignmentsByStepIndex]
  )
  const actorNames = useResolvedActorNames(accessToken, assignmentUserIds)
  const { employeeMap } = useEmployeeAvatarsBatch(accessToken || '', assignmentUserIds)

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

  const visibleSteps = flowSteps.filter(step => {
    const totalCount = stepDataMap.get(step.stepIndex)?.totalCount ?? 0
    const assigneeCount = new Set([
      ...(stepAssignmentsByStepIndex[step.stepIndex]?.assignedUserIds || []),
      ...(step.assignedToIds || []),
      ...(step.eligibleUserIds || [])
    ]).size
    const hasPendingAssignments =
      typeof step.totalTasks === 'number' &&
      typeof step.completedTasks === 'number' &&
      step.totalTasks > step.completedTasks

    return (
      totalCount > 0 ||
      (ACTIVE_STEP_STATUSES.has(step.status.toUpperCase()) && (assigneeCount > 0 || hasPendingAssignments))
    )
  })

  return (
    <div className="gba:mt-0 gba:space-y-4">
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
        <Badge variant="outline">{visibleSteps.length} steps shown</Badge>
        <Button
          variant="outline"
          size="sm"
          className="gba:flex gba:items-center gba:gap-2"
          onClick={() => {
            const csvContent = [
              ['Step ID', 'Title', 'Status', 'Assigned To', 'Due Date', 'Completed At', 'Data Records'].join(','),
              ...visibleSteps.map(step =>
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
          disabled={!visibleSteps.length}
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
      ) : visibleSteps.length ? (
        <div className="gba:space-y-4">
          {visibleSteps.map(step => {
            const stepData = stepDataMap.get(step.stepIndex)
            const submittedRows = stepData?.data || []
            const submittedByUserId = new Map<string, StepDataRow>()

            submittedRows.forEach(row => {
              const existingRow = submittedByUserId.get(row.userId)
              if (!existingRow || new Date(row.timestamp).getTime() > new Date(existingRow.timestamp).getTime()) {
                submittedByUserId.set(row.userId, row)
              }
            })

            const participantIds = [
              ...new Set([
                ...(stepAssignmentsByStepIndex[step.stepIndex]?.assignedUserIds || []),
                ...(step.assignedToIds || []),
                ...(step.eligibleUserIds || []),
                ...submittedRows.map(row => row.userId)
              ])
            ]

            const participantRows = participantIds.map(userId => {
              const submittedRow = submittedByUserId.get(userId)
              const employee = employeeMap.get(userId)
              return {
                taskId: submittedRow?.taskId || `${step.id}-${userId}`,
                userId,
                userName: submittedRow?.userName || employee?.displayName || actorNames[userId] || userId,
                avatarUrl: employee?.avatarUrl,
                timestamp: submittedRow?.timestamp,
                status: submittedRow ? 'Submitted' : getPendingStatusLabel(step),
                formData: submittedRow?.inputData || {},
                hasSubmission: Boolean(submittedRow)
              }
            })

            const tableRows =
              participantRows.length > 0
                ? participantRows
                : submittedRows.map(row => ({
                    taskId: row.taskId,
                    userId: row.userId,
                    userName:
                      row.userName || employeeMap.get(row.userId)?.displayName || actorNames[row.userId] || row.userId,
                    avatarUrl: employeeMap.get(row.userId)?.avatarUrl,
                    timestamp: row.timestamp,
                    status: 'Submitted',
                    formData: row.inputData,
                    hasSubmission: true
                  }))

            const shouldRenderTable = tableRows.length > 1

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
                      {(stepData?.totalCount ?? 0) === 1 ? '1 record' : `${stepData?.totalCount ?? 0} records`}
                    </Badge>
                    {tableRows.length > 0 ? (
                      <Badge variant="outline" className="gba:text-xs">
                        {tableRows.length} {tableRows.length === 1 ? 'assignee' : 'assignees'}
                      </Badge>
                    ) : null}
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

                {shouldRenderTable ? (
                  <MultiRowDataTable
                    data={tableRows}
                    totalCount={stepData?.totalCount ?? 0}
                    accessToken={accessToken}
                  />
                ) : submittedRows.length === 1 ? (
                  <div className="gba:space-y-3">
                    <div className="gba:rounded-md gba:border gba:border-border gba:bg-muted/20 gba:px-3 gba:py-3">
                      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Avatar className="gba:h-8 gba:w-8">
                            {tableRows[0]?.avatarUrl ? (
                              <AvatarImage src={tableRows[0].avatarUrl} alt={tableRows[0].userName} />
                            ) : null}
                            <AvatarFallback className="gba:text-xs gba:font-medium">
                              {getInitials(tableRows[0]?.userName || submittedRows[0].userName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="gba:flex gba:flex-col">
                            <span className="gba:text-sm gba:font-medium gba:text-foreground">
                              {tableRows[0]?.userName || submittedRows[0].userName}
                            </span>
                          </div>
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          {submittedRows[0].timestamp ? (
                            <span className="gba:text-xs gba:text-muted-foreground">
                              {new Date(submittedRows[0].timestamp).toLocaleString()}
                            </span>
                          ) : null}
                          <Badge variant="secondary" className="gba:text-xs">
                            Submitted
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <SingleFormData formData={submittedRows[0].inputData} accessToken={accessToken} />
                  </div>
                ) : tableRows.length === 1 ? (
                  <div className="gba:rounded-md gba:border gba:border-border gba:bg-muted/20 gba:px-3 gba:py-3">
                    <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Avatar className="gba:h-8 gba:w-8">
                          {tableRows[0].avatarUrl ? (
                            <AvatarImage src={tableRows[0].avatarUrl} alt={tableRows[0].userName} />
                          ) : null}
                          <AvatarFallback className="gba:text-xs gba:font-medium">
                            {getInitials(tableRows[0].userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="gba:flex gba:flex-col">
                          <span className="gba:text-sm gba:font-medium gba:text-foreground">
                            {tableRows[0].userName}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="gba:text-xs">
                        {tableRows[0].status}
                      </Badge>
                    </div>
                    <div className="gba:mt-2 gba:text-sm gba:text-muted-foreground">No submitted data yet.</div>
                  </div>
                ) : (
                  <div className="gba:rounded-md gba:border gba:border-dashed gba:border-border gba:bg-muted/10 gba:px-3 gba:py-4 gba:text-sm gba:text-muted-foreground">
                    No submitted data yet.
                  </div>
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
