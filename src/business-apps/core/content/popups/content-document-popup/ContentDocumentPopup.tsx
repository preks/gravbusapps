import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Switch,
  LocalizationProvider,
  SupportedLocale,
  FileUpload,
  type FileMetadata
} from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface ContentDocumentPopupProps extends BusinessAppContextProps {
  documentId?: string
  contentEntryId?: string
  parentFolderId?: string
}

interface ContentDocumentFormValues {
  id?: string
  title: string
  description?: string
  folder: boolean
  contentEntryId: string
  parentDocuments?: string[]
  file?: File
  tags?: string[]
}

const ContentDocumentPopupContent: React.FC<ContentDocumentPopupProps> = context => {
  const catalogContext = CatalogSelect.useContext()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Zod Schema
  const schema = useMemo(
    () =>
      z
        .object({
          id: z.string().optional(),
          title: z.string().min(1, 'Title is required'),
          description: z.string().optional(),
          folder: z.boolean(),
          contentEntryId: z.string().min(1, 'Content Entry is required'),
          parentDocuments: z.array(z.string()).optional(),
          tags: z.array(z.string()).optional()
        })
        .superRefine((data, ctx) => {
          // If folder=false (file), file upload is required
          if (!data.folder && !selectedFile && !context.documentId) {
            ctx.addIssue({
              code: 'custom',
              path: ['file'],
              message: 'File upload is required for documents'
            })
          }
        }),
    [selectedFile, context.documentId]
  )

  const defaultValues = useMemo(
    () => ({
      id: context.documentId || '',
      title: '',
      description: '',
      folder: false,
      contentEntryId: context.contentEntryId || '',
      parentDocuments: context.parentFolderId ? [context.parentFolderId] : [],
      tags: []
    }),
    [context.documentId, context.contentEntryId, context.parentFolderId]
  )

  const form = useForm<ContentDocumentFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched'
  })

  const { control, watch } = form
  const watchFolder = watch('folder')

  // Register form with catalog provider
  useEffect(() => {
    if (catalogContext?.registerForm) {
      catalogContext.registerForm(form)
    }
  }, [catalogContext, form])

  const handleFilesChange = useCallback(
    (files: FileMetadata[]) => {
      const firstFile = files[0]
      if (firstFile && firstFile.file instanceof File) {
        setSelectedFile(firstFile.file)

        // Auto-set title from filename if title is empty
        if (!form.getValues('title')) {
          const fileName = firstFile.file.name.replace(/\.[^/.]+$/, '') // Remove extension
          form.setValue('title', fileName)
        }
      } else {
        setSelectedFile(null)
      }
    },
    [form]
  )

  const handleSubmit = async (data: ContentDocumentFormValues) => {
    console.log('Content Document Form Submit:', data)

    const isUpdate = Boolean(context.documentId)
    const employeeId = context.userInfo?.employeeDetails?.employeeId

    if (!employeeId) {
      console.error('Missing employee ID. Context:', context.userInfo)
      throw new Error('Employee ID is required')
    }

    // Build payload
    const payload: any = {
      ...(isUpdate && { id: context.documentId }),
      title: data.title,
      description: data.description,
      folder: data.folder,
      contentEntryId: data.contentEntryId,
      parentDocuments: data.parentDocuments || [],
      tags: data.tags || [],
      creatorEmployeeId: isUpdate ? undefined : employeeId,
      updaterEmployeeId: isUpdate ? employeeId : undefined
    }

    // Add file data if it's a document (not folder)
    if (!data.folder && selectedFile) {
      // Convert file to base64 or handle file upload
      const reader = new FileReader()
      const fileDataPromise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(selectedFile)
      })

      const fileData = await fileDataPromise

      payload.fileUrl = fileData
      payload.fileSize = selectedFile.size
      payload.fileMimeType = selectedFile.type
      payload.fileExtension = selectedFile.name.split('.').pop()
    }

    console.log('Content Document Payload:', payload)
    return payload
  }

  return (
    <AppActionForm
      processType={context.documentId ? 'update' : 'create'}
      onSubmit={handleSubmit}
      formData={defaultValues}
      form={form}
      submitButtonText={context.documentId ? 'Update' : watchFolder ? 'Create Folder' : 'Upload Document'}
      showCancelButton={true}
      businessAppContext={context}
      data-testid="content-document-popup"
    >
      <div className="gba:space-y-6">
        {/* Folder Toggle */}
        <FormField
          control={control as any}
          name="folder"
          render={({ field }) => (
            <FormItem className="gba:flex gba:items-center gba:justify-between gba:space-y-0 gba:p-4 gba:border gba:border-border gba:rounded-lg">
              <FormLabel>This is a folder</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Content Entry Selection (if not provided) */}
        {!context.contentEntryId && (
          <FormField
            control={control as any}
            name="contentEntryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Document Area</FormLabel>
                <FormControl>
                  <CatalogSelect
                    catalogIdentifier="ContentGroup:v1:DOCUMENT"
                    value={field.value || null}
                    onValueChange={field.onChange}
                    data-testid="content-document-popup-area-select"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* File Upload (only if folder=false) */}
        {!watchFolder && (
          <div>
            <FormLabel>Upload File *</FormLabel>
            <div className="gba:mt-2" data-testid="content-document-file-upload">
              <FileUpload
                multiple={false}
                maxFiles={1}
                maxSizeMB={50}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
                layout="list"
                preview="icon"
                onFilesChange={handleFilesChange}
              />
            </div>
            {form.formState.errors.file && (
              <p className="gba:text-sm gba:text-destructive gba:mt-2">
                {form.formState.errors.file.message as string}
              </p>
            )}
          </div>
        )}

        {/* Title */}
        <FormField
          control={control as any}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{watchFolder ? 'Folder Name' : 'Document Title'} *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={watchFolder ? 'Enter folder name...' : 'Enter document title...'}
                  data-testid="content-document-title-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={control as any}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ''}
                  placeholder="Optional description..."
                  rows={3}
                  data-testid="content-document-description-textarea"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags */}
        <FormField
          control={control as any}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={(field.value || []).join(', ')}
                  onChange={e => {
                    const tags = e.target.value
                      .split(',')
                      .map(t => t.trim())
                      .filter(Boolean)
                    field.onChange(tags)
                  }}
                  placeholder="tag1, tag2, tag3..."
                  data-testid="content-document-tags-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </AppActionForm>
  )
}

// Outer component - wraps with LocalizationProvider and CatalogSelect.Provider
const ContentDocumentPopup: React.FC<ContentDocumentPopupProps> = context => {
  const locale = getCurrentActiveUserLocale() as SupportedLocale

  return (
    <LocalizationProvider locale={locale}>
      <CatalogSelect.Provider<ContentDocumentFormValues> {...context}>
        <ContentDocumentPopupContent {...context} />
      </CatalogSelect.Provider>
    </LocalizationProvider>
  )
}

export default ContentDocumentPopup
