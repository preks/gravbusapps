import React from 'react'
import { EmployeeSelect } from '@/components/employee-select'
import { EntitySelect } from '../../selects/reference-select'
import { CatalogSelect } from '@/components/catalog-select'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  FileUpload,
  type FileMetadata
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { Clock3, CalendarClock } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'

export interface TaskOption {
  value: string
  label: string
}

export interface TaskSegmentProps {
  // Labels
  titleLabel: string
  descriptionLabel: string
  deadlineLabel: string
  typeLabel: string
  priorityLabel: string
  statusLabel?: string
  assigneeLabel?: string
  timingTypeLabel?: string
  entityLabel?: string
  uploadFileLabel?: string

  // Option sources (catalog identifiers for CatalogSelect)
  accessToken?: string
  typeCatalog?: { identifier: string; version: string }
  priorityCatalog?: { identifier: string; version: string }
  statusCatalog?: { identifier: string; version: string }

  // Entity selection
  showEntitySelection?: boolean
  requireEntity?: boolean
  entities?: Array<{
    id: string
    name: string
    type: 'account' | 'contact' | 'opportunity' | 'lead' | 'investment'
    subtitle?: string
  }>
  entitiesLoading?: boolean
  onEntitySearch?: (q: string) => void
  entitiesHasMore?: boolean
  onEntityLoadMore?: () => void
  entitiesError?: boolean

  // Pre-populate related entity from context (when selection is hidden)
  initialEntityFromContext?: {
    accountId?: string
    contactId?: string
    opportunityId?: string
    leadId?: string
  }

  // Assignees
  showAssigneeSelection?: boolean
  assignees?: Array<{
    id: string
    displayName: string
    userId?: string
    pictureThumbnail?: string
    organizationalUnitName?: string
    jobPositionName?: string
  }>
  assigneesLoading?: boolean
  onAssigneeSearch?: (q: string) => void
  assigneesHasMore?: boolean
  onAssigneeLoadMore?: () => void

  // File upload callback (optional convenience)
  onFilesChange?: (files: File[]) => void
  existingDocuments?: Array<{ id: string; name?: string; version?: number }>
  onDocumentRemove?: (documentId: string) => void

  // New behavior controls
  showType?: boolean
  staticDefaults?: Partial<Record<string, any>>

  ['data-testid']?: string
}

const TaskSegment: React.FC<TaskSegmentProps> = ({
  titleLabel,
  descriptionLabel,
  deadlineLabel,
  typeLabel,
  priorityLabel,
  statusLabel,
  assigneeLabel,
  timingTypeLabel,
  entityLabel,
  uploadFileLabel,
  typeCatalog,
  priorityCatalog,
  statusCatalog,
  showEntitySelection = false,
  entities = [],
  entitiesLoading = false,
  onEntitySearch,
  showAssigneeSelection = true,
  assignees = [],
  assigneesLoading = false,
  onAssigneeSearch,
  assigneesHasMore = false,
  onAssigneeLoadMore,
  onFilesChange,
  existingDocuments = [],
  onDocumentRemove,
  entitiesHasMore = false,
  onEntityLoadMore,
  initialEntityFromContext,
  showType = true,
  staticDefaults,
  'data-testid': dataTestId = 'task-segment'
}) => {
  const form = useFormContext()

  // Apply static defaults once
  React.useEffect(() => {
    if (!staticDefaults) return
    for (const [key, value] of Object.entries(staticDefaults)) {
      if (value !== undefined && (form.getValues(key) === undefined || form.getValues(key) === '')) {
        form.setValue(key as any, value, { shouldValidate: true })
      }
    }
  }, [staticDefaults, form])

  const timingTypeOptions: TaskOption[] = [
    { value: 'DEADLINE', label: 'Deadline' },
    { value: 'SCHEDULED', label: 'Scheduled' }
  ]

  // Preselect default timing type
  React.useEffect(() => {
    if (!form.getValues('timingType')) {
      form.setValue('timingType', 'DEADLINE', { shouldValidate: true })
    }
  }, [form])

  const entitySelectOptions = React.useMemo(
    () =>
      (entities || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        subtitle: e.subtitle,
        pictureThumbnail: e.pictureThumbnail
      })),
    [entities]
  )
  const assigneeOptions = React.useMemo(
    () =>
      (assignees || []).map(a => ({
        id: a.id,
        displayName: a.displayName,
        pictureThumbnail: a.pictureThumbnail,
        organizationalUnitName: a.organizationalUnitName,
        jobPositionName: a.jobPositionName
      })),
    [assignees]
  )
  const assigneeUserMap = React.useMemo(() => {
    const map = new Map<string, string | undefined>()
    for (const a of assignees || []) {
      map.set(a.id, a.userId)
    }
    return map
  }, [assignees])

  // Keep assignedUserId in sync with the selected assignedEmployeeId (covers initial load and subsequent changes)
  const assignedEmployeeId = (form as any)?.watch?.('assignedEmployeeId')
  React.useEffect(() => {
    const uid = assignedEmployeeId ? assigneeUserMap.get(String(assignedEmployeeId)) : undefined
    const current = (form as any)?.getValues?.('assignedUserId')
    if (uid !== current) {
      ;(form as any)?.setValue?.('assignedUserId', uid)
    }
  }, [assignedEmployeeId, assigneeUserMap, form])

  const normalizeDateTimeLocalValue = React.useCallback((v: string | undefined | null) => {
    if (!v) return ''
    const s = v.replace('Z', '')
    return s.length >= 16 ? s.slice(0, 16) : s
  }, [])

  // Helper: Convert existing documents to FileMetadata format
  const initialFiles = React.useMemo<FileMetadata[]>(
    () =>
      existingDocuments.map(doc => ({
        id: doc.id,
        name: doc.name || 'Unnamed Document',
        size: 0,
        type: '',
        url: doc.id
      })),
    [existingDocuments]
  )

  // Helper: Create a stable key for FileUpload
  const fileUploadKey = React.useMemo(() => existingDocuments.map(d => d.id).join(',') || 'empty', [existingDocuments])

  // Helper: Extract File objects from FileWithPreview
  const extractNewFiles = React.useCallback((files: any[]): File[] => {
    return files.map(f => (f.file instanceof File ? f.file : null)).filter((f): f is File => f !== null)
  }, [])

  // Helper: Check if file ID is in set
  const isFileIdInSet = React.useCallback((fileId: string, fileIds: Set<string>): boolean => {
    return fileIds.has(fileId)
  }, [])

  // Handler: Process file changes
  const handleFilesChange = React.useCallback(
    (files: any[]) => {
      if (!onFilesChange) return

      // Add new files
      const newFiles = extractNewFiles(files)
      if (newFiles.length > 0) {
        onFilesChange(newFiles)
      }

      // Handle file removal - check which initial files are missing
      const currentFileIds = new Set(files.map(f => f.id))
      const removedDocs = initialFiles.filter(initial => !isFileIdInSet(initial.id, currentFileIds))

      if (removedDocs.length > 0 && onDocumentRemove) {
        for (const doc of removedDocs) {
          onDocumentRemove(doc.id)
        }
      }
    },
    [onFilesChange, onDocumentRemove, initialFiles, extractNewFiles, isFileIdInSet]
  )

  // Prime searches when provided but lists are empty
  React.useEffect(() => {
    if (showEntitySelection && onEntitySearch && (entities?.length || 0) === 0) {
      onEntitySearch('')
    }
  }, [showEntitySelection, onEntitySearch, entities?.length])

  // Apply initial entity from context if selection is hidden and no entity set yet
  React.useEffect(() => {
    if (!initialEntityFromContext) return
    const hasEntity = Boolean(
      form.getValues('account') || form.getValues('contact') || form.getValues('opportunity') || form.getValues('lead')
    )
    if (hasEntity) return
    const { accountId, contactId, opportunityId, leadId } = initialEntityFromContext
    const map: Array<{ key: 'account' | 'contact' | 'opportunity' | 'lead'; id?: string }> = [
      { key: 'account', id: accountId },
      { key: 'contact', id: contactId },
      { key: 'opportunity', id: opportunityId },
      { key: 'lead', id: leadId }
    ]
    const found = map.find(m => m.id)
    if (found?.id) {
      form.setValue(found.key, found.id)
      form.setValue('relatedEntityId', found.id)
    }
  }, [initialEntityFromContext, form])

  React.useEffect(() => {
    if (onAssigneeSearch && assigneeOptions.length === 0) {
      onAssigneeSearch('')
    }
  }, [onAssigneeSearch, assigneeOptions.length])

  return (
    <>
      {/* Title */}
      <FormField
        control={form.control as any}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{titleLabel}</FormLabel>
            <FormControl>
              <Input placeholder="Please Enter..." data-testid={`${dataTestId}-title`} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Deadline and Timing */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        {/* Deadline */}
        <FormField
          control={form.control as any}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{deadlineLabel}</FormLabel>
              <FormControl>
                <Input
                  className="gba:w-full"
                  type="datetime-local"
                  placeholder="Please Enter..."
                  data-testid={`${dataTestId}-deadline`}
                  value={normalizeDateTimeLocalValue(field.value)}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Timing Type */}
        <FormField
          control={form.control as any}
          name="timingType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{timingTypeLabel || 'Timing'}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="gba:w-full" data-testid={`${dataTestId}-timing`}>
                    <SelectValue placeholder="Please Select..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {timingTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="gba:flex gba:items-center gba:gap-2">
                        {opt.value === 'DEADLINE' ? (
                          <Clock3 className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-color-danger-500)' }} />
                        ) : (
                          <CalendarClock className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-color-primary-500)' }} />
                        )}
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Type and Priority*/}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        {showType && typeCatalog && (
          <FormField
            control={form.control as any}
            name="taskTypeRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{typeLabel}</FormLabel>
                <FormControl>
                  <CatalogSelect
                    catalogIdentifier={`${typeCatalog.identifier}:${typeCatalog.version}`}
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    data-testid={`${dataTestId}-type`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Priority */}
        {priorityCatalog && (
          <FormField
            control={form.control as any}
            name="taskPriorityRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{priorityLabel}</FormLabel>
                <FormControl>
                  <CatalogSelect
                    catalogIdentifier={`${priorityCatalog.identifier}:${priorityCatalog.version}`}
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    data-testid={`${dataTestId}-priority`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
      {/* Status */}
      {statusCatalog && (
        <FormField
          control={form.control as any}
          name="taskStatusRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{statusLabel || 'Status'}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={`${statusCatalog.identifier}:${statusCatalog.version}`}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  data-testid={`${dataTestId}-status`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Assigned To */}
      {showAssigneeSelection !== false && (
        <FormField
          control={form.control as any}
          name="assignedEmployeeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{assigneeLabel || 'Assigned To'}</FormLabel>
              <FormControl>
                <EmployeeSelect
                  employees={assigneeOptions as any}
                  value={field.value || ''}
                  onValueChange={(v: string | null) => {
                    field.onChange(v || '')
                    const uid = assigneeUserMap.get(String(v || ''))
                    if (uid) {
                      form.setValue('assignedUserId', uid)
                    }
                  }}
                  onSearch={onAssigneeSearch}
                  loading={Boolean(assigneesLoading)}
                  onLoadMore={onAssigneeLoadMore}
                  hasMore={Boolean(assigneesHasMore)}
                  data-testid={`${dataTestId}-assignee`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Related Entity */}
      {showEntitySelection && (
        <FormField
          control={form.control as any}
          name="relatedEntityId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{entityLabel || 'Related Entity'}</FormLabel>
              <FormControl>
                <EntitySelect
                  entities={entitySelectOptions as any}
                  value={field.value || ''}
                  onValueChange={(v: string | null) => {
                    field.onChange(v || '')
                    const id = String(v || '')
                    const e = (entities || []).find(x => x.id === id)
                    form.setValue('account', undefined)
                    form.setValue('contact', undefined)
                    form.setValue('opportunity', undefined)
                    form.setValue('lead', undefined)
                    form.setValue('investment', undefined)
                    if (e) {
                      form.setValue(e.type, e.id)
                    }
                  }}
                  onSearch={onEntitySearch}
                  loading={Boolean(entitiesLoading)}
                  onLoadMore={onEntityLoadMore}
                  hasMore={Boolean(entitiesHasMore)}
                  placeholder="Search..."
                  data-testid={`${dataTestId}-entity`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Description */}
      <FormField
        control={form.control as any}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{descriptionLabel}</FormLabel>
            <FormControl>
              <Textarea placeholder="Please Enter..." data-testid={`${dataTestId}-description`} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Attach Documents */}
      {uploadFileLabel && onFilesChange && (
        <FormField
          control={form.control}
          name="files"
          render={() => (
            <FormItem>
              <FormLabel>{uploadFileLabel}</FormLabel>
              <FormControl>
                <FileUpload
                  key={fileUploadKey}
                  layout="list"
                  preview="icon"
                  maxFiles={10}
                  maxSizeMB={10}
                  multiple={true}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                  initialFiles={initialFiles}
                  onChange={handleFilesChange}
                  data-testid={`${dataTestId}-file-upload`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  )
}

export default TaskSegment

// Zod schema colocated with TaskSegment for convenient reuse/override
const buildTaskSegmentSchema = (options?: {
  requireAssignee?: boolean
  requireEntity?: boolean
  requireType?: boolean
}) => {
  const requireAssignee = options?.requireAssignee !== false
  const requireEntity = options?.requireEntity !== false
  const requireType = options?.requireType !== false
  return z.object({
    title: z.string().min(1, 'Title is required'),
    timingType: z.enum(['DEADLINE', 'SCHEDULED']).refine(v => !!v, {
      message: 'Timing is required'
    }),
    taskTypeRef: requireType ? z.string().min(1, 'Type is required') : z.string().optional(),
    taskPriorityRef: z.string().min(1, 'Priority is required'),
    taskStatusRef: z.string().min(1, 'Status is required'),
    assignedEmployeeId: requireAssignee ? z.string().min(1, 'Assigned employee is required') : z.string().optional(),
    relatedEntityId: requireEntity ? z.string().min(1, 'Related entity is required') : z.string().optional(),
    description: z.string().optional(),
    dueDate: z.preprocess(val => (val == null ? '' : val), z.string().min(1, 'Deadline is required')),
    files: z.any().optional()
  })
}

export type TaskSegmentSchema = z.infer<ReturnType<typeof buildTaskSegmentSchema>>

// Default schema export for convenience
export const taskSegmentSchema = buildTaskSegmentSchema()

export const createTaskSegmentResolver = (options?: {
  requireAssignee?: boolean
  requireEntity?: boolean
  requireType?: boolean
}) => zodResolver(buildTaskSegmentSchema(options))
