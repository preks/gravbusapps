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
import { CatalogSelect } from '@/components/catalog-select'
import { ContentEntryFormValues } from '../ContentEntryWindow'
import { ContentAiTextGenerator } from '../components/ContentAiTextGenerator'
import translations from '../_i18n'

interface AiTextGeneratorWrapperProps {
  control: Control<ContentEntryFormValues>
  watchTitle: string
  watchPreviewText: string
  watchContentTypeRef?: string
  watchCategories?: string[]
  watchTags?: string[]
  setValue: (name: keyof ContentEntryFormValues, value: any) => void
  context: any
  extractedContentGroupRef?: string
  handlePictureUrl: (url: string) => Promise<void>
  onContentTypeRefChange?: (value: string | undefined) => void
  onContentCategoryRefsChange?: (refs: string[]) => void
  onContentCategoryNamesChange?: (names: string[]) => void
  onContentTagRefsChange?: (refs: string[]) => void
  onContentTagNamesChange?: (names: string[]) => void
}

const AiTextGeneratorWrapper = React.memo(function AiTextGeneratorWrapper({
  control,
  watchTitle,
  watchPreviewText,
  watchContentTypeRef,
  watchCategories,
  watchTags,
  setValue,
  context,
  extractedContentGroupRef,
  handlePictureUrl,
  onContentTypeRefChange,
  onContentCategoryRefsChange,
  onContentCategoryNamesChange,
  onContentTagRefsChange,
  onContentTagNamesChange
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
      contentGroupRef={extractedContentGroupRef}
      contentTypeRef={watchContentTypeRef}
      contentCategoryRefs={
        watchCategories?.filter(cat => {
          const parts = cat.split(':')
          return parts.length >= 2
        }) || []
      }
      contentCategoryNames={
        watchCategories?.filter(cat => {
          const parts = cat.split(':')
          return parts.length < 2
        }) || []
      }
      contentTagRefs={
        watchTags?.filter(tag => {
          const parts = tag.split(':')
          return parts.length >= 2
        }) || []
      }
      contentTagNames={
        watchTags?.filter(tag => {
          const parts = tag.split(':')
          return parts.length < 2
        }) || []
      }
      onContentTypeRefChange={onContentTypeRefChange}
      onContentCategoryRefsChange={onContentCategoryRefsChange}
      onContentCategoryNamesChange={onContentCategoryNamesChange}
      onContentTagRefsChange={onContentTagRefsChange}
      onContentTagNamesChange={onContentTagNamesChange}
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
  watchContentTypeRef?: string
  watchCategories?: string[]
  watchTags?: string[]
  setValue: (name: keyof ContentEntryFormValues, value: any) => void
  context: any
  extractedContentGroupRef?: string
  onCreateCategory?: (label: string) => Promise<string>
  onCreateTag?: (label: string) => Promise<string>
  onCategoriesChange?: (categories: string[]) => void
  onTagsChange?: (tags: string[]) => void
  onContentTypeRefChange?: (value: string | undefined) => void
  onContentCategoryRefsChange?: (value: string[]) => void
  onContentCategoryNamesChange?: (value: string[]) => void
  onContentTagRefsChange?: (value: string[]) => void
  onContentTagNamesChange?: (value: string[]) => void
}

const MAX_IMAGE_SIZE_MB = 5

/**
 * ArticleSegment - Form segment for News, Knowledge Base articles
 * Features: Confluence-like layout with AI Button, Image Upload, Title, Preview Text, and Rich Text Editor
 */
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
    watchContentTypeRef,
    watchCategories,
    watchTags,
    setValue,
    context,
    extractedContentGroupRef,
    onCreateCategory,
    onCreateTag,
    onCategoriesChange,
    onTagsChange,
    onContentTypeRefChange,
    onContentCategoryRefsChange,
    onContentCategoryNamesChange,
    onContentTagRefsChange,
    onContentTagNamesChange
  }) => {
    const { t } = useTranslation(translations)
    const [dragActive, setDragActive] = useState(false)
    const [uploadMenuOpen, setUploadMenuOpen] = useState(false)
    const [urlPopoverOpen, setUrlPopoverOpen] = useState(false)
    const [urlInput, setUrlInput] = useState('')
    const [isLoadingUrl, setIsLoadingUrl] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Process file (used by both file upload and drag & drop)
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

    const handleImageUpload = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        processFile(file)
        // Clear input so same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      },
      [processFile]
    )

    // Drag and drop handlers
    const handleDrop = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setDragActive(false)

        const file = event.dataTransfer.files?.[0]
        if (file) {
          processFile(file)
        }
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

    // Helper function to fetch image from URL and process it
    const handlePictureUrl = useCallback(
      async (pictureUrl: string) => {
        try {
          const response = await fetch(pictureUrl, { mode: 'cors' })
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
          }

          const blob = await response.blob()
          if (!blob.type.startsWith('image/')) {
            throw new Error('URL does not point to an image')
          }

          // Convert blob to File
          const fileName = pictureUrl.split('/').pop()?.split('?')[0] || 'image.jpg'
          const fileExtension = fileName.split('.').pop() || 'jpg'
          const mimeType = blob.type || `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`
          const file = new File([blob], fileName, { type: mimeType })

          // Process as regular file upload
          processFile(file)
        } catch (error) {
          console.error('Failed to load picture from URL:', error)
          throw error
        }
      },
      [processFile]
    )

    // URL fetch handler
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
        [TableHandler.moduleName]: {
          fullWidth: true,
          customButton: 'Insert table',
          dragResize: false
        }
      }),
      []
    )

    return (
      <div className="gba:flex gba:flex-1 gba:flex-col gba:gap-6 gba:overflow-hidden">
        {/* MAIN CONTENT */}
        <div className="gba:flex-1 gba:flex gba:flex-col gba:space-y-4">
          {/* AI Text Generator Button */}
          <div className="gba:flex gba:justify-end gba:mb-4">
            <AiTextGeneratorWrapper
              control={control}
              watchTitle={watchTitle}
              watchPreviewText={watchPreviewText}
              watchContentTypeRef={watchContentTypeRef}
              watchCategories={watchCategories}
              watchTags={watchTags}
              setValue={setValue}
              context={context}
              extractedContentGroupRef={extractedContentGroupRef}
              handlePictureUrl={handlePictureUrl}
              onContentTypeRefChange={onContentTypeRefChange}
              onContentCategoryRefsChange={onContentCategoryRefsChange}
              onContentCategoryNamesChange={onContentCategoryNamesChange}
              onContentTagRefsChange={onContentTagRefsChange}
              onContentTagNamesChange={onContentTagNamesChange}
            />
          </div>

          {/* Content Group and Content Type - Above Image Upload */}
          <FormFieldGroup>
            {/* Content Group Selection - Hidden if provided via props or additionalData */}
            {!extractedContentGroupRef && (
              <FormField
                control={control as any}
                name="contentGroupRef"
                rules={{ required: t('group-required') }}
                render={({ field }) => (
                  <FormItem className="gba:flex-1">
                    <FormLabel>{t('content-group')}</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier="ContentGroup:v1"
                        value={field.value || ''}
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
                <FormItem className="gba:flex-1">
                  <FormLabel>{t('content-type')}</FormLabel>
                  <FormControl>
                    <CatalogSelect
                      catalogIdentifier="ContentType:v1"
                      parentField="contentGroupRef"
                      requireSourceForEnable={true}
                      autoSelectFirst={true}
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      data-testid="content-entry-window-type-select"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormFieldGroup>

          {/* Image Upload */}
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
                                          if (e.key === 'Enter' && !isLoadingUrl) {
                                            handleUrlFetch()
                                          }
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

          {/* Title */}
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

          {/* Preview Text */}
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

          {/* Quill Editor - Takes full remaining height */}
          <div className="gba:flex-1 gba:flex gba:flex-col gba:border-t gba:border-border gba:overflow-hidden gba:min-h-0">
            <style>{`
            .ql-editor {
              min-height: 50px;
            }
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

          {/* Categories and Tags - Below Editor */}
          <FormFieldGroup>
            {/* Categories - Tags Mode */}
            <FormField
              control={control as any}
              name="categories"
              render={({ field }) => (
                <FormItem className="gba:flex-1">
                  <FormLabel>Categories</FormLabel>
                  <FormControl>
                    <CatalogSelect
                      catalogIdentifier="ContentCategory:v1"
                      mode="tags"
                      value={field.value || []}
                      onValueChange={value => {
                        const categories = Array.isArray(value) ? value : []
                        field.onChange(categories)
                        onCategoriesChange?.(categories)
                      }}
                      onCreateTag={async (tag: string) => {
                        if (!onCreateCategory) {
                          throw new Error('onCreateCategory is required for categories')
                        }
                        const newId = await onCreateCategory(tag)
                        return newId
                      }}
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
                <FormItem className="gba:flex-1">
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <CatalogSelect
                      catalogIdentifier="ContentTag:v1"
                      mode="tags"
                      value={field.value || []}
                      onValueChange={value => {
                        const tags = Array.isArray(value) ? value : []
                        field.onChange(tags)
                        onTagsChange?.(tags)
                      }}
                      onCreateTag={async (tag: string) => {
                        if (!onCreateTag) {
                          throw new Error('onCreateTag is required for tags')
                        }
                        const newId = await onCreateTag(tag)
                        return newId
                      }}
                      data-testid="content-entry-window-tags-select"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormFieldGroup>
        </div>

        {/* BOTTOM CONTROLS */}
        <div className="gba:flex gba:flex-col gba:gap-6 gba:flex-shrink-0 gba:overflow-y-auto gba:transition-all gba:duration-300 gba:border-border gba:w-full gba:pt-4 gba:border-t">
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

          {/* Compact toggles */}
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
