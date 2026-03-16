import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  FileUpload,
  type FileMetadata,
  DateInput,
  useTranslation
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CatalogSelect } from '@/components/catalog-select'
import EntitySelect from '../../selects/reference-select/EntitySelect'
import { EmployeeSelect } from '@/components/employee-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import {
  applyInitialCommonEntityFromContext,
  createCommonEntitySelectHandler,
  type CommonEntityContext
} from '../../selects/reference-select/entityHandlingUtils'
import translations from './_i18n'

// Entity option type for entity selection
export interface EntityOption {
  id: string
  name: string
  type: 'account' | 'contact' | 'opportunity' | 'lead' | 'investment'
  subtitle?: string
  pictureThumbnail?: string
}

// Base Activity interface with all common fields
export interface Activity {
  id?: string
  title: string
  activityTypeRef: string
  occurredAt: string
  description: string
  files: File[] // Legacy field - kept for backward compatibility
  // Document management
  documents?: Array<{
    id: string
    name?: string
    version?: number
  }>
  _pendingFiles?: File[] // Files pending upload (not sent to backend)
  account?: { id: string }
  contact?: { id: string }
  opportunity?: { id: string }
  lead?: { id: string }
  ownerEmployee?: { id: string }
  ownerEmployeeId?: string // Added to support form field
  version?: string
}

export interface ActivitySegmentProps {
  // Context
  accessToken: string
  businessAppContext?: BusinessAppContextProps

  // Owner employee from activity entity (to display without extra request)
  ownerEmployee?: Employee | null

  // Entity ID to determine if new entity (for auto-select)
  entityId?: string

  // Type catalog
  typeCatalog?: string

  // Entity selection (still needs entities array until EntitySelect is refactored)
  showEntitySelection?: boolean
  entities?: EntityOption[]
  entitiesLoading?: boolean
  onEntitySearch?: (searchTerm: string) => void
  entitiesHasMore?: boolean
  onEntityLoadMore?: () => void
  initialEntityFromContext?: {
    accountId?: string
    contactId?: string
    opportunityId?: string
    leadId?: string
    investmentId?: string
  }

  // Handler for additional entity types (injected by parent forms, e.g. IRM ActivityForm for investment)
  onAdditionalEntityChange?: (type: string, entityId: string | null) => void

  // Callbacks
  onFilesChange?: (files: File[]) => void
  existingDocuments?: Array<{
    id: string
    name?: string
    version?: number
    mimeType?: string
    fileSize?: number
    fileInfo?: any
  }>
  onDocumentRemove?: (documentId: string) => void

  // Custom fields
  customFields?: React.ReactNode

  ['data-testid']?: string
}

const ActivitySegment: React.FC<ActivitySegmentProps> = ({
  accessToken,
  businessAppContext,
  ownerEmployee,
  entityId,
  typeCatalog,
  showEntitySelection = false,
  entities = [],
  entitiesLoading = false,
  onEntitySearch,
  entitiesHasMore,
  onEntityLoadMore,
  initialEntityFromContext,
  onAdditionalEntityChange,
  onFilesChange,
  existingDocuments = [],
  onDocumentRemove,
  customFields,
  'data-testid': dataTestId = 'activity-segment'
}) => {
  const form = useFormContext()
  const { t } = useTranslation(translations)

  // Determine if new entity (for auto-select)
  const isNewEntity = !entityId

  // Track if we've already initialized occurredAt to prevent re-setting
  const hasInitializedDate = React.useRef(false)

  // Auto-populate current date/time for new activities
  React.useEffect(() => {
    if (isNewEntity && !hasInitializedDate.current) {
      const currentOccurredAt = form.getValues('occurredAt')
      if (!currentOccurredAt) {
        hasInitializedDate.current = true
        form.setValue('occurredAt', new Date().toISOString())
      }
    }
  }, [isNewEntity, form])

  // Prime entity search on mount if needed
  React.useEffect(() => {
    if (showEntitySelection && onEntitySearch && (!entities || entities.length === 0)) {
      onEntitySearch('')
    }
  }, [showEntitySelection, onEntitySearch, entities])

  // Apply initial entity from context when none is set yet
  React.useEffect(() => {
    if (!initialEntityFromContext) return

    // Handle common entity types (account, contact, opportunity, lead)
    const commonEntityApplied = applyInitialCommonEntityFromContext(initialEntityFromContext as CommonEntityContext, {
      form,
      useIdFields: false
    })

    // If no common entity was applied, handle additional entity types (e.g. investmentId) via handler
    if (!commonEntityApplied && onAdditionalEntityChange) {
      const standardEntityKeys = new Set(['accountId', 'contactId', 'opportunityId', 'leadId'])
      for (const [key, value] of Object.entries(initialEntityFromContext)) {
        if (value && !standardEntityKeys.has(key)) {
          // Extract type from field name (e.g. 'investmentId' -> 'investment')
          const type = key.replace(/Id$/, '').toLowerCase()
          onAdditionalEntityChange(type, value)
          form.setValue('relatedEntityId', value)
          break // Only set first additional entity
        }
      }
    }
  }, [initialEntityFromContext, form, onAdditionalEntityChange])

  // Helper: Convert existing documents to FileMetadata format
  const initialFiles = React.useMemo<FileMetadata[]>(
    () =>
      existingDocuments.map(doc => ({
        id: doc.id,
        name: doc.name || 'Unnamed Document',
        size: doc.fileSize || doc.fileInfo?.fileMetadata?.fileSize || 0,
        type: doc.mimeType || doc.fileInfo?.fileMetadata?.mimeType || '',
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

  return (
    <div className="gba:space-y-4">
      {/* Title */}
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('activity-title-label')}</FormLabel>
            <FormControl>
              <Input
                data-testid={`${dataTestId}-title`}
                maxLength={100}
                placeholder={t('activity-title-placeholder')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Type */}
      {typeCatalog && (
        <FormField
          control={form.control}
          name="activityTypeRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('activity-type-label')}</FormLabel>
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

      {/* Occurred At */}
      <FormField
        control={form.control}
        name="occurredAt"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('activity-date-label')}</FormLabel>
            <FormControl>
              <DateInput
                type="datetime-local"
                value={field.value || ''}
                onChange={value => field.onChange(value || '')}
                placeholder={t('activity-date-placeholder')}
                data-testid={`${dataTestId}-date`}
                captionLayout="dropdown"
                outputFormat="iso"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Related Entity */}
      {showEntitySelection && (
        <FormField
          control={form.control}
          name="relatedEntityId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('activity-entity-label')} <span className="gba:text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <EntitySelect
                  entities={entities}
                  value={field.value || ''}
                  onValueChange={(v: string | null) => {
                    field.onChange(v || '')
                    if (form) {
                      const handleEntityChange = createCommonEntitySelectHandler({
                        form,
                        useIdFields: false,
                        entities: entities || [],
                        onAdditionalEntityChange
                      })
                      handleEntityChange(v)
                    }
                  }}
                  placeholder="Search leads, contacts, accounts, or opportunities..."
                  searchPlaceholder="Type to search..."
                  onSearch={onEntitySearch}
                  loading={Boolean(entitiesLoading)}
                  hasMore={Boolean(entitiesHasMore)}
                  onLoadMore={onEntityLoadMore}
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
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('activity-description-label')}</FormLabel>
            <FormControl>
              <Textarea
                data-testid={`${dataTestId}-description`}
                placeholder={t('activity-description-placeholder')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Owner Employee */}
      <FormField
        control={form.control}
        name="ownerEmployeeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('activity-owner-label')}</FormLabel>
            <FormControl>
              <EmployeeSelect
                className="gba:w-full gba:h-auto"
                accessToken={accessToken}
                businessAppContext={businessAppContext}
                initialEmployee={ownerEmployee}
                autoSelect={isNewEntity ? 'current-user' : undefined}
                value={field.value || ''}
                onValueChange={(v: string | null) => field.onChange(v || '')}
                data-testid={`${dataTestId}-owner`}
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
              <FormLabel>{t('activity-upload-label')}</FormLabel>
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
    </div>
  )
}

export default ActivitySegment

// Zod schema colocated with ActivitySegment for convenient reuse/override
export const activitySegmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  activityTypeRef: z.string().min(1, 'Activity type is required'),
  occurredAt: z.preprocess(val => (val == null ? '' : val), z.string().min(1, 'Date is required')),
  description: z.string().min(1, 'Description is required'),
  files: z.any().optional(),
  relatedEntityId: z.string().optional(),
  ownerEmployeeId: z.string().optional() // Added to support owner selection
})

export type ActivitySegmentSchema = z.infer<typeof activitySegmentSchema>

export const createActivitySegmentResolver = () => zodResolver(activitySegmentSchema)
