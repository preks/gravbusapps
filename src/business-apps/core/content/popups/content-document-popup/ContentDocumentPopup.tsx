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
import { useContentEntry } from '@/common/data/content/hooks/useContentEntry'
import { ContentGroup } from '@/common/data/content/types/contentEnums'
import { useFileClient } from '@/common/network/files/useFileClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface ContentDocumentPopupProps extends BusinessAppContextProps {
  documentId?: string
  contentEntryId?: string
  changeMode?: 'UPSERT' | 'REPLACE'
}

interface ContentDocumentFormValues {
  id?: string
  title: string
  description?: string
  contentEntryId: string
  parentDocument?: string
  files?: File[]
  tags?: string[]
  documentGroupRef?: string
  documentTypeRef?: string
}

const ContentDocumentPopupContent: React.FC<ContentDocumentPopupProps> = context => {
  const catalogContext = CatalogSelect.useContext()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileClient = useFileClient(context)
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Fetch document areas (ContentEntries with DOCUMENT group)
  const documentAreaQueryParams = useMemo(
    () => ({
      contentGroup: ContentGroup.DOCUMENT,
      sortBy: 'title' as const,
      sortOrder: 'ASC' as const
    }),
    []
  )

  const documentAreaQueryOptions = useMemo(
    () => ({
      fields: ['id', 'title', 'contentGroup'] as const,
      relationLimit: 50
    }),
    []
  )

  const { entries: documentAreas, isLoading: isLoadingAreas } = useContentEntries(
    documentAreaQueryParams,
    context.accessToken,
    documentAreaQueryOptions
  )

  // Extract contentEntryId from props or additionalData
  const contentEntryId = useMemo(() => {
    return (
      context.contentEntryId ||
      context.additionalData?.contentEntryId ||
      context.additionalData?.psi_taskPayload?.psi_initialParameters?.contentEntryId
    )
  }, [context.contentEntryId, context.additionalData])

  // Extract changeMode from props or additionalData (default to UPSERT)
  const changeMode = useMemo(() => {
    return (
      context.changeMode ||
      context.additionalData?.changeMode ||
      context.additionalData?.psi_taskPayload?.psi_initialParameters?.changeMode ||
      'UPSERT'
    )
  }, [context.changeMode, context.additionalData])
  const contentEntryQueryOptions = useMemo(
    () => ({
      fields: ['id', 'version'] as Array<'id' | 'version'>
    }),
    []
  )
  const { entry: contentEntry } = useContentEntry(contentEntryId || '', {
    accessToken: context.accessToken,
    queryOptions: contentEntryQueryOptions
  })

  // Fetch available folders (parent documents) for the selected area
  const [availableFolders, setAvailableFolders] = useState<any[]>([])
  const [isLoadingFolders, setIsLoadingFolders] = useState(false)

  // Initialize form first
  const schema = useMemo(
    () =>
      z
        .object({
          id: z.string().optional(),
          title: z.string().optional(), // Optional since we auto-generate from file names
          description: z.string().optional(),
          contentEntryId: contentEntryId
            ? z.string().optional() // Not required if provided in additionalData
            : z.string().min(1, 'Content Entry is required'), // Required if not provided
          parentDocument: z.string().optional(),
          tags: z.array(z.string()).optional(),
          documentGroupRef: z.string().optional(),
          documentTypeRef: z.string().optional()
        })
        .superRefine((data, ctx) => {
          // File upload is required
          if (selectedFiles.length === 0 && !context.documentId) {
            ctx.addIssue({
              code: 'custom',
              path: ['files'],
              message: 'At least one file upload is required'
            })
          }
        }),
    [selectedFiles, context.documentId, contentEntryId]
  )

  const defaultValues = useMemo(
    () => ({
      id: context.documentId || '',
      title: '',
      description: '',
      contentEntryId: contentEntryId || '', // Use extracted contentEntryId from additionalData
      parentDocument: '',
      tags: [],
      documentGroupRef: '',
      documentTypeRef: ''
    }),
    [context.documentId, contentEntryId]
  )

  const form = useForm<ContentDocumentFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched'
  })

  const { control, watch } = form
  // Use contentEntryId from additionalData if available, otherwise watch form field
  const watchContentEntryId = contentEntryId || watch('contentEntryId')

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

  const handleFilesChange = useCallback((files: any[]) => {
    const validFiles = files.map(f => f?.file).filter((f): f is File => f instanceof File)

    setSelectedFiles(validFiles)
  }, [])

  const handlePreSubmit = useCallback(
    async (data: ContentDocumentFormValues): Promise<any> => {
      // Upload all selected files and collect fileInfo responses
      if (selectedFiles.length > 0) {
        try {
          const uploadPromises = selectedFiles.map(file =>
            fileClient.uploadFile(
              file,
              { accessScope: 'tenant' },
              { appName: 'content', folderPath: '/documents' },
              'fileContent'
            )
          )

          const uploadResponses = await Promise.all(uploadPromises)

          // Return data with uploaded file infos
          return {
            ...data,
            uploadedFiles: uploadResponses.map((response, index) => ({
              fileInfo: response.fileInfo,
              fileName: selectedFiles[index].name,
              fileSize: selectedFiles[index].size
            }))
          }
        } catch (error) {
          console.error('Error uploading files:', error)
          throw new Error('File upload failed')
        }
      }

      return data
    },
    [selectedFiles, fileClient]
  )

  const handleSubmit = async (data: any) => {
    console.log('Content Document Form Submit:', data)

    const employeeId = context.userInfo?.employeeDetails?.employeeId

    if (!employeeId) {
      console.error('Missing employee ID. Context:', context.userInfo)
      throw new Error('Employee ID is required')
    }

    // Use contentEntryId from additionalData if available, otherwise from form data
    const finalContentEntryId = contentEntryId || data.contentEntryId
    if (!finalContentEntryId) {
      throw new Error('Content Entry ID is required')
    }

    // Build documents array from uploaded files
    const documents = (data.uploadedFiles || []).map((uploadedFile: any) => ({
      name: uploadedFile.fileName.replace(/\.[^/.]+$/, ''), // Remove extension for name
      description: data.description || null,
      folder: false,
      fileInfo: uploadedFile.fileInfo,
      documentGroupRef: data.documentGroupRef || null,
      documentTypeRef: data.documentTypeRef || null,
      ...(data.parentDocument && { parentDocument: data.parentDocument })
    }))

    // Build payload with contentDocuments nested inside contentEntry
    // Use contentEntryId from additionalData if available, otherwise from form data
    const entryId = finalContentEntryId

    // Check if we need version for optimistic locking
    // If contentEntry is loaded and matches the form's contentEntryId, use its version
    const needsVersion = contentEntry?.id === entryId

    const payload = {
      changeMode: 'UPDATE',
      contentEntry: {
        id: entryId,
        ...(needsVersion && contentEntry?.version !== undefined && contentEntry.version !== null
          ? { version: contentEntry.version }
          : {}),
        contentDocuments: {
          changeMode: changeMode,
          documents: documents
        }
      }
    }

    console.log('Content Entry Payload with Documents:', payload)
    return payload
  }

  return (
    <AppActionForm
      processType="update"
      onSubmit={handleSubmit}
      handlePreSubmit={handlePreSubmit}
      formData={defaultValues}
      form={form}
      submitButtonText="Upload Documents"
      data-testid="content-document-popup"
    >
      <div className="gba:space-y-6">
        {/* Document Area and Parent Folder - Side by Side */}
        <div className={contentEntryId ? 'gba:grid gba:grid-cols-1 gba:gap-4' : 'gba:grid gba:grid-cols-2 gba:gap-4'}>
          {/* Content Entry Selection (Document Area) - Only show if not provided in additionalData */}
          {!contentEntryId && (
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
          )}

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
                        placeholder={(() => {
                          if (!watchContentEntryId) {
                            return 'Select area first...'
                          }
                          if (isLoadingFolders) {
                            return 'Loading folders...'
                          }
                          return 'Root level (no parent)'
                        })()}
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

        {/* File Upload */}
        <div>
          <FormLabel>Upload Files *</FormLabel>
          <div className="gba:mt-2" data-testid="content-document-file-upload">
            <FileUpload
              multiple={true}
              maxFiles={10}
              maxSizeMB={50}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
              layout="list"
              preview="icon"
              onChange={handleFilesChange}
            />
          </div>
          {form.formState.errors.files && (
            <p className="gba:text-sm gba:text-destructive gba:mt-2">{form.formState.errors.files.message as string}</p>
          )}
        </div>

        {/* Title (Optional) */}
        <FormField
          control={control as any}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title (Optional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Optional custom title..." data-testid="content-document-title-input" />
              </FormControl>
              <FormMessage />
              <p className="gba:text-sm gba:text-muted-foreground">Leave empty to use file names as titles</p>
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
