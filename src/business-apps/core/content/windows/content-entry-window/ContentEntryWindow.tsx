import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslation } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { useFileClient } from '@/common/network/files/useFileClient'
import { ContentRole, ContentGroup } from '@/common/data/content/constants/contentConstants'
import { buildContentEntryPayload } from '@/common/data/content/payloads/contentEntryPayloads'
import { useContentEntry } from '@/common/data/content/hooks/useContentEntry'
import { buildFileUrl } from '@/common/utils/fileUtils'
import ArticleSegment from './segments/ArticleSegment'
import QuestionSegment from './segments/QuestionSegment'
import DocumentSegment from './segments/DocumentSegment'
import GlossarySegment from './segments/GlossarySegment'
import PolicySegment from './segments/PolicySegment'
import translations from './_i18n'

export interface ContentEntryWindowProps extends BusinessAppContextProps {
  contentId?: string
  contentGroup?: string
}

export interface ContentEntryFormValues {
  id?: string
  version?: number
  title: string
  previewText: string
  content: string
  contentImage: string | null
  pictureThumbnail: string | null
  contentGroup: string
  contentTypeId?: string
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

/** Ensures value is full ISO Instant for backend (java.time.Instant). */
function toInstantStartOfDay(value: Date | string | null | undefined): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'string' && value.includes('T')) return value
  const dateOnly = typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null
  return `${dateOnly}T00:00:00.000Z`
}

function useStableArray<T>(next: T[] | undefined): T[] | undefined {
  const ref = useRef<T[] | undefined>(undefined)
  if (!arraysEqual(ref.current, next)) {
    ref.current = next
  }
  return ref.current
}

function arraysEqual<T>(a: T[] | undefined, b: T[] | undefined): boolean {
  if (a === b) return true
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

const ContentEntryWindowContent: React.FC<ContentEntryWindowProps> = context => {
  const { t } = useTranslation(translations)
  const fileClient = useFileClient(context)
  const { contentId } = context

  const contentEntryId =
    contentId ||
    context.additionalData?.contentEntryId ||
    context.additionalData?.psi_taskPayload?.psi_initialParameters?.contentEntryId

  const queryOptions = useMemo(() => ({ config: 'detail' as const }), [])

  const { entry: loadedContentEntry, isLoading: contentEntryLoading } = useContentEntry(contentEntryId || '', {
    accessToken: context.accessToken,
    queryOptions
  })

  const [image, setImage] = useState<string | null>(null)
  const [imageInfo, setImageInfo] = useState<{ name: string; size: string } | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const imageBlobUrlRef = useRef<string | null>(null)

  const generateThumbnail = useCallback(
    async (source: File | string, maxWidth = 300, maxHeight = 300, quality = 0.8): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
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
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', quality))
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        if (source instanceof File) {
          const reader = new FileReader()
          reader.onload = e => {
            if (e.target?.result) img.src = e.target.result as string
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

  const extractedContentGroup =
    context.contentGroup ||
    context.additionalData?.contentGroup ||
    context.additionalData?.psi_taskPayload?.psi_initialParameters?.contentGroup ||
    loadedContentEntry?.contentGroup ||
    null

  const extractedContentId = contentEntryId

  const authorName = useMemo(() => {
    const employee = context.userInfo?.employeeDetails
    if (employee?.firstName && employee?.lastName) {
      return `${employee.firstName} ${employee.lastName}`
    }
    return null
  }, [context.userInfo])

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
          contentGroup: z.string().min(1, t('group-required')),
          contentTypeId: z.string().optional(),
          role: z.string().optional(),
          displayAuthor: z.boolean(),
          author: z.string().nullable(),
          allowComment: z.boolean(),
          allowReaction: z.boolean(),
          startDate: z.union([z.date(), z.string()]).nullable(),
          endDate: z.union([z.date(), z.string()]).nullable().optional(),
          schedulePublication: z.boolean(),
          categories: z.array(z.string()).optional(),
          tags: z.array(z.string()).optional()
        })
        .superRefine((data, ctx) => {
          if (data.id && (data.version === undefined || data.version === null)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('version-required') || 'Version is required for updates',
              path: ['version']
            })
          }
          if (data.schedulePublication) {
            if (!data.startDate) {
              ctx.addIssue({ code: 'custom', path: ['startDate'], message: t('start-date-required') })
            }
            if (!data.endDate) {
              ctx.addIssue({ code: 'custom', path: ['endDate'], message: t('end-date-required') })
            }
          }
        }),
    [t]
  )

  const mappedFormValues = useMemo(() => {
    if (!loadedContentEntry) return null

    const categories =
      loadedContentEntry.contentEntryCategories?.map(cat => cat.contentCategoryId).filter(Boolean) || []
    const tags = loadedContentEntry.contentEntryTags?.map(tag => tag.contentTagId).filter(Boolean) || []

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
      contentGroup: loadedContentEntry.contentGroup || '',
      contentTypeId: loadedContentEntry.contentType?.id || '',
      contentImage,
      pictureThumbnail: loadedContentEntry.pictureThumbnail || null,
      displayAuthor: loadedContentEntry.displayCreator ?? true,
      allowComment: loadedContentEntry.allowComment ?? true,
      allowReaction: loadedContentEntry.allowReaction ?? true,
      author: authorName,
      schedulePublication: !!(loadedContentEntry.activeFrom || loadedContentEntry.activeTo),
      startDate: loadedContentEntry.activeFrom || null,
      endDate: loadedContentEntry.activeTo || null,
      categories: categories.length > 0 ? (categories as string[]) : [],
      tags: tags.length > 0 ? (tags as string[]) : []
    }
  }, [loadedContentEntry, authorName])

  const defaultValues = useMemo(() => {
    if (mappedFormValues) return mappedFormValues

    const additionalData = context.additionalData
    const initialTitle = additionalData?.title ?? additionalData?.contentEntry?.title ?? ''
    const initialPreview =
      additionalData?.preview ?? additionalData?.previewText ?? additionalData?.contentEntry?.preview ?? ''
    const initialContent = additionalData?.content ?? additionalData?.contentEntry?.content ?? ''
    const initialRole = additionalData?.role ?? additionalData?.contentEntry?.role ?? undefined
    const initialContentGroup =
      additionalData?.contentGroup ?? additionalData?.contentEntry?.contentGroup ?? extractedContentGroup ?? ''
    const initialContentTypeId = additionalData?.contentTypeId ?? additionalData?.contentEntry?.contentTypeId ?? ''

    const isPolicy = initialContentGroup === ContentGroup.POLICY

    return {
      id: '',
      version: 0,
      title: initialTitle,
      previewText: initialPreview,
      content: initialContent,
      contentGroup: initialContentGroup,
      contentTypeId: initialContentTypeId,
      role: initialRole,
      tags: [],
      categories: [],
      contentImage: null,
      pictureThumbnail: null,
      displayAuthor: true,
      allowComment: true,
      allowReaction: true,
      author: authorName,
      schedulePublication: false,
      startDate: isPolicy ? new Date().toISOString().replace('Z', '+00:00') : null,
      endDate: null
    }
  }, [mappedFormValues, extractedContentGroup, authorName, context.additionalData])

  const form = useForm<ContentEntryFormValues, any, ContentEntryFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const contentEntryIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (loadedContentEntry?.id && contentEntryIdRef.current !== loadedContentEntry.id) {
      contentEntryIdRef.current = loadedContentEntry.id

      const categories =
        loadedContentEntry.contentEntryCategories?.map(cat => cat.contentCategoryId).filter(Boolean) || []
      const tags = loadedContentEntry.contentEntryTags?.map(tag => tag.contentTagId).filter(Boolean) || []

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

      form.reset({
        id: loadedContentEntry.id || '',
        version: loadedContentEntry.version,
        title: loadedContentEntry.title || '',
        previewText: loadedContentEntry.preview || '',
        content: loadedContentEntry.content || '',
        contentGroup: loadedContentEntry.contentGroup || '',
        contentTypeId: loadedContentEntry.contentType?.id || '',
        contentImage,
        pictureThumbnail: loadedContentEntry.pictureThumbnail || null,
        displayAuthor: loadedContentEntry.displayCreator ?? true,
        allowComment: loadedContentEntry.allowComment ?? true,
        allowReaction: loadedContentEntry.allowReaction ?? true,
        author: authorName,
        schedulePublication: !!(loadedContentEntry.activeFrom || loadedContentEntry.activeTo),
        startDate: loadedContentEntry.activeFrom || null,
        endDate: loadedContentEntry.activeTo || null,
        categories: categories.length > 0 ? (categories as string[]) : [],
        tags: tags.length > 0 ? (tags as string[]) : []
      })
    }
  }, [loadedContentEntry?.id, authorName, form])

  useEffect(() => {
    if (loadedContentEntry?.id || !context.additionalData) return

    const additionalData = context.additionalData
    const initialTitle = additionalData.title ?? additionalData.contentEntry?.title ?? null
    const initialPreview =
      additionalData.preview ?? additionalData.previewText ?? additionalData.contentEntry?.preview ?? null
    const initialContent = additionalData.content ?? additionalData.contentEntry?.content ?? null
    const initialContentGroup =
      additionalData.contentGroup ?? additionalData.contentEntry?.contentGroup ?? extractedContentGroup ?? null
    const initialRole = additionalData.role ?? additionalData.contentEntry?.role ?? null
    const initialContentTypeId = additionalData.contentTypeId ?? additionalData.contentEntry?.contentTypeId ?? null

    if (
      !initialTitle &&
      !initialPreview &&
      !initialContent &&
      !initialContentGroup &&
      !initialContentTypeId &&
      !initialRole
    )
      return

    if (initialTitle !== null && initialTitle !== form.getValues('title')) {
      form.setValue('title', initialTitle, { shouldDirty: false, shouldValidate: false })
    }
    if (initialPreview !== null && initialPreview !== form.getValues('previewText')) {
      form.setValue('previewText', initialPreview, { shouldDirty: false, shouldValidate: false })
    }
    if (initialContent !== null && initialContent !== form.getValues('content')) {
      form.setValue('content', initialContent, { shouldDirty: false, shouldValidate: false })
    }
    if (initialContentGroup !== null && initialContentGroup !== form.getValues('contentGroup')) {
      form.setValue('contentGroup', initialContentGroup, { shouldDirty: false, shouldValidate: false })
    }
    if (initialContentTypeId !== null && initialContentTypeId !== form.getValues('contentTypeId')) {
      form.setValue('contentTypeId', initialContentTypeId, { shouldDirty: false, shouldValidate: false })
    }
    if (initialRole !== null && initialRole !== form.getValues('role')) {
      form.setValue('role', initialRole, { shouldDirty: false, shouldValidate: false })
    }
  }, [loadedContentEntry?.id, context.additionalData, extractedContentGroup, form])

  useEffect(() => {
    if (!imageBlobUrlRef.current?.startsWith('blob:') === false) {
      URL.revokeObjectURL(imageBlobUrlRef.current!)
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
      if (typeof loadedContentEntry.picture === 'string' && loadedContentEntry.picture.startsWith('data:')) {
        setImage(loadedContentEntry.picture)
        setImageInfo(null)
        return
      }
      setImage(loadedContentEntry.picture)
      setImageInfo(null)
      return
    }

    if (!fileInfo?.path) {
      setImage(null)
      setImageInfo(null)
      return
    }

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
    return () => {
      isCancelled = true
      if (imageBlobUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(imageBlobUrlRef.current)
        imageBlobUrlRef.current = null
      }
    }
  }, [loadedContentEntry?.picture, context.accessToken])

  const { control, setValue } = form
  const watchContentGroup = useWatch({ control, name: 'contentGroup' })
  const watchTitle = useWatch({ control, name: 'title' })
  const watchPreviewText = useWatch({ control, name: 'previewText' })
  const watchSchedulePublication = useWatch({ control, name: 'schedulePublication' })
  const watchContentTypeId = useWatch({ control, name: 'contentTypeId' })
  const watchCategories = useWatch({ control, name: 'categories' })
  const watchTags = useWatch({ control, name: 'tags' })
  const watchDisplayAuthor = useWatch({ control, name: 'displayAuthor' })

  const stableWatchCategories = useStableArray(watchCategories)
  const stableWatchTags = useStableArray(watchTags)

  const handleContentTypeIdChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) setValue('contentTypeId', value)
    },
    [setValue]
  )

  const handleContentCategoryIdsChange = useCallback(
    (ids: string[]) => {
      setValue('categories', ids)
    },
    [setValue]
  )

  const handleContentTagIdsChange = useCallback(
    (ids: string[]) => {
      setValue('tags', ids)
    },
    [setValue]
  )

  const currentSegment = useMemo(() => {
    if (!watchContentGroup) return 'article'
    if (watchContentGroup === ContentGroup.QUESTION) return 'question'
    if (watchContentGroup === ContentGroup.DOCUMENT) return 'document'
    if (watchContentGroup === ContentGroup.GLOSSARY) return 'glossary'
    if (watchContentGroup === ContentGroup.POLICY) return 'policy'
    return 'article'
  }, [watchContentGroup])

  useEffect(() => {
    if (authorName) form.setValue('author', authorName)
  }, [authorName, form])

  useEffect(() => {
    if (extractedContentGroup && !extractedContentId) {
      const currentValue = form.getValues('contentGroup')
      if (!currentValue || currentValue !== extractedContentGroup) {
        form.setValue('contentGroup', extractedContentGroup)
      }
    }
  }, [extractedContentGroup, extractedContentId, form])

  useEffect(() => {
    if (
      currentSegment === 'policy' &&
      !contentEntryId &&
      (form.getValues('startDate') == null || form.getValues('startDate') === '')
    ) {
      form.setValue('startDate', new Date().toISOString().replace('Z', '+00:00'))
    }
  }, [currentSegment, contentEntryId, form])

  const uploadImageFile = useCallback(
    async (file: File, updatedData: ContentEntryFormValues): Promise<void> => {
      const entryId = extractedContentId || 'temp'
      const thumbnail = await generateThumbnail(file)
      updatedData.pictureThumbnail = thumbnail
      const uploadResponse = await fileClient.uploadFile(
        file,
        { accessScope: 'tenant' },
        { appName: 'content', folderPath: `/content/${entryId}/images`, mimeType: file.type }
      )
      if (uploadResponse?.fileInfo) {
        updatedData.contentImage = JSON.stringify(uploadResponse.fileInfo)
      }
    },
    [fileClient, extractedContentId, generateThumbnail]
  )

  const uploadBase64Image = useCallback(
    async (base64Data: string, updatedData: ContentEntryFormValues): Promise<void> => {
      const regex = /^data:image\/(\w+);base64,(.+)$/
      const execResult = regex.exec(base64Data)
      if (!execResult) throw new Error('Invalid base64 image format')

      const mimeType = execResult[1]
      const base64String = execResult[2]
      const byteCharacters = atob(base64String)
      const byteArray = new Uint8Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.codePointAt(i) ?? 0
      }
      const blob = new Blob([byteArray], { type: `image/${mimeType}` })
      const file = new File([blob], `image.${mimeType}`, { type: `image/${mimeType}` })

      const thumbnail = await generateThumbnail(base64Data)
      updatedData.pictureThumbnail = thumbnail

      const entryId = extractedContentId || 'temp'
      const uploadResponse = await fileClient.uploadFile(
        file,
        { accessScope: 'tenant' },
        { appName: 'content', folderPath: `/content/${entryId}/images`, mimeType: file.type }
      )
      if (uploadResponse?.fileInfo) {
        updatedData.contentImage = JSON.stringify(uploadResponse.fileInfo)
      }
    },
    [fileClient, extractedContentId, generateThumbnail]
  )

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

    if (!employeeId) throw new Error('Employee ID is required')

    if (isUpdate) {
      if (!extractedContentId) throw new Error('Content entry ID is required for updates')
      if (data.version === undefined || data.version === null) {
        throw new Error('Version is required for updates. Please reload the content entry.')
      }
    }

    const payload = buildContentEntryPayload({
      ...(isUpdate && { id: extractedContentId, version: data.version }),
      title: data.title,
      preview: data.previewText,
      content: data.content,
      picture: data.contentImage,
      pictureThumbnail: data.pictureThumbnail,
      role: ContentRole.ROOT,
      contentGroup: data.contentGroup,
      contentTypeId: data.contentTypeId,
      ...(isUpdate ? { updaterEmployeeId: employeeId } : { creatorEmployeeId: employeeId }),
      displayCreator: data.displayAuthor,
      displayUpdater: false,
      allowComment: data.contentGroup === ContentGroup.POLICY ? false : data.allowComment,
      allowReaction: data.contentGroup === ContentGroup.POLICY ? false : data.allowReaction,
      activeFrom: toInstantStartOfDay(data.startDate) ?? null,
      activeTo: toInstantStartOfDay(data.endDate) ?? null,
      ...(data.categories &&
        data.categories.length > 0 && {
          categories: {
            changeMode: 'UPSERT' as const,
            items: data.categories.map(id => ({ contentCategoryId: id }))
          }
        }),
      ...(data.tags &&
        data.tags.length > 0 && {
          tags: {
            changeMode: 'UPSERT' as const,
            items: data.tags.map(id => ({ contentTagId: id }))
          }
        })
    })

    return payload
  }

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
            watchSchedulePublication={watchSchedulePublication}
            watchContentTypeId={watchContentTypeId}
            watchCategories={stableWatchCategories}
            watchTags={stableWatchTags}
            setValue={setValue}
            context={context}
            extractedContentGroup={extractedContentGroup}
            onContentTypeIdChange={handleContentTypeIdChange}
            onContentCategoryIdsChange={handleContentCategoryIdsChange}
            onContentTagIdsChange={handleContentTagIdsChange}
          />
        )}

        {currentSegment === 'question' && (
          <QuestionSegment
            control={control}
            accessToken={context.accessToken}
            extractedContentGroup={extractedContentGroup}
          />
        )}

        {currentSegment === 'document' && (
          <DocumentSegment
            control={control}
            accessToken={context.accessToken}
            watchDisplayAuthor={watchDisplayAuthor}
            authorName={authorName}
            image={image}
            setImage={setImage}
            imageInfo={imageInfo}
            setImageInfo={setImageInfo}
            setImageFile={setImageFile}
            extractedContentGroup={extractedContentGroup}
          />
        )}

        {currentSegment === 'glossary' && (
          <GlossarySegment
            control={control}
            accessToken={context.accessToken}
            extractedContentGroup={extractedContentGroup}
          />
        )}

        {currentSegment === 'policy' && (
          <PolicySegment
            control={control}
            watchTitle={watchTitle}
            watchPreviewText={watchPreviewText}
            watchContentTypeId={watchContentTypeId}
            watchCategories={stableWatchCategories}
            watchTags={stableWatchTags}
            setValue={setValue}
            context={context}
            extractedContentGroup={extractedContentGroup}
            onContentTypeIdChange={handleContentTypeIdChange}
            onContentCategoryIdsChange={handleContentCategoryIdsChange}
            onContentTagIdsChange={handleContentTagIdsChange}
          />
        )}
      </div>
    </AppActionForm>
  )
}

const ContentEntryWindow: React.FC<ContentEntryWindowProps> = context => {
  return <ContentEntryWindowContent {...context} />
}

export default ContentEntryWindow
