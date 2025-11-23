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
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import translations from './_i18n'

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

  // Owner employee from activity entity (to display without extra request)
  ownerEmployee?: Employee | null

  // Entity ID to determine if new entity (for auto-select)
  entityId?: string

  // Type catalog
  typeCatalog?: string

  // Entity selection (still needs entities array until EntitySelect is refactored)
  showEntitySelection?: boolean
  entities?: Array<{
    id: string
    name: string
    type: 'account' | 'contact' | 'opportunity' | 'lead' | 'investment'
    subtitle?: string
    pictureThumbnail?: string
  }>
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

  // Prime entity search on mount if needed
  React.useEffect(() => {
    if (showEntitySelection && onEntitySearch && (!entities || entities.length === 0)) {
      onEntitySearch('')
    }
  }, [showEntitySelection, onEntitySearch, entities])

  // Apply initial entity from context when none is set yet
  React.useEffect(() => {
    if (!initialEntityFromContext) return

    // Handle standard entity types (account, contact, opportunity, lead)
    const { accountId, contactId, opportunityId, leadId, ...additionalEntities } = initialEntityFromContext

    // Get current form values
    const currentAccount = form.getValues('account')
    const currentContact = form.getValues('contact')
    const currentOpportunity = form.getValues('opportunity')
    const currentLead = form.getValues('lead')

    if (accountId) {
      if (currentAccount !== accountId) {
        form.setValue('account', accountId)
        form.setValue('relatedEntityId', accountId)
      }
    } else if (contactId) {
      if (currentContact !== contactId) {
        form.setValue('contact', contactId)
        form.setValue('relatedEntityId', contactId)
      }
    } else if (opportunityId) {
      if (currentOpportunity !== opportunityId) {
        form.setValue('opportunity', opportunityId)
        form.setValue('relatedEntityId', opportunityId)
      }
    } else if (leadId) {
      if (currentLead !== leadId) {
        form.setValue('lead', leadId)
        form.setValue('relatedEntityId', leadId)
      }
    } else {
      // Handle additional entity types (e.g. investmentId) via handler
      if (onAdditionalEntityChange) {
        for (const [key, value] of Object.entries(additionalEntities)) {
          if (value) {
            // Extract type from field name (e.g. 'investmentId' -> 'investment')
            const type = key.replace(/Id$/, '').toLowerCase()
            onAdditionalEntityChange(type, value)
            form.setValue('relatedEntityId', value)
            break // Only set first additional entity
          }
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
                outputFormat="utc"
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
              <FormLabel>{t('activity-entity-label')}</FormLabel>
              <FormControl>
                <EntitySelect
                  entities={entities}
                  value={field.value || ''}
                  onValueChange={(v: string | null) => {
                    field.onChange(v || '')
                    if (form) {
                      const id = String(v || '')
                      const e = (entities || []).find(x => x.id === id)

                      // Clear all standard entity fields
                      form.setValue('account', undefined)
                      form.setValue('contact', undefined)
                      form.setValue('opportunity', undefined)
                      form.setValue('lead', undefined)

                      // Clear additional entities via handler (if provided)
                      if (onAdditionalEntityChange) {
                        // Get current related entity to clear it
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
                        if (['account', 'contact', 'opportunity', 'lead'].includes(e.type)) {
                          form.setValue(e.type as 'account' | 'contact' | 'opportunity' | 'lead', e.id)
                          form.setValue('relatedEntityId', e.id)
                        } else {
                          // Handle additional entity types via handler (e.g. investment)
                          if (onAdditionalEntityChange) {
                            onAdditionalEntityChange(e.type, e.id)
                          }
                          form.setValue('relatedEntityId', e.id)
                        }
                      }
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
