import React from 'react'
import { EmployeeSelect } from '@/components/employee-select'
import { EntitySelect } from '../../selects/reference-select'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
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
  type FileMetadata,
  DateInput,
  useTranslation
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { Clock3, CalendarClock } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import translations from './_i18n'

export interface TaskSegmentProps {
  // Context
  accessToken: string
  businessAppContext?: BusinessAppContextProps

  // Assigned employee from task entity (to display without extra request)
  assignedEmployee?: Employee | null

  // Entity ID to determine if new entity (for auto-select)
  entityId?: string

  // Catalog identifiers
  typeCatalog?: string
  priorityCatalog?: string
  statusCatalog?: string

  // Entity selection (still needs entities array until EntitySelect is refactored)
  showEntitySelection?: boolean
  entities?: Array<{
    id: string
    name: string
    type: string // Generic type - allows any entity type
    subtitle?: string
  }>
  entitiesLoading?: boolean
  onEntitySearch?: (q: string) => void
  entitiesHasMore?: boolean
  onEntityLoadMore?: () => void

  // Pre-populate related entity from context (when selection is hidden)
  initialEntityFromContext?: {
    accountId?: string
    contactId?: string
    opportunityId?: string
    leadId?: string
    [key: string]: string | undefined // Allow additional entity types (e.g. investmentId)
  }

  // Handler for additional entity types (injected by parent forms, e.g. IRM TaskForm for investment)
  onAdditionalEntityChange?: (type: string, entityId: string | null) => void

  // File upload callback (optional convenience)
  onFilesChange?: (files: File[]) => void
  existingDocuments?: Array<{ id: string; name?: string; version?: number }>
  onDocumentRemove?: (documentId: string) => void

  // Custom fields
  customFields?: React.ReactNode

  ['data-testid']?: string
}

const TaskSegment: React.FC<TaskSegmentProps> = ({
  accessToken,
  businessAppContext,
  assignedEmployee,
  entityId,
  typeCatalog,
  priorityCatalog,
  statusCatalog,
  showEntitySelection = false,
  entities = [],
  entitiesLoading = false,
  onEntitySearch,
  entitiesHasMore = false,
  onEntityLoadMore,
  initialEntityFromContext,
  onAdditionalEntityChange,
  onFilesChange,
  existingDocuments = [],
  onDocumentRemove,
  customFields,
  'data-testid': dataTestId = 'task-segment'
}) => {
  const form = useFormContext()
  const { t } = useTranslation(translations)

  // Determine if new entity (for auto-select)
  const isNewEntity = !entityId

  const timingTypeOptions = [
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

    // Handle standard entity types (account, contact, opportunity, lead)
    const { accountId, contactId, opportunityId, leadId, ...additionalEntities } = initialEntityFromContext

    // Get current form values
    const currentAccountId = form.getValues('accountId')
    const currentContactId = form.getValues('contactId')
    const currentOpportunityId = form.getValues('opportunityId')
    const currentLeadId = form.getValues('leadId')

    if (accountId) {
      if (currentAccountId !== accountId) {
        form.setValue('accountId', accountId)
        form.setValue('relatedEntityId', accountId)
      }
    } else if (contactId) {
      if (currentContactId !== contactId) {
        form.setValue('contactId', contactId)
        form.setValue('relatedEntityId', contactId)
      }
    } else if (opportunityId) {
      if (currentOpportunityId !== opportunityId) {
        form.setValue('opportunityId', opportunityId)
        form.setValue('relatedEntityId', opportunityId)
      }
    } else if (leadId) {
      if (currentLeadId !== leadId) {
        form.setValue('leadId', leadId)
        form.setValue('relatedEntityId', leadId)
      }
    } else {
      // Handle additional entity types (e.g. investmentId) via handler
      if (onAdditionalEntityChange) {
        for (const [key, value] of Object.entries(additionalEntities)) {
          if (value) {
            // Extract type from field name (e.g. 'investmentId' -> 'investment')
            const type = key.replace(/Id$/, '').toLowerCase()
            const currentValue = form.getValues(key as any)
            if (currentValue !== value) {
              onAdditionalEntityChange(type, value)
              form.setValue('relatedEntityId', value)
            }
            break // Only set first additional entity
          }
        }
      }
    }
  }, [initialEntityFromContext, form, onAdditionalEntityChange])

  return (
    <>
      {/* Name */}
      <FormField
        control={form.control as any}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('task-title-label')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('task-title-placeholder')}
                data-testid={`${dataTestId}-title`}
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Deadline and Timing */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <FormField
          control={form.control as any}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('task-deadline-label')}</FormLabel>
              <FormControl>
                <DateInput
                  type="date"
                  value={field.value || ''}
                  onChange={value => field.onChange(value || '')}
                  placeholder={t('task-deadline-placeholder')}
                  data-testid={`${dataTestId}-deadline`}
                  captionLayout="dropdown"
                  outputFormat="iso"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="timingType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('task-timing-type-label')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="gba:w-full" data-testid={`${dataTestId}-timing`}>
                    <SelectValue placeholder={t('please-select')} />
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

      {/* Type and Priority */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        {typeCatalog && (
          <FormField
            control={form.control as any}
            name="taskTypeRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('task-type-label')}</FormLabel>
                <FormControl>
                  <CatalogSelect
                    catalogIdentifier={typeCatalog}
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

        {priorityCatalog && (
          <FormField
            control={form.control as any}
            name="taskPriorityRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('task-priority-label')}</FormLabel>
                <FormControl>
                  <CatalogSelect
                    catalogIdentifier={priorityCatalog}
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
              <FormLabel>{t('task-status-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={statusCatalog}
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
      <FormField
        control={form.control as any}
        name="assignedEmployeeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('task-assignee-label')}</FormLabel>
            <FormControl>
              <EmployeeSelect
                accessToken={accessToken}
                businessAppContext={businessAppContext}
                initialEmployee={assignedEmployee}
                autoSelect={isNewEntity ? 'current-user' : undefined}
                value={field.value || ''}
                onValueChange={(v: string | null) => {
                  field.onChange(v || '')
                }}
                onEmployeeChange={(employee: any) => {
                  // Set both assignedEmployeeId and assignedEmployee
                  form.setValue('assignedEmployeeId', employee?.id || '')
                  form.setValue('assignedEmployee', employee)
                  // Also set assignedUserId directly when employee changes
                  if (employee?.userId) {
                    form.setValue('assignedUserId', employee.userId)
                  } else {
                    form.setValue('assignedUserId', undefined)
                  }
                }}
                data-testid={`${dataTestId}-assignee`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Related Entity */}
      {showEntitySelection && (
        <FormField
          control={form.control as any}
          name="relatedEntityId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('task-entity-label')}</FormLabel>
              <FormControl>
                <EntitySelect
                  entities={entitySelectOptions as any}
                  value={field.value || ''}
                  onValueChange={(v: string | null) => {
                    field.onChange(v || '')
                    const id = String(v || '')
                    const e = (entities || []).find(x => x.id === id)

                    // Clear all standard entity ID fields
                    form.setValue('accountId', undefined)
                    form.setValue('contactId', undefined)
                    form.setValue('opportunityId', undefined)
                    form.setValue('leadId', undefined)

                    // Clear additional entities via handler (if provided)
                    if (onAdditionalEntityChange) {
                      // Get current additional entity to clear it
                      const currentRelatedId = form.getValues('relatedEntityId')
                      if (currentRelatedId) {
                        const currentEntity = (entities || []).find(x => x.id === currentRelatedId)
                        if (
                          currentEntity &&
                          !['account', 'contact', 'opportunity', 'lead'].includes(currentEntity.type)
                        ) {
                          onAdditionalEntityChange(currentEntity.type, null)
                        }
                      }
                    }

                    if (e) {
                      // Handle standard entity types (account, contact, opportunity, lead)
                      if (e.type === 'account') {
                        form.setValue('accountId', e.id)
                      } else if (e.type === 'contact') {
                        form.setValue('contactId', e.id)
                      } else if (e.type === 'opportunity') {
                        form.setValue('opportunityId', e.id)
                      } else if (e.type === 'lead') {
                        form.setValue('leadId', e.id)
                      } else {
                        // Handle additional entity types via handler (e.g. investment)
                        if (onAdditionalEntityChange) {
                          onAdditionalEntityChange(e.type, e.id)
                        }
                      }
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
            <FormLabel>{t('task-description-label')}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('task-description-placeholder')}
                data-testid={`${dataTestId}-description`}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Attach Documents */}
      {onFilesChange && (
        <FormField
          control={form.control}
          name="files"
          render={() => (
            <FormItem>
              <FormLabel>{t('task-upload-label')}</FormLabel>
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

      {/* Custom fields */}
      {customFields}
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
    name: z.string().min(1, 'Name is required'),
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
