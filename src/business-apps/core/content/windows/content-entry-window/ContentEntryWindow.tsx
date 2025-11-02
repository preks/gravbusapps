import React, { useMemo, useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Button,
  Card,
  CardContent,
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { CatalogSelect } from '@/components/catalog-select'
import { ContentRole, ContentGroup } from '@/common/data/content/types/contentEnums'
import { buildContentEntryPayload } from '@/common/data/content/payloads'
import { ArticleSegment, QuestionSegment, DocumentSegment } from './segments'
import translations from './i18n'

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
}

const ContentEntryWindowContent: React.FC<ContentEntryWindowProps> = context => {
  const { t } = useTranslation(translations)
  const catalogContext = CatalogSelect.useContext()
  const { validateField } = CatalogSelect.useValidation()

  const [image, setImage] = useState<string | null>(null)
  const [imageInfo, setImageInfo] = useState<{ name: string; size: string } | null>(null)

  // Extract contentGroupRef from props or additionalData
  const extractedContentGroupRef = context.contentGroupRef || context.additionalData?.contentGroupRef

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
          schedulePublication: z.boolean()
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
      contentImage: null,
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
    [context.contentId, extractedContentGroupRef, context.userInfo, authorName]
  )

  const form = useForm<ContentEntryFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched'
  })

  const { control, watch } = form
  const watchContentGroupRef = watch('contentGroupRef')
  const watchTitle = watch('title')
  const watchPreviewText = watch('previewText')
  const watchContent = watch('content')
  const watchDisplayAuthor = watch('displayAuthor')
  const watchSchedulePublication = watch('schedulePublication')

  // Determine which segment to render based on ContentGroup
  const currentSegment = useMemo(() => {
    if (!watchContentGroupRef) return 'article'

    if (watchContentGroupRef === ContentGroup.QUESTION) {
      return 'question'
    } else if (watchContentGroupRef === ContentGroup.DOCUMENT) {
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

  const handleSubmit = async (data: ContentEntryFormValues) => {
    console.log('Content Form Submit:', data)

    const isUpdate = Boolean(context.contentId)
    const employeeId = context.userInfo?.employeeDetails?.employeeId

    if (!employeeId) {
      console.error('Missing employee ID. Context:', context.userInfo)
      throw new Error('Employee ID is required')
    }

    // Use centralized payload builder
    const payload = buildContentEntryPayload({
      // Identity (for updates)
      ...(isUpdate && {
        id: context.contentId,
        version: data.version || 0
      }),

      // Core fields
      title: data.title,
      preview: data.previewText,
      content: data.content,
      picture: image || data.contentImage,

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
      activeTo: data.endDate || null
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
      processType={context.contentId ? 'update' : 'create'}
      onSubmit={handleSubmit}
      formData={defaultValues}
      form={form}
      submitButtonText={context.contentId ? t('update-content') : t('create-content')}
      showCancelButton={true}
      businessAppContext={context}
      data-testid="content-entry-window"
      customFormLayout={true}
      customActions={
        <div className="gba:flex gba:items-center gba:justify-end gba:gap-3 gba:pt-6 gba:border-t gba:border-border">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            {t('cancel') || 'Cancel'}
          </Button>
          <Button type="submit">{context.contentId ? t('update-content') : t('create-content')}</Button>
        </div>
      }
    >
      <div className="gba:flex gba:flex-col gba:h-full gba:gap-4">
        <div
          className={
            currentSegment === 'article'
              ? 'gba:grid gba:grid-cols-2 gba:gap-6 gba:flex-1 gba:overflow-hidden'
              : 'gba:flex gba:flex-col gba:flex-1 gba:overflow-hidden'
          }
        >
          {/* LEFT SIDE: Form Fields */}
          <div
            className={
              currentSegment === 'article'
                ? 'gba:space-y-6 gba:overflow-y-auto gba:pr-4'
                : 'gba:space-y-6 gba:overflow-y-auto gba:max-w-4xl gba:mx-auto gba:w-full gba:px-4'
            }
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            {/* Content Group Selection - Hidden if provided via props or additionalData */}
            {!extractedContentGroupRef && (
              <FormField
                control={control as any}
                name="contentGroupRef"
                rules={{ required: t('group-required') }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('content-group')}</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier="ContentGroup:v1"
                        value={field.value || null}
                        onValueChange={field.onChange}
                        data-testid="content-entry-window-group-select"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Content Type Selection - unidirectional dependency on ContentGroup */}
            <FormField
              control={control as any}
              name="contentTypeRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('content-type')}</FormLabel>
                  <FormControl>
                    <CatalogSelect
                      catalogIdentifier="ContentType:v1"
                      parentField="contentGroupRef"
                      requireSourceForEnable={true}
                      value={field.value || null}
                      onValueChange={field.onChange}
                      data-testid="content-entry-window-type-select"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dynamic Segment Based on Content Group */}
            {currentSegment === 'article' && (
              <ArticleSegment
                control={control}
                image={image}
                setImage={setImage}
                imageInfo={imageInfo}
                setImageInfo={setImageInfo}
                authorName={authorName}
                watchDisplayAuthor={watchDisplayAuthor}
                watchSchedulePublication={watchSchedulePublication}
              />
            )}

            {currentSegment === 'question' && (
              <QuestionSegment control={control} watchDisplayAuthor={watchDisplayAuthor} authorName={authorName} />
            )}

            {currentSegment === 'document' && (
              <DocumentSegment
                control={control}
                watchDisplayAuthor={watchDisplayAuthor}
                authorName={authorName}
                image={image}
                setImage={setImage}
                imageInfo={imageInfo}
                setImageInfo={setImageInfo}
              />
            )}
          </div>

          {/* RIGHT SIDE: Live Preview - Only for Article Segment */}
          {currentSegment === 'article' && (
            <div
              className="gba:border-l gba:border-border gba:pl-6 gba:overflow-y-auto"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              <div className="gba:sticky gba:top-0 gba:bg-background gba:pb-4 gba:mb-4 gba:border-b gba:border-border">
                <h3 className="gba:text-lg gba:font-semibold gba:flex gba:items-center gba:gap-2">
                  Live Preview
                  <Badge variant="secondary" className="gba:text-xs">
                    Real-time
                  </Badge>
                </h3>
              </div>

              <Card>
                <CardContent className="gba:p-6 gba:space-y-4">
                  {/* Content Group Badge */}
                  {watchContentGroupRef && (
                    <div className="gba:flex gba:gap-2">
                      <Badge variant="outline">{watchContentGroupRef}</Badge>
                    </div>
                  )}

                  {/* Image Preview */}
                  {image && (
                    <div className="gba:rounded-lg gba:overflow-hidden">
                      <img
                        src={image}
                        alt="Content preview"
                        className="gba:w-full gba:h-auto gba:max-h-[300px] gba:object-cover"
                      />
                    </div>
                  )}

                  {/* Title Preview */}
                  {watchTitle ? (
                    <h1 className="gba:text-2xl gba:font-bold gba:text-foreground">{watchTitle}</h1>
                  ) : (
                    <div className="gba:text-muted-foreground gba:italic">Enter a title...</div>
                  )}

                  {/* Preview Text */}
                  {watchPreviewText ? (
                    <p className="gba:text-muted-foreground">{watchPreviewText}</p>
                  ) : (
                    <div className="gba:text-muted-foreground gba:italic gba:text-sm">Enter preview text...</div>
                  )}

                  {/* Author */}
                  {watchDisplayAuthor && authorName && (
                    <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                      <span>By</span>
                      <span className="gba:font-medium">{authorName}</span>
                    </div>
                  )}

                  {/* Content Preview */}
                  {watchContent ? (
                    <div
                      className="gba:prose gba:prose-sm gba:max-w-none gba:text-foreground"
                      dangerouslySetInnerHTML={{ __html: watchContent }}
                    />
                  ) : (
                    <div className="gba:text-muted-foreground gba:italic gba:text-sm">
                      Start typing to see content preview...
                    </div>
                  )}

                  {/* Interaction Buttons Preview */}
                  <div className="gba:flex gba:gap-4 gba:pt-4 gba:border-t gba:border-border">
                    {form.watch('allowReaction') && (
                      <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                        <span>👍</span>
                        <span>Reactions</span>
                      </div>
                    )}
                    {form.watch('allowComment') && (
                      <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                        <span>💬</span>
                        <span>Comments</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
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
