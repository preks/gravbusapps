import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from 'react-i18next'
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
  Button,
  Card,
  CardContent,
  Badge,
  LocalizationProvider,
  SupportedLocale
} from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { CatalogSelect } from '@/components/catalog-select'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { ContentRole } from '@/common/data/content/types/contentEnums'
import { buildContentEntryPayload } from '@/common/data/content/payloads'
import ReactQuill from 'react-quill'
import { Image } from '@phosphor-icons/react'

export interface ContentEntryWindowProps extends BusinessAppContextProps {
  contentId?: string
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

const MAX_IMAGE_SIZE_MB = 5

const ContentEntryWindowContent: React.FC<ContentEntryWindowProps> = context => {
  const { t } = useTranslation('content')
  const catalogContext = CatalogSelect.useContext()
  const { validateField } = CatalogSelect.useValidation()

  const [image, setImage] = useState<string | null>(null)
  const [imageInfo, setImageInfo] = useState<{ name: string; size: string } | null>(null)

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
          title: z.string().min(1, t('validations.title_required')),
          previewText: z.string().min(1, t('validations.preview_required')),
          content: z.string().min(1, t('validations.content_required')),
          contentImage: z.string().nullable(),
          contentGroupRef: z.string().min(1, t('validations.group_required')),
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
                message: t('validations.type_required')
              })
            }
          }

          // Conditional validation: startDate and endDate required when schedulePublication is true
          if (data.schedulePublication) {
            if (!data.startDate) {
              ctx.addIssue({
                code: 'custom',
                path: ['startDate'],
                message: t('validations.start_date_required')
              })
            }
            if (!data.endDate) {
              ctx.addIssue({
                code: 'custom',
                path: ['endDate'],
                message: t('validations.end_date_required')
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
      contentGroupRef: '',
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
    [context.contentId, context.userInfo, authorName]
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

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Validate image size
      const fileSizeMB = file.size / (1024 * 1024)
      if (fileSizeMB > MAX_IMAGE_SIZE_MB) {
        alert(`Image size must be less than ${MAX_IMAGE_SIZE_MB}MB`)
        return
      }

      // Validate image type
      if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
        setImageInfo({
          name: file.name,
          size: `${fileSizeMB.toFixed(2)}MB`
        })
        form.setValue('contentImage', reader.result as any)
      }
      reader.readAsDataURL(file)
    },
    [form]
  )

  const handleImageRemove = useCallback(() => {
    setImage(null)
    setImageInfo(null)
    form.setValue('contentImage', null)
  }, [form])

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

  // Quill modules configuration
  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
        ['link', 'image', 'video']
      ]
    }),
    []
  )

  const quillFormats = useMemo(
    () => ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'indent', 'link', 'image', 'video'],
    []
  )

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
      submitButtonText={context.contentId ? t('update_content') : t('create_content')}
      showCancelButton={true}
      businessAppContext={context}
      data-testid="content-entry-window"
      customFormLayout={true}
      customActions={
        <div className="gba:flex gba:items-center gba:justify-end gba:gap-3 gba:pt-6 gba:border-t gba:border-border">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            {t('cancel') || 'Cancel'}
          </Button>
          <Button type="submit">{context.contentId ? t('update_content') : t('create_content')}</Button>
        </div>
      }
    >
      <div className="gba:flex gba:flex-col gba:h-full gba:gap-4">
        <div className="gba:grid gba:grid-cols-2 gba:gap-6 gba:flex-1 gba:overflow-hidden">
          {/* LEFT SIDE: Form Fields */}
          <div className="gba:space-y-6 gba:overflow-y-auto gba:pr-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {/* Content Group Selection */}
            <FormField
              control={control as any}
              name="contentGroupRef"
              rules={{ required: t('validations.group_required') }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.content_group')}</FormLabel>
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

            {/* Content Type Selection - unidirectional dependency on ContentGroup */}
            <FormField
              control={control as any}
              name="contentTypeRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.content_type')}</FormLabel>
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

            {/* Title */}
            <FormField
              control={control as any}
              name="title"
              rules={{ required: t('validations.title_required') }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.title')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('fields.title_placeholder')}
                      data-testid="content-entry-window-title-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image Upload */}
            <div className="gba:space-y-2">
              <FormLabel>{t('fields.content_image')}</FormLabel>
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:p-4 gba:border gba:border-border gba:rounded-lg gba:bg-muted/20">
                {image ? (
                  <div className="gba:relative gba:w-full">
                    <img
                      src={image}
                      alt="Preview"
                      className="gba:w-full gba:h-auto gba:rounded-lg gba:max-h-[200px] gba:object-cover"
                    />
                    {imageInfo && (
                      <div className="gba:mt-2 gba:text-sm gba:text-muted-foreground gba:text-center">
                        {imageInfo.name} ({imageInfo.size})
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleImageRemove}
                      className="gba:mt-2 gba:w-full"
                    >
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                    <label className="gba:cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="gba:hidden"
                        data-testid="content-entry-window-image-input"
                      />
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>
                          <Image className="gba:mr-2" size={20} />
                          Upload Image
                        </span>
                      </Button>
                    </label>
                    <div className="gba:text-xs gba:text-muted-foreground">Max {MAX_IMAGE_SIZE_MB}MB</div>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Text */}
            <FormField
              control={control as any}
              name="previewText"
              rules={{ required: t('validations.preview_required') }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.preview_text')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('fields.preview_text_placeholder')}
                      rows={3}
                      data-testid="content-entry-window-preview-textarea"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rich Text Content Editor */}
            <FormField
              control={control as any}
              name="content"
              rules={{ required: t('validations.content_required') }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.content')}</FormLabel>
                  <FormControl>
                    <ReactQuill
                      theme="snow"
                      value={field.value || ''}
                      onChange={field.onChange}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder={t('fields.content_placeholder')}
                      className="gba:min-h-[200px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Settings */}
            <div className="gba:space-y-4">
              <div className="gba:grid gba:grid-cols-3 gba:gap-4">
                <FormField
                  control={control as any}
                  name="displayAuthor"
                  render={({ field }) => (
                    <FormItem className="gba:flex gba:items-center gba:justify-between gba:space-y-0 gba:p-4 gba:border gba:border-border gba:rounded-lg">
                      <FormLabel>{t('fields.display_author')}</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control as any}
                  name="allowComment"
                  render={({ field }) => (
                    <FormItem className="gba:flex gba:items-center gba:justify-between gba:space-y-0 gba:p-4 gba:border gba:border-border gba:rounded-lg">
                      <FormLabel>{t('fields.allow_comments')}</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control as any}
                  name="allowReaction"
                  render={({ field }) => (
                    <FormItem className="gba:flex gba:items-center gba:justify-between gba:space-y-0 gba:p-4 gba:border gba:border-border gba:rounded-lg">
                      <FormLabel>{t('fields.allow_reactions')}</FormLabel>
                      <FormControl>
                        <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {watchDisplayAuthor && (
                <FormField
                  control={control as any}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.author')}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} disabled />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={control as any}
                name="schedulePublication"
                render={({ field }) => (
                  <FormItem className="gba:flex gba:items-center gba:justify-between gba:space-y-0 gba:p-4 gba:border gba:border-border gba:rounded-lg">
                    <FormLabel>{t('fields.schedule_publication')}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {watchSchedulePublication && (
                <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                  <FormField
                    control={control as any}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('fields.start_date')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="datetime-local"
                            value={field.value || ''}
                            data-testid="content-entry-window-start-date-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control as any}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('fields.end_date')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="datetime-local"
                            value={field.value || ''}
                            data-testid="content-entry-window-end-date-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: Live Preview */}
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
        </div>
      </div>
    </AppActionForm>
  )
}

// Outer component - wraps with LocalizationProvider and CatalogSelect.Provider
const ContentEntryWindow: React.FC<ContentEntryWindowProps> = context => {
  const locale = getCurrentActiveUserLocale() as SupportedLocale

  return (
    <LocalizationProvider locale={locale}>
      <CatalogSelect.Provider<ContentEntryFormValues> {...context}>
        <ContentEntryWindowContent {...context} />
      </CatalogSelect.Provider>
    </LocalizationProvider>
  )
}

export default ContentEntryWindow
