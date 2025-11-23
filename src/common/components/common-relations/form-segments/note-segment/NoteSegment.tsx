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
import { EntitySelect } from '../../selects/reference-select'
import translations from './_i18n'

export interface NoteSegmentProps {
  // Entity selection (still needs entities array until EntitySelect is refactored)
  showEntitySelection?: boolean
  entities?: Array<{ id: string; name: string; type: 'account' | 'contact' | 'opportunity' | 'lead' | 'investment' }>
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

  // Handler for additional entity types (injected by parent forms, e.g. IRM NoteForm for investment)
  onAdditionalEntityChange?: (type: string, entityId: string | null) => void

  // File upload callbacks
  onFilesChange?: (files: File[]) => void
  existingDocuments?: Array<{ id: string; name?: string; version?: number }>
  onDocumentRemove?: (documentId: string) => void

  // Custom fields
  customFields?: React.ReactNode

  ['data-testid']?: string
}

export interface NoteSegmentSchema {
  id?: string
  title: string
  text: string
  reminderDate?: string | null
  relatedEntityId?: string
  account?: { id: string }
  contact?: { id: string }
  opportunity?: { id: string }
  lead?: { id: string }
  authorEmployee?: { id: string }
  version?: number
  // Document management
  documents?: Array<{
    id: string
    name?: string
    version?: number
  }>
  _pendingFiles?: File[] // Files pending upload (not sent to backend)
}

export const noteSegmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  text: z.string().min(1, 'Note text is required'),
  reminderDate: z.string().optional(),
  relatedEntityId: z.string().optional()
})

export const createNoteSegmentResolver = () => zodResolver(noteSegmentSchema)

const NoteSegment: React.FC<NoteSegmentProps> = ({
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
  'data-testid': dataTestId = 'note-segment'
}) => {
  const form = useFormContext()
  const { t } = useTranslation(translations)

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

  return (
    <>
      {/* Title */}
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('note-title-label')}</FormLabel>
            <FormControl>
              <Input
                data-testid={`${dataTestId}-title`}
                maxLength={100}
                placeholder={t('note-title-placeholder')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Text */}
      <FormField
        control={form.control}
        name="text"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('note-text-label')}</FormLabel>
            <FormControl>
              <Textarea data-testid={`${dataTestId}-text`} placeholder={t('note-text-placeholder')} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Reminder Date */}
      <FormField
        control={form.control}
        name="reminderDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('note-reminder-label')}</FormLabel>
            <FormControl>
              <DateInput
                type="datetime-local"
                value={field.value || ''}
                onChange={value => field.onChange(value || '')}
                placeholder={t('note-reminder-placeholder')}
                data-testid={`${dataTestId}-reminder-date`}
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
              <FormLabel>{t('note-entity-label')}</FormLabel>
              <FormControl>
                <EntitySelect
                  className="gba:w-full gba:h-auto"
                  entities={entities}
                  value={field.value || ''}
                  onValueChange={(v: string | null) => {
                    field.onChange(v || '')
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
                  }}
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

      {/* File Upload Section */}
      {onFilesChange && (
        <FormField
          control={form.control}
          name="files"
          render={() => (
            <FormItem>
              <FormLabel>{t('note-upload-label')}</FormLabel>
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

export default NoteSegment
