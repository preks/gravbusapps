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
  type FileMetadata
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { EntitySelect } from '../../selects/reference-select'

export interface NoteSegmentProps {
  // Entity selection
  showEntitySelection?: boolean
  entities?: Array<{ id: string; name: string; type: 'account' | 'contact' | 'opportunity' | 'lead' }>
  entitiesLoading?: boolean
  onEntitySearch?: (searchTerm: string) => void
  entitiesHasMore?: boolean
  onEntityLoadMore?: () => void
  initialEntityFromContext?: { accountId?: string; contactId?: string; opportunityId?: string; leadId?: string }

  // Labels
  titleLabel: React.ReactNode
  textLabel: React.ReactNode
  reminderLabel?: React.ReactNode
  entityLabel?: React.ReactNode
  uploadFileLabel?: React.ReactNode

  // Placeholders (optional)
  titlePlaceholder?: string
  textPlaceholder?: string
  reminderPlaceholder?: string

  // File upload callbacks
  onFilesChange?: (files: File[]) => void
  existingDocuments?: Array<{ id: string; name?: string; version?: number }>
  onDocumentRemove?: (documentId: string) => void

  // TestId prefix for container
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
  titleLabel,
  textLabel,
  reminderLabel,
  entityLabel,
  uploadFileLabel,
  titlePlaceholder,
  textPlaceholder,
  reminderPlaceholder,
  onFilesChange,
  existingDocuments = [],
  onDocumentRemove,
  'data-testid': dataTestId = 'note-segment'
}) => {
  const form = useFormContext()

  const normalizeDateTimeLocalValue = React.useCallback((v: string | undefined | null) => {
    if (!v) return ''
    const s = v.replace('Z', '')
    return s.length >= 16 ? s.slice(0, 16) : s
  }, [])

  React.useEffect(() => {
    if (showEntitySelection && onEntitySearch && (!entities || entities.length === 0)) {
      onEntitySearch('')
    }
  }, [showEntitySelection, onEntitySearch, entities])

  React.useEffect(() => {
    if (!showEntitySelection || !initialEntityFromContext) return
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
      form.setValue(found.key, { id: found.id })
    }
  }, [showEntitySelection, initialEntityFromContext, form])

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
            <FormLabel>{titleLabel}</FormLabel>
            <FormControl>
              <Input data-testid={`${dataTestId}-title`} maxLength={100} placeholder={titlePlaceholder} {...field} />
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
            <FormLabel>{textLabel}</FormLabel>
            <FormControl>
              <Textarea data-testid={`${dataTestId}-text`} placeholder={textPlaceholder} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Reminder Date */}
      {reminderLabel && (
        <FormField
          control={form.control}
          name="reminderDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{reminderLabel}</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  data-testid={`${dataTestId}-reminder-date`}
                  value={normalizeDateTimeLocalValue(field.value)}
                  onChange={field.onChange}
                  placeholder={reminderPlaceholder}
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
          control={form.control}
          name="relatedEntityId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{entityLabel || 'Related Entity'}</FormLabel>
              <FormControl>
                <EntitySelect
                  className="gba:w-full gba:h-auto"
                  entities={entities}
                  value={field.value || ''}
                  onValueChange={(v: string | null) => {
                    field.onChange(v)
                    const id = String(v || '')
                    const e = (entities || []).find(x => x.id === id)
                    form.setValue('account', undefined)
                    form.setValue('contact', undefined)
                    form.setValue('opportunity', undefined)
                    form.setValue('lead', undefined)
                    if (e) {
                      form.setValue(e.type, { id: e.id })
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
                  onFilesChange={handleFilesChange}
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

export default NoteSegment
