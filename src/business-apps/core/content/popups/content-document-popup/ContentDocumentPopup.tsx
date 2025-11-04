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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import { ContentGroup } from '@/common/data/content/types/contentEnums'
import { useFileClient } from '@/common/network/files/useFileClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { FileUploadResponse } from '@/common/types/FileTypes'

export interface ContentDocumentPopupProps extends BusinessAppContextProps {
  documentId?: string
  contentEntryId?: string
}

interface ContentDocumentFormValues {
  id?: string
  title: string
  description?: string
  folder: boolean
  contentEntryId: string
  parentDocument?: string
  file?: File
  tags?: string[]
  documentGroupRef?: string
  documentTypeRef?: string
}

const ContentDocumentPopupContent: React.FC<ContentDocumentPopupProps> = context => {
  const catalogContext = CatalogSelect.useContext()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileClient = useFileClient(context)
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Fetch document areas (ContentEntries with DOCUMENT group)
  const documentAreaQueryParams = useMemo(
    () => ({
      contentGroupRef: ContentGroup.DOCUMENT,
      sortBy: 'title' as const,
      sortOrder: 'ASC' as const
    }),
    []
  )

  const { entries: documentAreas, isLoading: isLoadingAreas } = useContentEntries(
    documentAreaQueryParams,
    context.accessToken
  )

  // Fetch available folders (parent documents) for the selected area
  const [availableFolders, setAvailableFolders] = useState<any[]>([])
  const [isLoadingFolders, setIsLoadingFolders] = useState(false)

  // Initialize form first
  const schema = useMemo(
    () =>
      z
        .object({
          id: z.string().optional(),
          title: z.string().min(1, 'Title is required'),
          description: z.string().optional(),
          folder: z.boolean(),
          contentEntryId: z.string().min(1, 'Content Entry is required'),
          parentDocument: z.string().optional(),
          tags: z.array(z.string()).optional(),
          documentGroupRef: z.string().optional(),
          documentTypeRef: z.string().optional()
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
      parentDocument: '',
      tags: [],
      documentGroupRef: '',
      documentTypeRef: ''
    }),
    [context.documentId, context.contentEntryId]
  )

  const form = useForm<ContentDocumentFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched'
  })

  const { control, watch } = form
  const watchFolder = watch('folder')
  const watchContentEntryId = watch('contentEntryId')

  // Load folders when contentEntryId changes
  React.useEffect(() => {
    const loadFolders = async () => {
      if (!watchContentEntryId || !context.accessToken) {
        setAvailableFolders([])
        return
      }

      setIsLoadingFolders(true)
      try {
        const query = `
          query GetFolders($contentEntryId: uuid!) {
            ContentDocument(
              where: {
                contentEntry: { id: { _eq: $contentEntryId } }
                folder: { _eq: true }
              }
              orderBy: { name: ASC }
            ) {
              id
              name
              description
            }
          }
        `
        const result = await graphqlClient.request<{ ContentDocument: any[] }>(query, {
          contentEntryId: watchContentEntryId
        })
        console.log('Loaded folders:', result.ContentDocument)
        setAvailableFolders(result.ContentDocument || [])
      } catch (error) {
        console.error('Error loading folders:', error)
        setAvailableFolders([])
      } finally {
        setIsLoadingFolders(false)
      }
    }

    loadFolders()
  }, [watchContentEntryId, context.accessToken, graphqlClient])

  // Register form with catalog provider
  useEffect(() => {
    if (catalogContext?.registerForm) {
      catalogContext.registerForm(form)
    }
  }, [catalogContext, form])

  const handleFilesChange = useCallback(
    (files: any[]) => {
      const firstFile = files[0]
      if (firstFile?.file instanceof File) {
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

  const handlePreSubmit = useCallback(
    async (data: ContentDocumentFormValues): Promise<ContentDocumentFormValues> => {
      // If it's a document (not folder) and has a file, upload it first
      if (!data.folder && selectedFile) {
        try {
          const uploadResponse: FileUploadResponse = await fileClient.uploadFile(
            selectedFile,
            { accessScope: 'tenant' },
            { appName: 'content', folderPath: '/documents' },
            'fileContent'
          )

          // Store the fileInfo response to use in handleSubmit
          return {
            ...data,
            fileInfo: uploadResponse.fileInfo
          } as any
        } catch (error) {
          console.error('Error uploading file:', error)
          throw new Error('File upload failed')
        }
      }

      return data
    },
    [selectedFile, fileClient]
  )

  const handleSubmit = async (data: any) => {
    console.log('Content Document Form Submit:', data)

    const isUpdate = Boolean(context.documentId)
    const employeeId = context.userInfo?.employeeDetails?.employeeId

    if (!employeeId) {
      console.error('Missing employee ID. Context:', context.userInfo)
      throw new Error('Employee ID is required')
    }

    // Build contentDocument object
    const contentDocument: any = {
      name: data.title, // ContentDocument uses 'name' field, not 'title'
      description: data.description,
      folder: data.folder,
      contentEntry: data.contentEntryId,
      tags: data.tags || [],
      documentGroupRef: data.documentGroupRef,
      documentTypeRef: data.documentTypeRef
    }

    // Add parentDocument if selected (single string, not array)
    if (data.parentDocument) {
      contentDocument.parentDocument = data.parentDocument
    }

    // Add fileInfo from pre-submit upload
    if (!data.folder && data.fileInfo) {
      contentDocument.fileInfo = data.fileInfo
    }

    // Build payload with contentDocument nested
    const payload: any = {
      ...(isUpdate && { id: context.documentId }),
      contentDocument,
      creatorEmployeeId: isUpdate ? undefined : employeeId,
      updaterEmployeeId: isUpdate ? employeeId : undefined
    }

    console.log('Content Document Payload:', payload)
    return payload
  }

  return (
    <AppActionForm
      processType={context.documentId ? 'update' : 'create'}
      onSubmit={handleSubmit}
      handlePreSubmit={handlePreSubmit}
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

        {/* Document Area and Parent Folder - Side by Side */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          {/* Content Entry Selection (Document Area) */}
          <FormField
            control={control as any}
            name="contentEntryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Document Area *</FormLabel>
                <FormControl>
                  <Select value={field.value || ''} onValueChange={field.onChange} disabled={isLoadingAreas}>
                    <SelectTrigger data-testid="content-document-popup-area-select">
                      <SelectValue placeholder={isLoadingAreas ? 'Loading...' : 'Select document area...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {documentAreas?.map(area => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Parent Folder Selection */}
          <FormField
            control={control as any}
            name="parentDocument"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent Folder (Optional)</FormLabel>
                <FormControl>
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    disabled={!watchContentEntryId || isLoadingFolders}
                  >
                    <SelectTrigger data-testid="content-document-popup-parent-select">
                      <SelectValue
                        placeholder={
                          !watchContentEntryId
                            ? 'Select area first...'
                            : isLoadingFolders
                              ? 'Loading folders...'
                              : 'Root level (no parent)'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFolders.map(folder => (
                        <SelectItem key={folder.id} value={folder.id}>
                          {folder.name || 'Unnamed Folder'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Content Document Group */}
        <FormField
          control={control as any}
          name="documentGroupRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Group</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier="ContentDocumentGroup"
                  value={field.value || null}
                  onValueChange={field.onChange}
                  data-testid="content-document-popup-group-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Content Document Type */}
        <FormField
          control={control as any}
          name="documentTypeRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Type</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier="ContentDocumentType"
                  parentField="documentGroupRef"
                  requireSourceForEnable={true}
                  value={field.value || null}
                  onValueChange={field.onChange}
                  data-testid="content-document-popup-type-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
