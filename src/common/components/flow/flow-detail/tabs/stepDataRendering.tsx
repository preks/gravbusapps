import React, { useEffect, useState } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Badge,
  Table as TableComponent,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@newwork/nw-design-system'
import { FileText, Download, Copy, Eye } from 'lucide-react'
import type { StepDataResponse } from '@/common/network/flows/useFlowProgressClient'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown'
import { handleDocumentClick } from '@/common/utils/documentClickHandler'
import { buildFileUrl } from '@/common/utils/fileUtils'
import type { FlowStep, StepAssignmentInfo } from '../types'

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

export function generateFieldLabel(fieldName: string): string {
  if (FIELD_LABEL_MAP[fieldName]) return FIELD_LABEL_MAP[fieldName]
  const spaced = Array.from(fieldName)
    .map((c, i) => (i > 0 && c >= 'A' && c <= 'Z' ? ' ' + c : c))
    .join('')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

// HTTP envelope metadata can leak into captured data from connector/function
// responses. These fields are transport details, not business output.
const TRANSPORT_FIELD_KEYS = new Set([
  'date',
  'server',
  'connection',
  'keepalive',
  'transferencoding',
  'contenttype',
  'contentlength',
  'contentencoding',
  'contentdisposition',
  'cachecontrol',
  'statuscode',
  'reasonphrase',
  'httpversion',
  'headers',
  'xpoweredby',
  'etag',
  'vary'
])

export function normalizeFieldKey(fieldKey: string): string {
  return fieldKey.replace(/[^a-z0-9]/gi, '').toLowerCase()
}

export function isHiddenTransportField(fieldKey: string): boolean {
  return TRANSPORT_FIELD_KEYS.has(normalizeFieldKey(fieldKey))
}

function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (Array.isArray(value)) {
    if (value.length === 0) return 'None'
    return value.map(item => (typeof item === 'string' ? item : JSON.stringify(item))).join(', ')
  }
  if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
    try {
      const date = new Date(value as string)
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

function shouldRenderStringAsMarkdown(value: unknown, fieldKey: string): value is string {
  if (typeof value !== 'string') return false

  const trimmed = value.trim()
  if (!trimmed) return false

  const keyLower = fieldKey.toLowerCase()
  if ((keyLower.includes('email') || keyLower.includes('phone')) && !trimmed.includes('\n') && trimmed.length <= 120) {
    return false
  }

  if (keyLower.includes('date') || keyLower.includes('time')) {
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const date = new Date(trimmed)
      if (!Number.isNaN(date.getTime())) return false
    }
  }

  return true
}

function renderMarkdownFieldValue(
  fieldKey: string,
  value: string,
  accessToken: string | undefined,
  compact: boolean
): React.ReactNode {
  return (
    <div
      className={`gba:text-sm gba:break-words ${compact ? 'gba:max-w-[500px]' : ''}`}
      data-testid={`flow-detail-markdown-field-${fieldKey}`}
    >
      <MarkdownWithChipsRenderer
        content={enhanceMarkdownContent(value)}
        accessToken={accessToken}
        variant="default"
        className="gba:[&_p]:gba:mb-0 gba:[&_p+p]:gba:mt-2 gba:leading-relaxed"
        data-testid={`flow-detail-markdown-content-${fieldKey}`}
      />
    </div>
  )
}

function normalizeMarkdownEntityProtocols(content: string): string {
  return content.replace(/document:\/\//g, 'content_document://')
}

function isMarkdownWhitespaceChar(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r'
}

/** Returns true when content contains a numbered-list marker "digit(s). " (ReDoS-safe). */
function containsNumberedListMarker(content: string): boolean {
  for (let i = 0; i < content.length - 1; i += 1) {
    if (content[i] !== '.' || content[i + 1] !== ' ') continue

    let digitIndex = i - 1
    if (digitIndex < 0 || content[digitIndex] < '0' || content[digitIndex] > '9') continue

    while (digitIndex > 0 && content[digitIndex - 1] >= '0' && content[digitIndex - 1] <= '9') {
      digitIndex -= 1
    }
    return true
  }
  return false
}

function lineStartsWithNumberedListMarker(line: string): boolean {
  let index = 0
  while (index < line.length && isMarkdownWhitespaceChar(line[index])) index += 1

  const numberStart = index
  while (index < line.length && line[index] >= '0' && line[index] <= '9') index += 1

  return index > numberStart && line[index] === '.' && line[index + 1] === ' '
}

/** Returns true when any line starts with a numbered-list marker (ReDoS-safe). */
function hasLineStartingWithNumberedList(content: string): boolean {
  return content.split('\n').some(lineStartsWithNumberedListMarker)
}

/** Insert paragraph breaks before inline numbered-list markers (ReDoS-safe). */
function insertNewlinesBeforeInlineNumberedListMarkers(content: string): string {
  let result = ''
  let index = 0

  while (index < content.length) {
    if (!isMarkdownWhitespaceChar(content[index])) {
      result += content[index]
      index += 1
      continue
    }

    const whitespaceStart = index
    while (index < content.length && isMarkdownWhitespaceChar(content[index])) index += 1

    const markerStart = index
    while (index < content.length && content[index] >= '0' && content[index] <= '9') index += 1

    if (index > markerStart && content[index] === '.' && content[index + 1] === ' ') {
      result += `\n\n${content.slice(markerStart, index + 2)}`
      index += 2
      continue
    }

    result += content.slice(whitespaceStart, index)
  }

  return result
}

function enhanceMarkdownContent(content: string): string {
  let normalized = normalizeMarkdownEntityProtocols(content)

  if (containsNumberedListMarker(normalized) && !hasLineStartingWithNumberedList(normalized)) {
    normalized = insertNewlinesBeforeInlineNumberedListMarkers(normalized)
  }

  return normalized
}

interface NormalizedFileReference {
  fileName: string
  mimeType?: string
  uploadedAt?: string
  fileSize?: number
  downloadPath: string
}

function toDocumentFilePath(url: string): string | null {
  const raw = String(url || '').trim()
  if (!raw) return null

  let relativePath = raw
  try {
    if (/^https?:\/\//i.test(raw)) {
      const parsed = new URL(raw)
      relativePath = `${parsed.pathname}${parsed.search}`
    }
  } catch {
    relativePath = raw
  }

  if (relativePath.startsWith('/files/')) {
    return relativePath.slice('/files/'.length)
  }

  if (relativePath.startsWith('files/')) {
    return relativePath.slice('files/'.length)
  }

  if (relativePath.startsWith('/api/v1/') || relativePath.startsWith('api/v1/')) {
    return relativePath.startsWith('/') ? relativePath.substring(1) : relativePath
  }

  return null
}

function normalizeDownloadPath(rawPath: string): string {
  const trimmed = rawPath.trim()
  if (trimmed.startsWith('/files/')) {
    return trimmed.slice('/files/'.length)
  }
  if (trimmed.startsWith('files/')) {
    return trimmed.slice('files/'.length)
  }
  return trimmed.startsWith('/') ? trimmed.substring(1) : trimmed
}

function inferMimeTypeFromFileName(fileName: string, mimeType?: string): string | undefined {
  if (mimeType) return mimeType
  if (fileName.toLowerCase().endsWith('.pdf')) return 'application/pdf'
  return undefined
}

function isFileLikeObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  const fileMetadata =
    candidate.fileMetadata && typeof candidate.fileMetadata === 'object'
      ? (candidate.fileMetadata as Record<string, unknown>)
      : undefined
  return Boolean(
    candidate.path || candidate.downloadPath || candidate.fileId || candidate.fileName || fileMetadata?.originalFileName
  )
}

function normalizeFileReference(value: unknown): NormalizedFileReference | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    if (trimmed.startsWith('{')) {
      try {
        return normalizeFileReference(JSON.parse(trimmed))
      } catch {
        return null
      }
    }

    const filePath = toDocumentFilePath(trimmed)
    if (!filePath) return null

    const fileName = trimmed.split('/').pop()?.split('?')[0] || 'attachment'
    return {
      fileName,
      downloadPath: normalizeDownloadPath(filePath),
      mimeType: inferMimeTypeFromFileName(fileName)
    }
  }

  if (!isFileLikeObject(value)) return null

  const fileMetadata =
    value.fileMetadata && typeof value.fileMetadata === 'object'
      ? (value.fileMetadata as Record<string, unknown>)
      : undefined
  const rawPath = (value.downloadPath || value.path) as string | undefined
  const fileName = (value.fileName || fileMetadata?.originalFileName || value.fileId) as string | undefined

  if (!rawPath || !fileName) return null

  return {
    fileName,
    mimeType: inferMimeTypeFromFileName(fileName, (value.mimeType || fileMetadata?.mimeType) as string | undefined),
    uploadedAt: (value.uploadedAt || fileMetadata?.updatedAt) as string | undefined,
    fileSize: typeof value.fileSize === 'number' ? value.fileSize : undefined,
    downloadPath: normalizeDownloadPath(rawPath)
  }
}

function extractFileReferences(value: unknown): NormalizedFileReference[] {
  if (Array.isArray(value)) {
    return value.flatMap(item => extractFileReferences(item))
  }

  const normalized = normalizeFileReference(value)
  return normalized ? [normalized] : []
}

export function isFileLikeValue(value: unknown): boolean {
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

function isPdfFile(file: NormalizedFileReference): boolean {
  if (file.mimeType === 'application/pdf') return true
  return file.fileName.toLowerCase().endsWith('.pdf')
}

interface PdfInlinePreviewProps {
  file: NormalizedFileReference
  accessToken?: string
}

const PdfInlinePreview: React.FC<PdfInlinePreviewProps> = ({ file, accessToken }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    void (async () => {
      try {
        const url = accessToken
          ? await buildFileUrl({ path: file.downloadPath }, accessToken)
          : buildFileUrl({ path: file.downloadPath })
        if (cancelled) return
        objectUrl = url
        setPreviewUrl(url)
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error instanceof Error ? error.message : 'Failed to load PDF preview')
        }
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [accessToken, file.downloadPath])

  if (previewError) {
    return <div className="gba:text-xs gba:text-destructive">{previewError}</div>
  }

  if (!previewUrl) {
    return <div className="gba:text-xs gba:text-muted-foreground">Loading PDF preview...</div>
  }

  return (
    <iframe
      src={previewUrl}
      title={file.fileName}
      className="gba:h-[480px] gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-muted/20"
      data-testid={`flow-detail-pdf-preview-${file.fileName}`}
    />
  )
}

interface FileValueDisplayProps {
  files: NormalizedFileReference[]
  accessToken?: string
  compact?: boolean
}

const FileValueDisplay: React.FC<FileValueDisplayProps> = ({ files, accessToken, compact = false }) => {
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloadingFileName, setDownloadingFileName] = useState<string | null>(null)
  const [viewingFileName, setViewingFileName] = useState<string | null>(null)

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

  const handleView = async (file: NormalizedFileReference) => {
    setDownloadError(null)
    setViewingFileName(file.fileName)

    try {
      await handleDocumentClick(
        {
          id: file.downloadPath,
          name: file.fileName,
          mimeType: file.mimeType,
          fileInfo: {
            path: file.downloadPath,
            ...(file.mimeType ? { fileMetadata: { mimeType: file.mimeType } } : {})
          }
        },
        accessToken
      )
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Failed to open file')
    } finally {
      setViewingFileName(null)
    }
  }

  return (
    <div className={compact ? 'gba:space-y-1.5' : 'gba:space-y-3'}>
      {files.map(file => {
        const metaParts = [
          formatMimeTypeLabel(file.mimeType),
          formatFileSize(file.fileSize),
          file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : null
        ].filter(Boolean)
        const showPdfPreview = !compact && isPdfFile(file)

        return (
          <div key={`${file.downloadPath}-${file.fileName}`} className="gba:space-y-2">
            <div className="gba:flex gba:min-w-0 gba:items-start gba:justify-between gba:gap-2">
              <div className="gba:flex gba:min-w-0 gba:flex-1 gba:items-start gba:gap-2">
                <FileText className="gba:mt-0.5 gba:h-4 gba:w-4 gba:flex-shrink-0 gba:text-primary" />
                <div className="gba:min-w-0 gba:flex-1">
                  <div className="gba:truncate gba:text-sm gba:font-medium gba:text-foreground" title={file.fileName}>
                    {file.fileName}
                  </div>
                  {metaParts.length ? (
                    <div className="gba:mt-0.5 gba:text-xs gba:text-muted-foreground">{metaParts.join(' • ')}</div>
                  ) : null}
                </div>
              </div>
              <div className="gba:flex gba:flex-shrink-0 gba:items-center gba:gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gba:h-7 gba:w-7 gba:p-0"
                  onClick={() => void handleView(file)}
                  title={`View ${file.fileName}`}
                  disabled={viewingFileName === file.fileName}
                >
                  <Eye className="gba:h-4 gba:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gba:h-7 gba:w-7 gba:p-0"
                  onClick={() => void handleDownload(file)}
                  title={`Download ${file.fileName}`}
                  disabled={downloadingFileName === file.fileName}
                >
                  <Download className="gba:h-4 gba:w-4" />
                </Button>
              </div>
            </div>
            {showPdfPreview ? <PdfInlinePreview file={file} accessToken={accessToken} /> : null}
          </div>
        )
      })}

      {downloadError ? <div className="gba:text-xs gba:text-destructive">{downloadError}</div> : null}
    </div>
  )
}

interface FieldValueDisplayProps {
  fieldKey: string
  value: unknown
  accessToken?: string
  compact?: boolean
}

export const FieldValueDisplay: React.FC<FieldValueDisplayProps> = ({
  fieldKey,
  value,
  accessToken,
  compact = false
}) => {
  const fileReferences = extractFileReferences(value)

  if (fileReferences.length > 0) {
    return <FileValueDisplay files={fileReferences} accessToken={accessToken} compact={compact} />
  }

  if (shouldRenderStringAsMarkdown(value, fieldKey)) {
    return renderMarkdownFieldValue(fieldKey, value, accessToken, compact)
  }

  return (
    <div
      className={`gba:text-foreground ${compact ? 'gba:max-w-[500px] gba:whitespace-pre-wrap gba:break-words gba:text-sm' : 'gba:text-sm'}`}
    >
      {formatFieldValue(fieldKey, value)}
    </div>
  )
}

interface SingleFormDataProps {
  formData: Record<string, unknown>
  accessToken?: string
}

export const SingleFormData: React.FC<SingleFormDataProps> = ({ formData, accessToken }) => {
  const entries = Object.entries(formData ?? {}).filter(([key]) => !isHiddenTransportField(key))
  const hasFormData = entries.length > 0
  return (
    <div className="gba:mt-3">
      {hasFormData ? (
        <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-3 lg:gba:grid-cols-4 xl:gba:grid-cols-5 gba:gap-4">
          {entries.map(([key, value]) => (
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

export interface StepDataTableRow {
  taskId: string
  userId: string
  userName: string
  avatarUrl?: string
  timestamp?: string
  status?: string
  formData: Record<string, unknown>
  hasSubmission?: boolean
}

interface MultiRowDataTableProps {
  data: StepDataTableRow[]
  totalCount: number
  accessToken?: string
}

export const MultiRowDataTable: React.FC<MultiRowDataTableProps> = ({ data, totalCount, accessToken }) => {
  const allFields = new Set<string>()
  const submittedCount = data.filter(row => row.hasSubmission !== false).length
  for (const dataRow of data) {
    if (dataRow.formData) {
      for (const key of Object.keys(dataRow.formData)) {
        if (isHiddenTransportField(key)) continue
        allFields.add(key)
      }
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
      {totalCount > submittedCount ? (
        <div className="gba:text-center gba:py-4">
          <Button variant="outline" size="sm">
            Load More ({totalCount - submittedCount} remaining)
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || '?'
}

const ACTIVE_STEP_STATUSES = new Set(['IN_PROGRESS', 'RUNNING', 'CLAIMED', 'ACTIVE'])

export function getPendingStatusLabel(step: Pick<FlowStep, 'status'>): string {
  if (step.status === 'COMPLETED') return 'Completed'
  if (ACTIVE_STEP_STATUSES.has(step.status.toUpperCase())) return 'Waiting'
  const normalized = step.status.toLowerCase().split('_').join(' ')
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function buildStepDataTableRows(args: {
  step: FlowStep
  stepData?: StepDataResponse | null
  stepAssignmentsByStepIndex: Record<number, StepAssignmentInfo>
  actorNames: Record<string, string>
  employeeMap: Map<string, { displayName?: string; avatarUrl?: string }>
}): StepDataTableRow[] {
  const { step, stepData, stepAssignmentsByStepIndex, actorNames, employeeMap } = args
  const submittedRows = stepData?.data || []
  const submittedByUserId = new Map<string, (typeof submittedRows)[number]>()

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

  if (participantRows.length > 0) {
    return participantRows
  }

  return submittedRows.map(row => ({
    taskId: row.taskId,
    userId: row.userId,
    userName: row.userName || employeeMap.get(row.userId)?.displayName || actorNames[row.userId] || row.userId,
    avatarUrl: employeeMap.get(row.userId)?.avatarUrl,
    timestamp: row.timestamp,
    status: 'Submitted',
    formData: row.inputData,
    hasSubmission: true
  }))
}

export interface StepDataViewProps {
  step: FlowStep
  stepData?: StepDataResponse | null
  stepAssignmentsByStepIndex: Record<number, StepAssignmentInfo>
  actorNames: Record<string, string>
  employeeMap: Map<string, { displayName?: string; avatarUrl?: string }>
  accessToken?: string
}

export const StepDataView: React.FC<StepDataViewProps> = ({
  step,
  stepData,
  stepAssignmentsByStepIndex,
  actorNames,
  employeeMap,
  accessToken
}) => {
  const submittedRows = stepData?.data || []
  const tableRows = buildStepDataTableRows({
    step,
    stepData,
    stepAssignmentsByStepIndex,
    actorNames,
    employeeMap
  })

  if (submittedRows.length === 0 && tableRows.every(row => !row.hasSubmission)) {
    return (
      <div className="gba:rounded-md gba:border gba:border-dashed gba:border-border gba:bg-muted/10 gba:px-3 gba:py-4 gba:text-sm gba:text-muted-foreground">
        No data captured yet.
      </div>
    )
  }

  const shouldRenderTable = tableRows.length > 1

  if (shouldRenderTable) {
    return <MultiRowDataTable data={tableRows} totalCount={stepData?.totalCount ?? 0} accessToken={accessToken} />
  }

  if (submittedRows.length === 1) {
    const firstRow = tableRows[0]
    return (
      <div className="gba:space-y-3">
        <div className="gba:rounded-md gba:border gba:border-border gba:bg-muted/20 gba:px-3 gba:py-3">
          <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
            <div className="gba:flex gba:items-center gba:gap-2">
              <Avatar className="gba:h-8 gba:w-8">
                {firstRow?.avatarUrl ? <AvatarImage src={firstRow.avatarUrl} alt={firstRow.userName} /> : null}
                <AvatarFallback className="gba:text-xs gba:font-medium">
                  {getInitials(firstRow?.userName || submittedRows[0].userName)}
                </AvatarFallback>
              </Avatar>
              <span className="gba:text-sm gba:font-medium gba:text-foreground">
                {firstRow?.userName || submittedRows[0].userName}
              </span>
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
    )
  }

  if (tableRows.length === 1) {
    const row = tableRows[0]
    return (
      <div className="gba:rounded-md gba:border gba:border-border gba:bg-muted/20 gba:px-3 gba:py-3">
        <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Avatar className="gba:h-8 gba:w-8">
              {row.avatarUrl ? <AvatarImage src={row.avatarUrl} alt={row.userName} /> : null}
              <AvatarFallback className="gba:text-xs gba:font-medium">{getInitials(row.userName)}</AvatarFallback>
            </Avatar>
            <span className="gba:text-sm gba:font-medium gba:text-foreground">{row.userName}</span>
          </div>
          <Badge variant="outline" className="gba:text-xs">
            {row.status}
          </Badge>
        </div>
        <div className="gba:mt-2 gba:text-sm gba:text-muted-foreground">No submitted data yet.</div>
      </div>
    )
  }

  return (
    <div className="gba:rounded-md gba:border gba:border-dashed gba:border-border gba:bg-muted/10 gba:px-3 gba:py-4 gba:text-sm gba:text-muted-foreground">
      No data captured yet.
    </div>
  )
}
