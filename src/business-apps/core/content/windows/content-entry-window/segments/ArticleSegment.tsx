import React, { useMemo, useCallback, useState } from 'react'
import { Control } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Button,
  Switch,
  useTranslation
} from '@newwork/nw-design-system'
import { ImageIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import ReactQuill from 'react-quill'
import { CatalogSelect } from '@/components/catalog-select'
import { CatalogMultiSelect, CatalogMultiSelectOption } from '@/components/catalog-multi-select'
import { ContentEntryFormValues } from '../ContentEntryWindow'
import { ContentAiTextGenerator } from '../components/ContentAiTextGenerator'
import translations from '../_i18n'

interface ArticleSegmentProps {
  control: Control<ContentEntryFormValues>
  image: string | null
  setImage: (image: string | null) => void
  imageInfo: { name: string; size: string } | null
  setImageInfo: (info: { name: string; size: string } | null) => void
  setImageFile: (file: File | null) => void
  watchTitle: string
  watchPreviewText: string
  watchContent: string
  watchSchedulePublication: boolean
  setValue: (name: keyof ContentEntryFormValues, value: any) => void
  context: any
  extractedContentGroupRef?: string
  setNewCategories: (items: CatalogMultiSelectOption[]) => void
  setNewTags: (items: CatalogMultiSelectOption[]) => void
  categoriesRef: React.RefObject<any>
  tagsRef: React.RefObject<any>
}

const MAX_IMAGE_SIZE_MB = 5

/**
 * ArticleSegment - Form segment for News, Knowledge Base articles
 * Features: Confluence-like layout with AI Button, Image Upload, Title, Preview Text, and Rich Text Editor
 */
export const ArticleSegment: React.FC<ArticleSegmentProps> = ({
  control,
  image,
  setImage,
  imageInfo,
  setImageInfo,
  setImageFile,
  watchTitle,
  watchPreviewText,
  watchContent,
  watchSchedulePublication,
  setValue,
  context,
  extractedContentGroupRef,
  setNewCategories,
  setNewTags,
  categoriesRef,
  tagsRef
}) => {
  const { t } = useTranslation(translations)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const fileSizeMB = file.size / (1024 * 1024)
      if (fileSizeMB > MAX_IMAGE_SIZE_MB) {
        alert(`Image size must be less than ${MAX_IMAGE_SIZE_MB}MB`)
        return
      }

      if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file')
        return
      }

      // Store the file for upload in pre-submit
      setImageFile(file)

      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
        setImageInfo({
          name: file.name,
          size: `${fileSizeMB.toFixed(2)}MB`
        })
        // Store base64 for preview, will be replaced with fileInfo in pre-submit
        setValue('contentImage', reader.result as string)
      }
      reader.readAsDataURL(file)
    },
    [setImage, setImageInfo, setImageFile, setValue]
  )

  const handleImageRemove = useCallback(() => {
    setImage(null)
    setImageInfo(null)
    setImageFile(null)
    setValue('contentImage', null)
  }, [setImage, setImageInfo, setImageFile, setValue])

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
        ['link', 'image', 'video'],
        ['clean']
      ]
    }),
    []
  )

  const quillFormats = useMemo(
    () => ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'indent', 'link', 'image', 'video'],
    []
  )

  return (
    <div className="gba:flex gba:flex-1 gba:gap-6 gba:overflow-hidden">
      {/* LEFT SIDEBAR */}
      <div
        className={`gba:flex-shrink-0 gba:space-y-6 gba:overflow-y-auto gba:pr-4 gba:transition-all gba:duration-300 gba:border-r gba:border-border ${
          sidebarOpen ? 'gba:w-80' : 'gba:w-0 gba:overflow-hidden'
        }`}
      >
        {/* Settings */}
        <div className="gba:space-y-4">
          <FormField
            control={control as any}
            name="displayAuthor"
            render={({ field }) => (
              <FormItem className="gba:flex gba:items-center gba:justify-between gba:space-y-0 gba:p-4 gba:border gba:border-border gba:rounded-lg">
                <FormLabel>{t('display-author') || 'Display Author'}</FormLabel>
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
                <FormLabel>{t('allow-comments') || 'Allow Comments'}</FormLabel>
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
                <FormLabel>{t('allow-reactions') || 'Allow Reactions'}</FormLabel>
                <FormControl>
                  <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={control as any}
            name="schedulePublication"
            render={({ field }) => (
              <FormItem className="gba:flex gba:items-center gba:justify-between gba:space-y-0 gba:p-4 gba:border gba:border-border gba:rounded-lg">
                <FormLabel>{t('schedule-publication') || 'Schedule Publication'}</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Schedule Dates - if enabled */}
        {watchSchedulePublication && (
          <div className="gba:space-y-4">
            <FormField
              control={control as any}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('start-date') || 'Start Date'}</FormLabel>
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
                  <FormLabel>{t('end-date') || 'End Date'}</FormLabel>
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

      {/* SIDEBAR TOGGLE BUTTON */}
      <div className="gba:flex-shrink-0 gba:flex gba:items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="gba:h-full"
          data-testid="content-entry-window-sidebar-toggle"
        >
          {sidebarOpen ? <CaretLeftIcon size={20} /> : <CaretRightIcon size={20} />}
        </Button>
      </div>

      {/* RIGHT SIDE: Editor Area (Full Width) */}
      <div className="gba:flex-1 gba:flex gba:flex-col">
        {/* AI Text Generator Button */}
        <div className="gba:flex gba:justify-end gba:mb-4">
          <ContentAiTextGenerator
            title={watchTitle || ''}
            previewText={watchPreviewText || ''}
            content={watchContent || ''}
            onTitleChange={value => setValue('title', value)}
            onPreviewTextChange={value => setValue('previewText', value)}
            onContentChange={value => setValue('content', value)}
            accessToken={context.accessToken || ''}
            context={context}
          />
        </div>

        {/* Content Group and Content Type - Above Image Upload */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:mb-4">
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

          {/* Content Type Selection */}
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
        </div>

        {/* Image, Title, Preview - Fixed at top */}
        <div className="gba:flex gba:flex-col gba:space-y-4">
          {/* Image Upload - ÜBER dem Title */}
          <div className="gba:space-y-2">
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
                    data-testid="content-entry-window-remove-image-button"
                  >
                    {t('remove-image') || 'Remove Image'}
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
                        <ImageIcon className="gba:mr-2" size={20} />
                        {t('upload-image') || 'Upload Image'}
                      </span>
                    </Button>
                  </label>
                  <div className="gba:text-xs gba:text-muted-foreground">Max {MAX_IMAGE_SIZE_MB}MB</div>
                </div>
              )}
            </div>
          </div>

          {/* Title - ÜBER dem Editor */}
          <FormField
            control={control as any}
            name="title"
            rules={{ required: t('title-required') || 'Title is required' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('title') || 'Title'}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t('title-placeholder') || 'Enter article title...'}
                    className="gba:text-2xl gba:font-bold"
                    data-testid="content-entry-window-title-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Preview Text - ÜBER dem Editor */}
          <FormField
            control={control as any}
            name="previewText"
            rules={{ required: t('preview-required') || 'Preview text is required' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('preview-text') || 'Preview Text'}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={t('preview-text-placeholder') || 'Brief preview of the article...'}
                    rows={3}
                    data-testid="content-entry-window-preview-textarea"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Categories and Tags - Below Preview Text */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            {/* Categories - Tags Mode */}
            <FormField
              control={control as any}
              name="categories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categories (Optional)</FormLabel>
                  <FormControl>
                    <CatalogMultiSelect
                      ref={categoriesRef}
                      catalogIdentifier="ContentCategory"
                      catalogVersion="v1"
                      value={field.value || []}
                      onValueChange={value => {
                        field.onChange(value)
                      }}
                      onNewItemsChange={items => setNewCategories(items)}
                      placeholder="Select or create categories..."
                      allowCreate={true}
                      accessToken={context.accessToken}
                      data-testid="content-entry-window-categories-select"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags - Tags Mode */}
            <FormField
              control={control as any}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (Optional)</FormLabel>
                  <FormControl>
                    <CatalogMultiSelect
                      ref={tagsRef}
                      catalogIdentifier="ContentTag"
                      catalogVersion="v1"
                      value={field.value || []}
                      onValueChange={value => {
                        field.onChange(value)
                      }}
                      onNewItemsChange={items => setNewTags(items)}
                      placeholder="Select or create tags..."
                      allowCreate={true}
                      accessToken={context.accessToken}
                      data-testid="content-entry-window-tags-select"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Quill Editor - Takes full remaining height */}
        <div className="gba:flex-1 gba:flex gba:flex-col gba:border-t gba:border-border gba:overflow-hidden gba:min-h-0">
          <FormField
            control={control as any}
            name="content"
            rules={{ required: t('content-required') || 'Content is required' }}
            render={({ field }) => (
              <FormItem className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden gba:min-h-0">
                <FormControl className="gba:h-full gba:max-h-full gba:flex gba:flex-col gba:min-h-0">
                  <ReactQuill
                    theme="snow"
                    value={field.value || ''}
                    onChange={field.onChange}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder={t('content-placeholder') || 'Write your article content here...'}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  )
}
