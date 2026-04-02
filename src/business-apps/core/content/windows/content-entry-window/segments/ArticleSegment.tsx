import React, { useMemo, useCallback, useState, useRef } from 'react'
import { Control, useWatch } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormFieldGroup,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Button,
  Switch,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { ImageIcon, Folder, Link } from '@phosphor-icons/react'
import ReactQuill from 'react-quill'
import { TableHandler } from '../quillTableSetup'
import { ContentEntryFormValues } from '../ContentEntryWindow'
import { ContentAiTextGenerator } from '../components/ContentAiTextGenerator'
import { CONTENT_GROUP_VALUES, CONTENT_GROUP_KEY } from '@/common/data/content/constants/contentConstants'
import { useContentTypeOptions } from '@/common/data/content/hooks/useContentTypeOptions'
import { useContentCategoryOptions } from '@/common/data/content/hooks/useContentCategoryOptions'
import { useContentTagOptions } from '@/common/data/content/hooks/useContentTagOptions'
import { TaxonomyMultiSelect } from '@/components/taxonomy-multi-select/TaxonomyMultiSelect'
import translations from '../_i18n'

interface AiTextGeneratorWrapperProps {
  control: Control<ContentEntryFormValues>
  watchTitle: string
  watchPreviewText: string
  watchContentTypeId?: string
  watchCategories?: string[]
  watchTags?: string[]
  setValue: (name: keyof ContentEntryFormValues, value: any) => void
  context: any
  extractedContentGroup?: string | null
  handlePictureUrl: (url: string) => Promise<void>
  onContentTypeIdChange?: (value: string | undefined) => void
  onContentCategoryIdsChange?: (ids: string[]) => void
  onContentTagIdsChange?: (ids: string[]) => void
}

const AiTextGeneratorWrapper = React.memo(function AiTextGeneratorWrapper({
  control,
  watchTitle,
  watchPreviewText,
  watchContentTypeId,
  watchCategories,
  watchTags,
  setValue,
  context,
  extractedContentGroup,
  handlePictureUrl,
  onContentTypeIdChange,
  onContentCategoryIdsChange,
  onContentTagIdsChange
}: AiTextGeneratorWrapperProps) {
  const content = useWatch({ control, name: 'content' })
  return (
    <ContentAiTextGenerator
      title={watchTitle || ''}
      previewText={watchPreviewText || ''}
      content={content || ''}
      onTitleChange={value => setValue('title', value)}
      onPreviewTextChange={value => setValue('previewText', value)}
      onContentChange={value => setValue('content', value)}
      onPictureChange={handlePictureUrl}
      accessToken={context.accessToken || ''}
      context={context}
      contentGroup={extractedContentGroup}
      contentTypeId={watchContentTypeId}
      contentCategoryIds={watchCategories || []}
      contentTagIds={watchTags || []}
      onContentTypeIdChange={onContentTypeIdChange}
      onContentCategoryIdsChange={onContentCategoryIdsChange}
      onContentTagIdsChange={onContentTagIdsChange}
    />
  )
})

interface ArticleSegmentProps {
  control: Control<ContentEntryFormValues>
  image: string | null
  setImage: (image: string | null) => void
  imageInfo: { name: string; size: string } | null
  setImageInfo: (info: { name: string; size: string } | null) => void
  setImageFile: (file: File | null) => void
  watchTitle: string
  watchPreviewText: string
  watchSchedulePublication: boolean
  watchContentTypeId?: string
  watchCategories?: string[]
  watchTags?: string[]
  setValue: (name: keyof ContentEntryFormValues, value: any) => void
  context: any
  extractedContentGroup?: string | null
  onCreateCategory?: (label: string) => Promise<string>
  onCreateTag?: (label: string) => Promise<string>
  onCategoriesChange?: (categories: string[]) => void
  onTagsChange?: (tags: string[]) => void
  onContentTypeIdChange?: (value: string | undefined) => void
  onContentCategoryIdsChange?: (ids: string[]) => void
  onContentTagIdsChange?: (ids: string[]) => void
}

const MAX_IMAGE_SIZE_MB = 5

export const ArticleSegment: React.FC<ArticleSegmentProps> = React.memo(
  ({
    control,
    image,
    setImage,
    imageInfo,
    setImageInfo,
    setImageFile,
    watchTitle,
    watchPreviewText,
    watchSchedulePublication,
    watchContentTypeId,
    watchCategories,
    watchTags,
    setValue,
    context,
    extractedContentGroup,
    onCreateCategory,
    onCreateTag,
    onCategoriesChange,
    onTagsChange,
    onContentTypeIdChange,
    onContentCategoryIdsChange,
    onContentTagIdsChange
  }) => {
    const { t } = useTranslation(translations)
    const [dragActive, setDragActive] = useState(false)
    const [uploadMenuOpen, setUploadMenuOpen] = useState(false)
    const [urlPopoverOpen, setUrlPopoverOpen] = useState(false)
    const [urlInput, setUrlInput] = useState('')
    const [isLoadingUrl, setIsLoadingUrl] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const watchContentGroup = useWatch({ control, name: 'contentGroup' })
    const activeGroup = extractedContentGroup || watchContentGroup

    const { options: contentTypeOptions, isLoading: typesLoading } = useContentTypeOptions(
      context.accessToken,
      activeGroup
    )
    const { options: categoryOptions, isLoading: categoriesLoading } = useContentCategoryOptions(context.accessToken)
    const { options: tagOptions, isLoading: tagsLoading } = useContentTagOptions(context.accessToken)

    const processFile = useCallback(
      (file: File) => {
        const fileSizeMB = file.size / (1024 * 1024)
        if (fileSizeMB > MAX_IMAGE_SIZE_MB) {
          alert(`Image size must be less than ${MAX_IMAGE_SIZE_MB}MB`)
          return
        }
        if (!file.type.startsWith('image/')) {
          alert('Please upload a valid image file')
          return
        }
        setImageFile(file)
        const reader = new FileReader()
        reader.onloadend = () => {
          setImage(reader.result as string)
          setImageInfo({ name: file.name, size: `${fileSizeMB.toFixed(2)}MB` })
          setValue('contentImage', reader.result as string)
        }
        reader.readAsDataURL(file)
      },
      [setImage, setImageInfo, setImageFile, setValue]
    )

    const handleImageUpload = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        processFile(file)
        if (fileInputRef.current) fileInputRef.current.value = ''
      },
      [processFile]
    )

    const handleDrop = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setDragActive(false)
        const file = event.dataTransfer.files?.[0]
        if (file) processFile(file)
      },
      [processFile]
    )

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setDragActive(true)
    }, [])

    const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setDragActive(false)
    }, [])

    const handlePictureUrl = useCallback(
      async (pictureUrl: string) => {
        const response = await fetch(pictureUrl, { mode: 'cors' })
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
        const blob = await response.blob()
        if (!blob.type.startsWith('image/')) throw new Error('URL does not point to an image')
        const fileName = pictureUrl.split('/').pop()?.split('?')[0] || 'image.jpg'
        const mimeType = blob.type || `image/jpeg`
        processFile(new File([blob], fileName, { type: mimeType }))
      },
      [processFile]
    )

    const handleUrlFetch = useCallback(async () => {
      if (!urlInput.trim()) return
      setIsLoadingUrl(true)
      try {
        await handlePictureUrl(urlInput.trim())
        setUrlInput('')
        setUrlPopoverOpen(false)
        setUploadMenuOpen(false)
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to fetch image from URL')
      } finally {
        setIsLoadingUrl(false)
      }
    }, [urlInput, handlePictureUrl])

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
          [TableHandler.toolName],
          ['clean']
        ],
        [TableHandler.moduleName]: { fullWidth: true, customButton: 'Insert table', dragResize: false }
      }),
      []
    )

    return (
      <div className="gba:flex gba:flex-1 gba:flex-col gba:gap-6 gba:overflow-hidden">
        <div className="gba:flex-1 gba:flex gba:flex-col gba:space-y-4">
          <div className="gba:flex gba:justify-end gba:mb-4">
            <AiTextGeneratorWrapper
              control={control}
              watchTitle={watchTitle}
              watchPreviewText={watchPreviewText}
              watchContentTypeId={watchContentTypeId}
              watchCategories={watchCategories}
              watchTags={watchTags}
              setValue={setValue}
              context={context}
              extractedContentGroup={extractedContentGroup}
              handlePictureUrl={handlePictureUrl}
              onContentTypeIdChange={onContentTypeIdChange}
              onContentCategoryIdsChange={onContentCategoryIdsChange}
              onContentTagIdsChange={onContentTagIdsChange}
            />
          </div>

          <FormFieldGroup>
            {!extractedContentGroup && (
              <FormField
                control={control as any}
                name="contentGroup"
                rules={{ required: t('group-required') }}
                render={({ field }) => (
                  <FormItem className="gba:flex-1">
                    <FormLabel>{t('content-group')}</FormLabel>
                    <FormControl>
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="content-entry-window-group-select">
                          <SelectValue placeholder={t('select-group') || 'Select group'} />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTENT_GROUP_VALUES.map(value => (
                            <SelectItem key={value} value={value}>
                              {t(CONTENT_GROUP_KEY[value])}
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

            <FormField
              control={control as any}
              name="contentTypeId"
              render={({ field }) => (
                <FormItem className="gba:flex-1">
                  <FormLabel>{t('content-type')}</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      disabled={!activeGroup || typesLoading}
                    >
                      <SelectTrigger data-testid="content-entry-window-type-select">
                        <SelectValue placeholder={typesLoading ? 'Loading...' : t('select-type') || 'Select type'} />
                      </SelectTrigger>
                      <SelectContent>
                        {contentTypeOptions.map(opt => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormFieldGroup>

          <FormField
            control={control as any}
            name="contentImage"
            render={() => (
              <FormItem>
                <FormLabel>{t('header-image') || 'Header Image'}</FormLabel>
                <FormControl>
                  <div
                    className={`gba:flex gba:flex-col gba:items-center gba:gap-3 gba:p-4 gba:border-2 gba:border-dashed gba:rounded-lg gba:transition-colors ${
                      dragActive ? 'gba:border-primary gba:bg-primary/5' : 'gba:border-border gba:bg-muted/20'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
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
                      <div className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:w-full">
                        <div className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:text-center">
                          <ImageIcon size={32} className="gba:text-muted-foreground" />
                          <div className="gba:text-sm gba:text-muted-foreground">
                            {dragActive ? 'Drop image here' : 'Drag and drop an image here, or'}
                          </div>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="gba:hidden"
                          data-testid="content-entry-window-image-input"
                        />
                        <Popover open={uploadMenuOpen} onOpenChange={setUploadMenuOpen}>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" size="sm">
                              <ImageIcon className="gba:mr-2" size={20} />
                              {t('upload-image') || 'Upload Image'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="gba:w-48 gba:p-2" align="start" sideOffset={8}>
                            <div className="gba:flex gba:flex-col gba:gap-1">
                              <button
                                onClick={() => {
                                  fileInputRef.current?.click()
                                  setUploadMenuOpen(false)
                                }}
                                className="gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:text-foreground hover:gba:bg-accent gba:transition-colors gba:w-full gba:text-left"
                              >
                                <Folder className="gba:h-4 gba:w-4 gba:text-muted-foreground" weight="bold" />
                                <span>From storage</span>
                              </button>
                              <Popover open={urlPopoverOpen} onOpenChange={setUrlPopoverOpen}>
                                <PopoverTrigger asChild>
                                  <button
                                    className="gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:text-foreground hover:gba:bg-accent gba:transition-colors gba:w-full gba:text-left"
                                    onClick={e => {
                                      e.stopPropagation()
                                      setUrlPopoverOpen(true)
                                    }}
                                  >
                                    <Link className="gba:h-4 gba:w-4 gba:text-muted-foreground" weight="bold" />
                                    <span>From URL</span>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="gba:w-80 gba:p-4" align="start" sideOffset={8}>
                                  <div className="gba:space-y-3">
                                    <div className="gba:space-y-2">
                                      <label className="gba:text-sm gba:font-medium">Enter image URL</label>
                                      <Input
                                        value={urlInput}
                                        onChange={e => setUrlInput(e.target.value)}
                                        placeholder="https://example.com/image.jpg"
                                        onKeyDown={e => {
                                          if (e.key === 'Enter' && !isLoadingUrl) handleUrlFetch()
                                        }}
                                        data-testid="content-entry-window-url-input"
                                      />
                                    </div>
                                    <div className="gba:flex gba:gap-2 gba:justify-end">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setUrlInput('')
                                          setUrlPopoverOpen(false)
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleUrlFetch}
                                        disabled={!urlInput.trim() || isLoadingUrl}
                                        data-testid="content-entry-window-fetch-url-button"
                                      >
                                        {isLoadingUrl ? 'Loading...' : 'Fetch Image'}
                                      </Button>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <div className="gba:text-xs gba:text-muted-foreground">Max {MAX_IMAGE_SIZE_MB}MB</div>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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

          <FormField
            control={control as any}
            name="previewText"
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

          <div className="gba:flex-1 gba:flex gba:flex-col gba:border-t gba:border-border gba:overflow-hidden gba:min-h-0">
            <style>{`
            .ql-editor { min-height: 50px; }
            .ql-table { border-collapse: separate; table-layout: fixed; }
            .ql-table[data-full] { width: 100%; }
            .ql-table-wrapper { width: 100%; padding-left: 1px; padding-right: 1px; overflow: auto; }
            .ql-table-cell { padding: 8px 12px; border: 1px solid #a1a1aa; font-size: 0.875rem; outline: 0; overflow: auto; }
            .ql-table-cell-inner { display: inline-block; min-width: 100%; word-break: break-word; }
            .ql-table col { border-collapse: separate; text-indent: initial; display: table-column; table-layout: fixed; }
            .ql-table-operation-menu { background: #fff; border-radius: 6px; box-shadow: 0 2px 12px 0 rgba(0,0,0,.1); width: 200px; overflow: auto; font-size: 0.875rem; z-index: 1; }
            .ql-table-operation-menu-item { display: flex; align-items: center; padding: 10px 16px; cursor: pointer; color: #595959; }
            .ql-table-operation-menu-item:hover { background: #f5f5f5; }
            .ql-table-operation-menu-dividing { height: 1px; background: #efefef; }
            .ql-table-selection_line { display: none; position: absolute; border: 2px solid; pointer-events: none; }
          `}</style>
            <FormField
              control={control as any}
              name="content"
              rules={{ required: t('content-required') || 'Content is required' }}
              render={({ field }) => (
                <FormItem className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0">
                  <FormLabel>{t('content') || 'Content'}</FormLabel>
                  <FormControl>
                    <ReactQuill
                      theme="snow"
                      value={field.value || ''}
                      onChange={field.onChange}
                      modules={quillModules}
                      placeholder={t('content-placeholder') || 'Write your article content here...'}
                      className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:overflow-hidden"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormFieldGroup>
            <FormField
              control={control as any}
              name="categories"
              render={({ field }) => (
                <FormItem className="gba:flex-1">
                  <FormLabel>Categories</FormLabel>
                  <FormControl>
                    <TaxonomyMultiSelect
                      options={categoryOptions}
                      value={field.value || []}
                      onValueChange={ids => {
                        field.onChange(ids)
                        onCategoriesChange?.(ids)
                      }}
                      onCreateNew={onCreateCategory}
                      isLoading={categoriesLoading}
                      placeholder="Select categories..."
                      data-testid="content-entry-window-categories-select"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control as any}
              name="tags"
              render={({ field }) => (
                <FormItem className="gba:flex-1">
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <TaxonomyMultiSelect
                      options={tagOptions}
                      value={field.value || []}
                      onValueChange={ids => {
                        field.onChange(ids)
                        onTagsChange?.(ids)
                      }}
                      onCreateNew={onCreateTag}
                      isLoading={tagsLoading}
                      placeholder="Select tags..."
                      data-testid="content-entry-window-tags-select"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormFieldGroup>
        </div>

        <div className="gba:flex gba:flex-col gba:gap-6 gba:flex-shrink-0 gba:overflow-y-auto gba:transition-all gba:duration-300 gba:border-border gba:w-full gba:pt-4 gba:border-t">
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

          <div className="gba:mt-auto gba:flex gba:flex-wrap gba:gap-4">
            <FormField
              control={control as any}
              name="displayAuthor"
              render={({ field }) => (
                <FormItem className="gba:flex gba:items-center gba:gap-2 gba:space-y-0">
                  <FormLabel className="gba:text-sm">{t('display-author') || 'Display Author'}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} className="gba:scale-90" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={control as any}
              name="allowComment"
              render={({ field }) => (
                <FormItem className="gba:flex gba:items-center gba:gap-2 gba:space-y-0">
                  <FormLabel className="gba:text-sm">{t('allow-comments') || 'Allow Comments'}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} className="gba:scale-90" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={control as any}
              name="allowReaction"
              render={({ field }) => (
                <FormItem className="gba:flex gba:items-center gba:gap-2 gba:space-y-0">
                  <FormLabel className="gba:text-sm">{t('allow-reactions') || 'Allow Reactions'}</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value as boolean}
                      onCheckedChange={field.onChange}
                      className="gba:scale-90"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={control as any}
              name="schedulePublication"
              render={({ field }) => (
                <FormItem className="gba:flex gba:items-center gba:gap-2 gba:space-y-0">
                  <FormLabel className="gba:text-sm">{t('schedule-publication') || 'Schedule Publication'}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} className="gba:scale-90" />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    )
  }
)

export default ArticleSegment
