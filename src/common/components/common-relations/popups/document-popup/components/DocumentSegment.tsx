import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  Combobox,
  FileUpload
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { DocumentAIClassification } from './DocumentAIClassification'

export interface DocumentSegmentProps {
  // Mode and state
  mode: 'create' | 'update' | 'rename'
  isFolder: boolean

  // Catalog configuration
  groupCatalogIdentifier: string
  typeCatalogIdentifier: string

  // Parent folders
  parentFolders: { id: string; name: string }[]
  parentFoldersLoading: boolean

  // Existing file (for update mode)
  existingFileInfo?: {
    id?: string
    name?: string
    fileSize?: number | null
    mimeType?: string | null
  } | null

  // AI Classification
  enableAIClassification?: boolean
  aiSuggestion?: { group?: string; type?: string } | null
  aiLoading?: boolean
  aiError?: string | null
  onApplyAiSuggestion?: () => void

  // Callbacks
  onFilesChange: (files: any[]) => void

  ['data-testid']?: string
}

/**
 * DocumentSegment - Pure Presentation Component
 *
 * Renders all form fields for document creation/update.
 * Uses useFormContext() to access parent form.
 * No data fetching, no form initialization - purely presentation.
 */
export const DocumentSegment: React.FC<DocumentSegmentProps> = ({
  mode,
  isFolder,
  groupCatalogIdentifier,
  typeCatalogIdentifier,
  parentFolders,
  parentFoldersLoading,
  existingFileInfo,
  enableAIClassification = false,
  aiSuggestion,
  aiLoading,
  aiError,
  onApplyAiSuggestion,
  onFilesChange,
  'data-testid': dataTestId = 'document-segment'
}) => {
  const form = useFormContext()

  const isUpdateMode = mode === 'update'
  const isRenameMode = mode === 'rename'
  const watchedFolder = form.watch('folder')

  // Rename/Update folder mode - simple name field
  if (isRenameMode || (isUpdateMode && isFolder)) {
    return (
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {isFolder
                ? getTranslationFromI18nKeyAndLabel('document.folderName', 'Folder Name')
                : getTranslationFromI18nKeyAndLabel('document.name', 'Document Name')}
            </FormLabel>
            <FormControl>
              <Input {...field} data-testid={formatDataTestId(dataTestId, 'name-input')} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  // Create/Update file mode - full form
  return (
    <>
      {/* File Upload */}
      {!watchedFolder && (
        <>
          {isUpdateMode && existingFileInfo ? (
            <div className="gba:mb-4">
              <FormLabel>{getTranslationFromI18nKeyAndLabel('document.currentFile', 'Current File')}</FormLabel>
              <div className="gba:mt-2 gba:p-4 gba:bg-muted gba:rounded-lg gba:border gba:border-border">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:flex-shrink-0 gba:w-10 gba:h-10 gba:bg-background gba:rounded gba:flex gba:items-center gba:justify-center">
                    <svg
                      className="gba:w-6 gba:h-6 gba:text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                      {existingFileInfo.name || 'Document'}
                    </div>
                    {existingFileInfo.fileSize && (
                      <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                        {(existingFileInfo.fileSize / 1024 / 1024).toFixed(2)} MB
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <FormField
              control={form.control}
              name="files"
              render={() => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('document.files', 'Files')}</FormLabel>
                  <FormControl>
                    <FileUpload
                      layout="list"
                      preview="icon"
                      maxFiles={10}
                      maxSizeMB={50}
                      multiple={true}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.zip"
                      onChange={onFilesChange}
                      data-testid={formatDataTestId(dataTestId, 'file-upload')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* AI Classification Status */}
          {enableAIClassification && onApplyAiSuggestion && (
            <DocumentAIClassification
              suggestion={aiSuggestion || null}
              loading={aiLoading || false}
              error={aiError || null}
              onApplySuggestion={onApplyAiSuggestion}
              data-testid={formatDataTestId(dataTestId, 'ai-classification')}
            />
          )}
        </>
      )}

      {/* Document Group */}
      <FormField
        control={form.control}
        name="documentGroupRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{getTranslationFromI18nKeyAndLabel('document.group', 'Document Group')}</FormLabel>
            <FormControl>
              <CatalogSelect
                catalogIdentifier={`${groupCatalogIdentifier}:v1`}
                variant="combobox"
                value={field.value || ''}
                onValueChange={field.onChange}
                allowClear={true}
                data-testid={formatDataTestId(dataTestId, 'group-select')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Document Type */}
      <FormField
        control={form.control}
        name="documentTypeRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{getTranslationFromI18nKeyAndLabel('document.type', 'Document Type')}</FormLabel>
            <FormControl>
              <CatalogSelect
                catalogIdentifier={`${typeCatalogIdentifier}:v1`}
                variant="combobox"
                parentField="documentGroupRef"
                requireSourceForEnable={true}
                value={field.value || ''}
                onValueChange={field.onChange}
                allowClear={true}
                data-testid={formatDataTestId(dataTestId, 'type-select')}
                prefetch={true}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Parent Folder */}
      <FormField
        control={form.control}
        name="parentDocument"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel('document.parentFolder', 'Parent Folder (optional)')}
            </FormLabel>
            <FormControl>
              <Combobox
                value={field.value || ''}
                onValueChange={field.onChange}
                options={parentFolders.map(folder => ({
                  value: folder.id,
                  label: folder.name
                }))}
                placeholder={
                  parentFoldersLoading
                    ? getTranslationFromI18nKeyAndLabel('document.parentFolder.loading', 'Loading...')
                    : getTranslationFromI18nKeyAndLabel('document.parentFolder.select', 'Select parent folder')
                }
                emptyText={getTranslationFromI18nKeyAndLabel('document.parentFolder.empty', 'No folders found')}
                searchPlaceholder={getTranslationFromI18nKeyAndLabel(
                  'document.parentFolder.search',
                  'Search folders...'
                )}
                allowClear={true}
                disabled={parentFoldersLoading}
                data-testid={formatDataTestId(dataTestId, 'parent-folder-combobox')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Document Name */}
      <FormField
        control={form.control}
        name="name"
        rules={{
          required: getTranslationFromI18nKeyAndLabel('document.name.required', 'Document name is required')
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {watchedFolder
                ? getTranslationFromI18nKeyAndLabel('document.folderName', 'Folder Name')
                : getTranslationFromI18nKeyAndLabel('document.name', 'Document Name')}
            </FormLabel>
            <FormControl>
              <Input {...field} data-testid={formatDataTestId(dataTestId, 'name-input')} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{getTranslationFromI18nKeyAndLabel('document.description', 'Description')}</FormLabel>
            <FormControl>
              <Textarea {...field} rows={3} data-testid={formatDataTestId(dataTestId, 'description-input')} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Expiration Date */}
      <FormField
        control={form.control}
        name="expirationDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{getTranslationFromI18nKeyAndLabel('document.expirationDate', 'Expiration Date')}</FormLabel>
            <FormControl>
              <Input type="date" {...field} data-testid={formatDataTestId(dataTestId, 'expiration-date-input')} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
