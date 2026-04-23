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
  DateInput,
  useTranslation
} from '@newwork/nw-design-system'
import { ExistingDocumentsList } from '../_shared/ExistingDocumentsList'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { EntitySelect } from '../../selects/reference-select'
import {
  applyInitialCommonEntityFromContext,
  createCommonEntitySelectHandler,
  type CommonEntityContext
} from '../../selects/reference-select/entityHandlingUtils'
import translations from './_i18n'

export interface NoteSegmentProps {
  // Context (used to authenticate downloads of existing documents)
  accessToken?: string

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
  existingDocuments?: Array<{
    id: string
    name?: string | null
    version?: number
    mimeType?: string | null
    fileSize?: number | null
    fileInfo?: any
  }>
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
  accessToken,
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

  // Handler: Process file changes (new uploads only - existing documents are
  // handled separately by ExistingDocumentsList so we never feed them through
  // the design-system FileUpload, whose built-in download is not auth-aware).
  const handleFilesChange = React.useCallback(
    (files: any[]) => {
      if (!onFilesChange) return

      const newFiles = files.map(f => (f.file instanceof File ? f.file : null)).filter((f): f is File => f !== null)
      onFilesChange(newFiles)
    },
    [onFilesChange]
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
                    const handleEntityChange = createCommonEntitySelectHandler({
                      form,
                      useIdFields: false,
                      entities: entities || [],
                      onAdditionalEntityChange
                    })
                    handleEntityChange(v)
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
                <div className="gba:flex gba:flex-col gba:gap-3">
                  <FileUpload
                    layout="list"
                    preview="icon"
                    maxFiles={10}
                    maxSizeMB={10}
                    multiple={true}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                    onChange={handleFilesChange}
                    data-testid={`${dataTestId}-file-upload`}
                  />
                  <ExistingDocumentsList
                    documents={existingDocuments}
                    accessToken={accessToken}
                    onRemove={onDocumentRemove}
                    label={t('note-attached-documents-label')}
                    data-testid={`${dataTestId}-existing-documents`}
                  />
                </div>
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
