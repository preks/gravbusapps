import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslation } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { CatalogSelect } from '@/components/catalog-select'
import { useCreateCatalogEntries } from '@/common/data/catalog/hooks/useCreateCatalogEntries'
import { useFileClient } from '@/common/network/files/useFileClient'
import { ContentRole } from '@/common/data/content/types/contentEnums'
import { buildContentEntryPayload } from '@/common/data/content/payloads/contentEntryPayloads'
import { useContentEntry } from '@/common/data/content/hooks/useContentEntry'
import { buildFileUrl } from '@/common/utils/fileUtils'
import { ArticleSegment, QuestionSegment, DocumentSegment, GlossarySegment } from './segments'
import translations from './_i18n'

export interface ContentEntryWindowProps extends BusinessAppContextProps {
  contentId?: string
  contentGroupRef?: string
}

export interface ContentEntryFormValues {
  id?: string
  version?: number
  title: string
  previewText: string
  content: string
  contentImage: string | null
  pictureThumbnail: string | null
  contentGroupRef: string
  contentTypeRef?: string
  role?: string
  displayAuthor: boolean
  author: string | null
  allowComment: boolean
  allowReaction: boolean
  startDate: Date | null | string
  endDate: Date | null | string
  schedulePublication: boolean
  categories: string[] | undefined
  tags: string[] | undefined
}

const ContentEntryWindowContent: React.FC<ContentEntryWindowProps> = context => {
  const { t } = useTranslation(translations)
  const catalogContext = CatalogSelect.useContext()
  const { validateField } = CatalogSelect.useValidation()
  const { createCatalogEntries } = useCreateCatalogEntries(context)
  const fileClient = useFileClient(context)
  // Extract props to mark as used
  const { contentId, contentGroupRef } = context

  // Extract contentEntryId from additionalData (for update mode)
  const contentEntryId =
    contentId ||
    context.additionalData?.contentEntryId ||
    context.additionalData?.psi_taskPayload?.psi_initialParameters?.contentEntryId

  // Memoize query options to prevent re-fetching
  const queryOptions = useMemo(() => ({ config: 'detail' as const }), [])

  // Load content entry data if in update mode
  const { entry: loadedContentEntry, isLoading: contentEntryLoading } = useContentEntry(contentEntryId || '', {
    accessToken: context.accessToken,
    queryOptions
  })

  const [image, setImage] = useState<string | null>(null)
  const [imageInfo, setImageInfo] = useState<{ name: string; size: string } | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const imageBlobUrlRef = useRef<string | null>(null)

  // Track tags/categories that need to be created (labels, not IDs)
  const [categoriesToCreate, setCategoriesToCreate] = useState<Set<string>>(new Set())
  const [tagsToCreate, setTagsToCreate] = useState<Set<string>>(new Set())

  // Helper function to generate thumbnail from image file or base64
  const generateThumbnail = useCallback(
    async (
      source: File | string,
      maxWidth: number = 300,
      maxHeight: number = 300,
      quality: number = 0.8
    ): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          // Calculate new dimensions maintaining aspect ratio
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width
              width = maxWidth
            }
          } else if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)

          // Convert to base64
          const base64String = canvas.toDataURL('image/jpeg', quality)
          resolve(base64String)
        }
        img.onerror = () => {
          reject(new Error('Failed to load image'))
        }

        // Set image source
        if (source instanceof File) {
          const reader = new FileReader()
          reader.onload = e => {
            if (e.target?.result) {
              img.src = e.target.result as string
            }
          }
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsDataURL(source)
        } else {
          img.src = source
        }
      })
    },
    []
  )

  // Handler for when a new category tag is created - add to tracking set
  const onCreateCategory = useCallback((label: string): Promise<string> => {
    setCategoriesToCreate(prev => new Set([...prev, label]))
    // Return a promise that resolves to the label (will be replaced with ID in handlePreSubmit)
    return Promise.resolve(label)
  }, [])

  // Handler for when a new tag is created - add to tracking set
  const onCreateTag = useCallback((label: string): Promise<string> => {
    setTagsToCreate(prev => new Set([...prev, label]))
    // Return a promise that resolves to the label (will be replaced with ID in handlePreSubmit)
    return Promise.resolve(label)
  }, [])

  // Handler to sync categoriesToCreate with form value changes
  const handleCategoriesChange = useCallback((newCategories: string[]) => {
    setCategoriesToCreate(prev => {
      const updated = new Set(prev)
      // Remove any categories that are no longer in the form value
      prev.forEach(label => {
        if (!newCategories.includes(label)) {
          updated.delete(label)
        }
      })
      return updated
    })
  }, [])

  // Handler to sync tagsToCreate with form value changes
  const handleTagsChange = useCallback((newTags: string[]) => {
    setTagsToCreate(prev => {
      const updated = new Set(prev)
      // Remove any tags that are no longer in the form value
      prev.forEach(label => {
        if (!newTags.includes(label)) {
          updated.delete(label)
        }
      })
      return updated
    })
  }, [])

  // Extract contentGroupRef from props, additionalData, or loaded entry
  const extractedContentGroupRef =
    contentGroupRef ||
    context.additionalData?.contentGroupRef ||
    context.additionalData?.contentGroup ||
    context.additionalData?.psi_taskPayload?.psi_initialParameters?.contentGroupRef ||
    context.additionalData?.psi_taskPayload?.psi_initialParameters?.contentGroup ||
    loadedContentEntry?.contentGroupRef ||
    null

  // Use contentEntryId (from props or additionalData)
  const extractedContentId = contentEntryId

  // Author info from context
  const authorName = useMemo(() => {
    const employee = context.userInfo?.employeeDetails
    if (employee?.firstName && employee?.lastName) {
      return `${employee.firstName} ${employee.lastName}`
    }
    return null
  }, [context.userInfo])

  // Zod Schema with conditional validation for contentTypeRef and version
  const schema = useMemo(
    () =>
      z
        .object({
          id: z.string().optional(),
          version: z.number().optional(),
          title: z.string().min(1, t('title-required')),
          previewText: z.string().optional(),
          content: z.string().min(1, t('content-required')),
          contentImage: z.string().nullable().optional(),
          contentGroupRef: z.string().min(1, t('group-required')),
          contentTypeRef: z.string().optional(),
          role: z.string().optional(),
          displayAuthor: z.boolean(),
          author: z.string().nullable(),
          allowComment: z.boolean(),
          allowReaction: z.boolean(),
          startDate: z.union([z.date(), z.string()]).nullable(),
          endDate: z.union([z.date(), z.string()]).nullable(),
          schedulePublication: z.boolean(),
          categories: z.array(z.string()).optional(),
          tags: z.array(z.string()).optional()
        })
        .superRefine((data, ctx) => {
          // Version is required when id is present (update mode)
          if (data.id && (data.version === undefined || data.version === null)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('version-required') || 'Version is required for updates',
              path: ['version']
            })
          }
          // Conditional validation: contentTypeRef required only when it has options
          if (validateField('contentTypeRef')) {
            if (!data.contentTypeRef || data.contentTypeRef.trim() === '') {
              ctx.addIssue({
                code: 'custom',
                path: ['contentTypeRef'],
                message: t('type-required')
              })
            }
          }

          // Conditional validation: startDate and endDate required when schedulePublication is true
          if (data.schedulePublication) {
            if (!data.startDate) {
              ctx.addIssue({
                code: 'custom',
                path: ['startDate'],
                message: t('start-date-required')
              })
            }
            if (!data.endDate) {
              ctx.addIssue({
                code: 'custom',
                path: ['endDate'],
                message: t('end-date-required')
              })
            }
          }
        }),
    [t, validateField]
  )

  // Map loaded content entry to form values
  const mappedFormValues = useMemo(() => {
    if (!loadedContentEntry) {
      return null
    }

    // Extract categories and tags IDs
    const categories =
      loadedContentEntry.contentEntryCategories
        ?.map(cat => cat.contentCategoryRef || cat.contentCategory?.id)
        .filter(Boolean) || []
    const tags =
      loadedContentEntry.contentEntryTags?.map(tag => tag.contentTagRef || tag.contentTag?.id).filter(Boolean) || []

    // Parse picture if it's a JSON string
    let contentImage: string | null = null
    if (loadedContentEntry.picture) {
      try {
        const parsed =
          typeof loadedContentEntry.picture === 'string'
            ? JSON.parse(loadedContentEntry.picture)
            : loadedContentEntry.picture
        contentImage = typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
      } catch {
        contentImage = typeof loadedContentEntry.picture === 'string' ? loadedContentEntry.picture : null
      }
    }

    return {
      id: loadedContentEntry.id || '',
      version: loadedContentEntry.version,
      title: loadedContentEntry.title || '',
      previewText: loadedContentEntry.preview || '',
      content: loadedContentEntry.content || '',
      contentGroupRef: loadedContentEntry.contentGroupRef || '',
      contentTypeRef: loadedContentEntry.contentTypeRef || '',
      contentImage: contentImage,
      pictureThumbnail: loadedContentEntry.pictureThumbnail || null,
      displayAuthor: loadedContentEntry.displayCreator ?? true,
      allowComment: loadedContentEntry.allowComment ?? true,
      allowReaction: loadedContentEntry.allowReaction ?? true,
      author: authorName,
      schedulePublication: !!(loadedContentEntry.activeFrom || loadedContentEntry.activeTo),
      startDate: loadedContentEntry.activeFrom || null,
      endDate: loadedContentEntry.activeTo || null,
      categories: categories.length > 0 ? categories : [],
      tags: tags.length > 0 ? tags : []
    }
  }, [loadedContentEntry, authorName])

  const defaultValues = useMemo(() => {
    // If we have mapped values from loaded entry, use those
    if (mappedFormValues) {
      return mappedFormValues
    }

    // Otherwise use defaults
    return {
      id: '',
      version: 0,
      title: '',
      previewText: '',
      content: '',
      contentGroupRef: extractedContentGroupRef || '',
      contentTypeRef: '',
      tags: [],
      categories: [],
      contentImage: null,
      pictureThumbnail: null,
      displayAuthor: true,
      allowComment: true,
      allowReaction: true,
      author: authorName,
      schedulePublication: false,
      startDate: null,
      endDate: null
    }
  }, [mappedFormValues, extractedContentGroupRef, authorName])

  const form = useForm<ContentEntryFormValues, any, ContentEntryFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Sync form when loaded content entry changes
  const contentEntryIdRef = useRef<string | null>(null)
  useEffect(() => {
    // Only process if we have a loaded entry and it's different from what we've processed
    if (loadedContentEntry?.id && contentEntryIdRef.current !== loadedContentEntry.id) {
      contentEntryIdRef.current = loadedContentEntry.id

      // Extract categories and tags IDs
      const categories =
        loadedContentEntry.contentEntryCategories
          ?.map(cat => cat.contentCategoryRef || cat.contentCategory?.id)
          .filter(Boolean) || []
      const tags =
        loadedContentEntry.contentEntryTags?.map(tag => tag.contentTagRef || tag.contentTag?.id).filter(Boolean) || []

      // Parse picture if it's a JSON string
      let contentImage: string | null = null
      if (loadedContentEntry.picture) {
        try {
          const parsed =
            typeof loadedContentEntry.picture === 'string'
              ? JSON.parse(loadedContentEntry.picture)
              : loadedContentEntry.picture
          contentImage = typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
        } catch {
          contentImage = typeof loadedContentEntry.picture === 'string' ? loadedContentEntry.picture : null
        }
      }

      const formValues: ContentEntryFormValues = {
        id: loadedContentEntry.id || '',
        version: loadedContentEntry.version,
        title: loadedContentEntry.title || '',
        previewText: loadedContentEntry.preview || '',
        content: loadedContentEntry.content || '',
        contentGroupRef: loadedContentEntry.contentGroupRef || '',
        contentTypeRef: loadedContentEntry.contentTypeRef || '',
        contentImage: contentImage,
        pictureThumbnail: loadedContentEntry.pictureThumbnail || null,
        displayAuthor: loadedContentEntry.displayCreator ?? true,
        allowComment: loadedContentEntry.allowComment ?? true,
        allowReaction: loadedContentEntry.allowReaction ?? true,
        author: authorName,
        schedulePublication: !!(loadedContentEntry.activeFrom || loadedContentEntry.activeTo),
        startDate: loadedContentEntry.activeFrom || null,
        endDate: loadedContentEntry.activeTo || null,
        categories: categories.length > 0 ? categories : [],
        tags: tags.length > 0 ? tags : []
      }

      form.reset(formValues)
    }
  }, [loadedContentEntry?.id, authorName, form])

  // Separate useEffect for image loading (following ArticleView pattern)
  useEffect(() => {
    // Clean up previous blob URL if it exists
    if (imageBlobUrlRef.current && imageBlobUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(imageBlobUrlRef.current)
      imageBlobUrlRef.current = null
    }

    if (!loadedContentEntry?.picture || !context.accessToken) {
      setImage(null)
      setImageInfo(null)
      return
    }

    let fileInfo: any = null
    try {
      fileInfo =
        typeof loadedContentEntry.picture === 'string'
          ? JSON.parse(loadedContentEntry.picture)
          : loadedContentEntry.picture
    } catch {
      // If it's not JSON, check if it's a data URL (base64) - use directly
      if (typeof loadedContentEntry.picture === 'string' && loadedContentEntry.picture.startsWith('data:')) {
        setImage(loadedContentEntry.picture)
        setImageInfo(null)
        return
      }
      // Otherwise try to use as direct URL (old format)
      setImage(loadedContentEntry.picture)
      setImageInfo(null)
      return
    }

    if (!fileInfo?.path) {
      setImage(null)
      setImageInfo(null)
      return
    }

    // Fetch image with authentication using buildFileUrl
    let isCancelled = false

    const fetchImage = async () => {
      try {
        const blobUrl = await buildFileUrl(fileInfo, context.accessToken!)
        if (!isCancelled) {
          imageBlobUrlRef.current = blobUrl
          setImage(blobUrl)
          setImageInfo({
            name: fileInfo.fileMetadata?.originalFileName || 'Image',
            size: fileInfo.fileMetadata?.size ? `${(fileInfo.fileMetadata.size / 1024 / 1024).toFixed(2)}MB` : 'Unknown'
          })
        } else {
          // Clean up blob if fetch completed but component already unmounted/changed
          URL.revokeObjectURL(blobUrl)
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('[ContentEntryWindow] Error fetching image:', error)
          setImage(null)
          setImageInfo(null)
        }
      }
    }

    fetchImage()

    // Cleanup function
    return () => {
      isCancelled = true
      // Clean up blob URL on unmount or when dependencies change
      if (imageBlobUrlRef.current && imageBlobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(imageBlobUrlRef.current)
        imageBlobUrlRef.current = null
      }
    }
  }, [loadedContentEntry?.picture, context.accessToken])

  const { control, watch, setValue } = form
  const watchContentGroupRef = watch('contentGroupRef')
  const watchTitle = watch('title')
  const watchPreviewText = watch('previewText')
  const watchContent = watch('content')
  const watchSchedulePublication = watch('schedulePublication')

  // Determine which segment to render based on ContentGroup
  const currentSegment = useMemo(() => {
    if (!watchContentGroupRef) return 'article'

    if (watchContentGroupRef === 'ContentGroup:v1:QUESTION') {
      return 'question'
    } else if (watchContentGroupRef === 'ContentGroup:v1:DOCUMENT') {
      return 'document'
    } else if (watchContentGroupRef === 'ContentGroup:v1:GLOSSARY') {
      return 'glossary'
    } else {
      // NEWS, KNOWLEDGE, INTRANET use article segment
      return 'article'
    }
  }, [watchContentGroupRef])

  // Register form with catalog provider
  useEffect(() => {
    if (catalogContext?.registerForm) {
      catalogContext.registerForm(form)
    }
  }, [catalogContext, form])

  // Update author when it changes
  useEffect(() => {
    if (authorName) {
      form.setValue('author', authorName)
    }
  }, [authorName, form])

  // Sync contentGroupRef from additionalData (for new content entries)
  useEffect(() => {
    if (extractedContentGroupRef && !extractedContentId) {
      // Only set if creating new entry (no existing content ID)
      const currentValue = form.getValues('contentGroupRef')
      if (!currentValue || currentValue !== extractedContentGroupRef) {
        form.setValue('contentGroupRef', extractedContentGroupRef)
      }
    }
  }, [extractedContentGroupRef, extractedContentId, form])

  // Helper: Upload image file
  const uploadImageFile = useCallback(
    async (file: File, updatedData: ContentEntryFormValues): Promise<void> => {
      const contentEntryId = extractedContentId || 'temp'
      const folderPath = `/content/${contentEntryId}/images`

      const thumbnail = await generateThumbnail(file)
      updatedData.pictureThumbnail = thumbnail

      const uploadResponse = await fileClient.uploadFile(
        file,
        { accessScope: 'tenant' },
        {
          appName: 'content',
          folderPath: folderPath,
          mimeType: file.type
        }
      )

      if (uploadResponse?.fileInfo) {
        updatedData.contentImage = JSON.stringify(uploadResponse.fileInfo)
      }
    },
    [fileClient, extractedContentId]
  )

  // Helper: Convert base64 to file and upload
  const uploadBase64Image = useCallback(
    async (base64Data: string, updatedData: ContentEntryFormValues): Promise<void> => {
      const regex = /^data:image\/(\w+);base64,(.+)$/
      const execResult = regex.exec(base64Data)
      if (!execResult) {
        throw new Error('Invalid base64 image format')
      }

      const mimeType = execResult[1]
      const base64String = execResult[2]
      const byteCharacters = atob(base64String)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.codePointAt(i) ?? 0
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: `image/${mimeType}` })
      const file = new File([blob], `image.${mimeType}`, { type: `image/${mimeType}` })

      const thumbnail = await generateThumbnail(base64Data)
      updatedData.pictureThumbnail = thumbnail

      const contentEntryId = extractedContentId || 'temp'
      const folderPath = `/content/${contentEntryId}/images`

      const uploadResponse = await fileClient.uploadFile(
        file,
        { accessScope: 'tenant' },
        {
          appName: 'content',
          folderPath: folderPath,
          mimeType: file.type
        }
      )

      if (uploadResponse?.fileInfo) {
        updatedData.contentImage = JSON.stringify(uploadResponse.fileInfo)
      }
    },
    [fileClient, extractedContentId]
  )

  // PreSubmit Handler: Upload image
  const handlePreSubmit = useCallback(
    async (data: ContentEntryFormValues): Promise<ContentEntryFormValues> => {
      const updatedData = { ...data }

      // Create new categories
      if (categoriesToCreate.size > 0) {
        const categoryLabels = Array.from(categoriesToCreate)
        const categoryEntries = categoryLabels.map(label => ({
          code: label.toUpperCase().replaceAll(/\s+/g, '_'),
          value: label,
          translations: []
        }))

        try {
          const createResult = await createCatalogEntries('ContentCategory', 'v1', categoryEntries)

          // Create mapping from label to ID
          const labelToIdMap = new Map<string, string>()
          createResult.results.forEach((result, index) => {
            if (result.success && result.createdEntry) {
              labelToIdMap.set(categoryLabels[index], result.createdEntry.id)
            }
          })

          // Replace labels with IDs in categories array
          if (updatedData.categories) {
            updatedData.categories = updatedData.categories.map(cat => labelToIdMap.get(cat) || cat)
          }

          // Clear the set after creation
          setCategoriesToCreate(new Set())
        } catch (error) {
          console.error('Error creating categories:', error)
          throw new Error('Failed to create new categories')
        }
      }

      // Create new tags
      if (tagsToCreate.size > 0) {
        const tagLabels = Array.from(tagsToCreate)
        const tagEntries = tagLabels.map(label => ({
          code: label.toUpperCase().replaceAll(/\s+/g, '_'),
          value: label,
          translations: []
        }))

        try {
          const createResult = await createCatalogEntries('ContentTag', 'v1', tagEntries)

          // Create mapping from label to ID
          const labelToIdMap = new Map<string, string>()
          createResult.results.forEach((result, index) => {
            if (result.success && result.createdEntry) {
              labelToIdMap.set(tagLabels[index], result.createdEntry.id)
            }
          })

          // Replace labels with IDs in tags array
          if (updatedData.tags) {
            updatedData.tags = updatedData.tags.map(tag => labelToIdMap.get(tag) || tag)
          }

          // Clear the set after creation
          setTagsToCreate(new Set())
        } catch (error) {
          console.error('Error creating tags:', error)
          throw new Error('Failed to create new tags')
        }
      }

      // Upload image
      if (imageFile && data.contentImage) {
        try {
          await uploadImageFile(imageFile, updatedData)
        } catch (error) {
          console.error('Error uploading image:', error)
          throw new Error('Failed to upload image')
        }
      } else if (
        data.contentImage &&
        typeof data.contentImage === 'string' &&
        data.contentImage.startsWith('data:image/')
      ) {
        try {
          await uploadBase64Image(data.contentImage, updatedData)
        } catch (error) {
          console.error('Error uploading base64 image:', error)
          throw new Error('Failed to upload image')
        }
      }

      return updatedData
    },
    [uploadImageFile, uploadBase64Image, imageFile, createCatalogEntries, categoriesToCreate, tagsToCreate]
  )

  const handleSubmit = async (data: ContentEntryFormValues) => {
    const isUpdate = Boolean(extractedContentId)
    const employeeId = context.userInfo?.employeeDetails?.employeeId

    if (!employeeId) {
      console.error('Missing employee ID. Context:', context.userInfo)
      throw new Error('Employee ID is required')
    }

    // Validate version is present for updates
    if (isUpdate) {
      if (!extractedContentId) {
        throw new Error('Content entry ID is required for updates')
      }
      if (data.version === undefined || data.version === null) {
        throw new Error('Version is required for updates. Please reload the content entry.')
      }
    }

    // Use centralized payload builder
    const payload = buildContentEntryPayload({
      // Identity (for updates)
      ...(isUpdate && {
        id: extractedContentId,
        version: data.version
      }),

      // Core fields
      title: data.title,
      preview: data.previewText,
      content: data.content,
      // picture should contain fileInfo (JSON string) from pre-submit, not base64 thumbnail
      picture: data.contentImage,
      pictureThumbnail: data.pictureThumbnail,

      // Metadata
      role: ContentRole.ROOT, // Always ROOT for top-level content entries
      contentGroupRef: data.contentGroupRef,
      contentTypeRef: data.contentTypeRef,

      // Employee relations
      ...(isUpdate ? { updaterEmployeeId: employeeId } : { creatorEmployeeId: employeeId }),

      // Settings
      displayCreator: data.displayAuthor,
      displayUpdater: false,
      allowComment: data.allowComment,
      allowReaction: data.allowReaction,

      // Optional fields
      activeFrom: data.startDate || null,
      activeTo: data.endDate || null,

      // Bulk Operations: Categories
      ...(data.categories &&
        data.categories.length > 0 && {
          categories: {
            changeMode: 'UPSERT' as const,
            items: data.categories.map(categoryRef => ({
              contentCategoryRef: categoryRef
            }))
          }
        }),

      // Bulk Operations: Tags
      ...(data.tags &&
        data.tags.length > 0 && {
          tags: {
            changeMode: 'UPSERT' as const,
            items: data.tags.map(tagRef => ({
              contentTagRef: tagRef
            }))
          }
        })
    })

    console.log('Content Entry Payload:', payload)
    return payload
  }

  // Show loading state while fetching content entry
  if (contentEntryLoading && contentEntryId) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-screen">
        <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-primary"></div>
      </div>
    )
  }

  return (
    <AppActionForm
      processType={extractedContentId ? 'update' : 'create'}
      onSubmit={handleSubmit}
      handlePreSubmit={handlePreSubmit}
      formData={defaultValues}
      form={form}
      schema={schema}
      submitButtonText={extractedContentId ? t('update-content') : t('create-content')}
      cancelButtonText={t('cancel') || 'Cancel'}
      data-testid="content-entry-window"
    >
      <div className="gba:flex gba:flex-col gba:h-full gba:gap-4">
        {currentSegment === 'article' && (
          <ArticleSegment
            control={control}
            image={image}
            setImage={setImage}
            imageInfo={imageInfo}
            setImageInfo={setImageInfo}
            setImageFile={setImageFile}
            watchTitle={watchTitle}
            watchPreviewText={watchPreviewText}
            watchContent={watchContent}
            watchSchedulePublication={watchSchedulePublication}
            setValue={setValue}
            context={context}
            extractedContentGroupRef={extractedContentGroupRef}
            onCreateCategory={onCreateCategory}
            onCreateTag={onCreateTag}
            onCategoriesChange={handleCategoriesChange}
            onTagsChange={handleTagsChange}
          />
        )}

        {currentSegment === 'question' && (
          <QuestionSegment
            control={control}
            extractedContentGroupRef={extractedContentGroupRef}
            onCreateCategory={onCreateCategory}
            onCreateTag={onCreateTag}
            onCategoriesChange={handleCategoriesChange}
            onTagsChange={handleTagsChange}
          />
        )}

        {currentSegment === 'document' && (
          <DocumentSegment
            control={control}
            watchDisplayAuthor={watch('displayAuthor')}
            authorName={authorName}
            image={image}
            setImage={setImage}
            imageInfo={imageInfo}
            setImageInfo={setImageInfo}
            setImageFile={setImageFile}
            extractedContentGroupRef={extractedContentGroupRef}
            onCreateCategory={onCreateCategory}
            onCreateTag={onCreateTag}
            onCategoriesChange={handleCategoriesChange}
            onTagsChange={handleTagsChange}
          />
        )}

        {currentSegment === 'glossary' && (
          <GlossarySegment
            control={control}
            extractedContentGroupRef={extractedContentGroupRef}
            onCreateCategory={onCreateCategory}
            onCreateTag={onCreateTag}
            onCategoriesChange={handleCategoriesChange}
            onTagsChange={handleTagsChange}
          />
        )}
      </div>
    </AppActionForm>
  )
}

// Outer component - wraps with CatalogSelect.Provider only
const ContentEntryWindow: React.FC<ContentEntryWindowProps> = context => {
  return (
    <CatalogSelect.Provider<ContentEntryFormValues> {...context}>
      <ContentEntryWindowContent {...context} />
    </CatalogSelect.Provider>
  )
}

export default ContentEntryWindow
