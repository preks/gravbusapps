import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslation } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { CatalogSelect } from '@/components/catalog-select'
import { useCreateCatalogEntry } from '@/common/data/catalog/hooks/useCreateCatalogEntry'
import { useFileClient } from '@/common/network/files/useFileClient'
import { ContentRole } from '@/common/data/content/types/contentEnums'
import { buildContentEntryPayload } from '@/common/data/content/payloads/contentEntryPayloads'
import { ArticleSegment, QuestionSegment, DocumentSegment } from './segments'
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
  const { createCatalogEntry } = useCreateCatalogEntry(context)
  const fileClient = useFileClient(context)
  // Extract props to mark as used
  const { contentId, contentGroupRef } = context

  const [image, setImage] = useState<string | null>(null)
  const [imageInfo, setImageInfo] = useState<{ name: string; size: string } | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)

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

  // Helper functions to create catalog entries on demand
  const onCreateCategory = useCallback(
    async (label: string): Promise<string> => {
      try {
        const response = await createCatalogEntry('ContentCategory', 'v1', {
          code: label.toUpperCase().replaceAll(/\s+/g, '_'),
          value: label,
          translations: []
        })
        return response.id
      } catch (error) {
        console.error('Error creating category:', error)
        throw new Error(`Failed to create category: ${label}`)
      }
    },
    [createCatalogEntry]
  )

  const onCreateTag = useCallback(
    async (label: string): Promise<string> => {
      try {
        const response = await createCatalogEntry('ContentTag', 'v1', {
          code: label.toUpperCase().replaceAll(/\s+/g, '_'),
          value: label,
          translations: []
        })
        return response.id
      } catch (error) {
        console.error('Error creating tag:', error)
        throw new Error(`Failed to create tag: ${label}`)
      }
    },
    [createCatalogEntry]
  )

  // Extract contentGroupRef from props or additionalData
  const extractedContentGroupRef =
    contentGroupRef ||
    context.additionalData?.contentGroupRef ||
    context.additionalData?.contentGroup ||
    context.additionalData?.psi_taskPayload?.psi_initialParameters?.contentGroupRef ||
    context.additionalData?.psi_taskPayload?.psi_initialParameters?.contentGroup

  // Use contentId prop
  const extractedContentId = contentId

  // Author info from context
  const authorName = useMemo(() => {
    const employee = context.userInfo?.employeeDetails
    if (employee?.firstName && employee?.lastName) {
      return `${employee.firstName} ${employee.lastName}`
    }
    return null
  }, [context.userInfo])

  // Zod Schema with conditional validation for contentTypeRef
  const schema = useMemo(
    () =>
      z
        .object({
          id: z.string().optional(),
          version: z.number().optional(),
          title: z.string().min(1, t('title-required')),
          previewText: z.string().min(1, t('preview-required')),
          content: z.string().min(1, t('content-required')),
          contentImage: z.string().nullable(),
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

  const defaultValues = useMemo(
    () => ({
      id: context.contentId || '',
      title: '',
      previewText: '',
      content: '',
      contentGroupRef: extractedContentGroupRef || '',
      articleTypeRef: '',
      tags: [],
      categories: [],
      contentImage: null,
      pictureThumbnail: null,
      displayAuthor: true,
      allowComment: true,
      allowReaction: true,
      author: authorName,
      authorId: context.userInfo?.employeeDetails?.employeeId || '',
      schedulePublication: false,
      startDate: null,
      endDate: null,
      status: 'draft'
    }),
    [extractedContentId, extractedContentGroupRef, context.userInfo, authorName]
  )

  const form = useForm<ContentEntryFormValues, any, ContentEntryFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

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
    [uploadImageFile, uploadBase64Image, imageFile]
  )

  const handleSubmit = async (data: ContentEntryFormValues) => {
    const isUpdate = Boolean(extractedContentId)
    const employeeId = context.userInfo?.employeeDetails?.employeeId

    if (!employeeId) {
      console.error('Missing employee ID. Context:', context.userInfo)
      throw new Error('Employee ID is required')
    }

    // Use centralized payload builder
    const payload = buildContentEntryPayload({
      // Identity (for updates)
      ...(isUpdate && {
        id: extractedContentId,
        version: data.version || 0
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

  const isLoading = false

  if (isLoading) {
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
            context={{ ...context, onCreateCategory, onCreateTag }}
            extractedContentGroupRef={extractedContentGroupRef}
          />
        )}

        {currentSegment === 'question' && <QuestionSegment control={control} />}

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
