import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslation } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { useFileClient } from '@/common/network/files/useFileClient'
import { ContentGroup } from '@/common/data/content/constants/contentConstants'
import { buildContentEntryPayload } from '@/common/data/content/payloads/contentEntryPayloads'
import { mapContentEntryToFormData } from '@/common/data/content/mappers/contentEntryMappers'
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
  preview: string
  content: string
  picture: string | null
  pictureThumbnail: string | null
  contentGroup: string
  contentTypeId?: string
  role?: string
  displayCreator: boolean
  author: string | null
  allowComment: boolean
  allowReaction: boolean
  activeFrom: Date | null | string
  activeTo: Date | null | string
  schedulePublication: boolean
  contentCategoryIds: string[] | undefined
  contentCategoryNames: string[] | undefined
  contentTagIds: string[] | undefined
  contentTagNames: string[] | undefined
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
          preview: z.string().optional(),
          content: z.string().min(1, t('content-required')),
          picture: z.string().nullable().optional(),
          contentGroup: z.string().min(1, t('group-required')),
          contentTypeId: z.string().optional(),
          role: z.string().optional(),
          displayCreator: z.boolean(),
          author: z.string().nullable(),
          allowComment: z.boolean(),
          allowReaction: z.boolean(),
          activeFrom: z.union([z.date(), z.string()]).nullable(),
          activeTo: z.union([z.date(), z.string()]).nullable().optional(),
          schedulePublication: z.boolean(),
          contentCategoryIds: z.array(z.string()).optional(),
          contentCategoryNames: z.array(z.string()).optional(),
          contentTagIds: z.array(z.string()).optional(),
          contentTagNames: z.array(z.string()).optional()
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
            if (!data.activeFrom) {
              ctx.addIssue({ code: 'custom', path: ['activeFrom'], message: t('start-date-required') })
            }
            if (!data.activeTo) {
              ctx.addIssue({ code: 'custom', path: ['activeTo'], message: t('end-date-required') })
            }
          }
        }),
    [t]
  )

  const defaultValues = useMemo(() => {
    if (loadedContentEntry) {
      return { ...mapContentEntryToFormData(loadedContentEntry), author: authorName }
    }

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
      preview: initialPreview,
      content: initialContent,
      contentGroup: initialContentGroup,
      contentTypeId: initialContentTypeId,
      role: initialRole,
      contentCategoryIds: [],
      contentCategoryNames: [],
      contentTagIds: [],
      contentTagNames: [],
      picture: null,
      pictureThumbnail: null,
      displayCreator: true,
      allowComment: true,
      allowReaction: true,
      author: authorName,
      schedulePublication: false,
      activeFrom: isPolicy ? new Date().toISOString().replace('Z', '+00:00') : null,
      activeTo: null
    }
  }, [loadedContentEntry, extractedContentGroup, authorName, context.additionalData])

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
      form.reset({ ...mapContentEntryToFormData(loadedContentEntry), author: authorName })
    }
  }, [loadedContentEntry?.id, authorName, form, loadedContentEntry])

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
    if (initialPreview !== null && initialPreview !== form.getValues('preview')) {
      form.setValue('preview', initialPreview, { shouldDirty: false, shouldValidate: false })
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
  const watchPreview = useWatch({ control, name: 'preview' })
  const watchSchedulePublication = useWatch({ control, name: 'schedulePublication' })
  const watchContentTypeId = useWatch({ control, name: 'contentTypeId' })
  const watchContentCategoryIds = useWatch({ control, name: 'contentCategoryIds' })
  const watchContentCategoryNames = useWatch({ control, name: 'contentCategoryNames' })
  const watchContentTagIds = useWatch({ control, name: 'contentTagIds' })
  const watchContentTagNames = useWatch({ control, name: 'contentTagNames' })
  const watchDisplayCreator = useWatch({ control, name: 'displayCreator' })

  const handleContentTypeIdChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) setValue('contentTypeId', value)
    },
    [setValue]
  )

  const handleContentCategoryIdsChange = useCallback(
    (ids: string[]) => {
      setValue('contentCategoryIds', ids)
      setValue('contentCategoryNames', [])
    },
    [setValue]
  )

  const handleContentTagIdsChange = useCallback(
    (ids: string[]) => {
      setValue('contentTagIds', ids)
      setValue('contentTagNames', [])
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
      (form.getValues('activeFrom') == null || form.getValues('activeFrom') === '')
    ) {
      form.setValue('activeFrom', new Date().toISOString().replace('Z', '+00:00'))
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
        updatedData.picture = JSON.stringify(uploadResponse.fileInfo)
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
        updatedData.picture = JSON.stringify(uploadResponse.fileInfo)
      }
    },
    [fileClient, extractedContentId, generateThumbnail]
  )

  const handlePreSubmit = useCallback(
    async (data: ContentEntryFormValues): Promise<ContentEntryFormValues> => {
      const updatedData = { ...data }

      if (imageFile && data.picture) {
        try {
          await uploadImageFile(imageFile, updatedData)
        } catch (error) {
          console.error('Error uploading image:', error)
          throw new Error('Failed to upload image')
        }
      } else if (data.picture && typeof data.picture === 'string' && data.picture.startsWith('data:image/')) {
        try {
          await uploadBase64Image(data.picture, updatedData)
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

    return buildContentEntryPayload(data, {
      employeeId,
      isUpdate,
      existingEntry: loadedContentEntry ?? undefined
    })
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
            watchPreview={watchPreview}
            watchSchedulePublication={watchSchedulePublication}
            watchContentTypeId={watchContentTypeId}
            watchContentCategoryIds={watchContentCategoryIds}
            watchContentCategoryNames={watchContentCategoryNames}
            watchContentTagIds={watchContentTagIds}
            watchContentTagNames={watchContentTagNames}
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
            setValue={setValue}
            accessToken={context.accessToken}
            extractedContentGroup={extractedContentGroup}
          />
        )}

        {currentSegment === 'document' && (
          <DocumentSegment
            control={control}
            setValue={setValue}
            accessToken={context.accessToken}
            watchDisplayCreator={watchDisplayCreator}
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
            setValue={setValue}
            accessToken={context.accessToken}
            extractedContentGroup={extractedContentGroup}
          />
        )}

        {currentSegment === 'policy' && (
          <PolicySegment
            control={control}
            watchTitle={watchTitle}
            watchPreview={watchPreview}
            watchContentTypeId={watchContentTypeId}
            watchContentCategoryIds={watchContentCategoryIds}
            watchContentCategoryNames={watchContentCategoryNames}
            watchContentTagIds={watchContentTagIds}
            watchContentTagNames={watchContentTagNames}
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
