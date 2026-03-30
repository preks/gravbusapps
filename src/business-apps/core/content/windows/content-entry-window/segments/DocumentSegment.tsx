import React, { useCallback, useState, useRef } from 'react'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { ImageIcon, Folder, Link } from '@phosphor-icons/react'
import { ContentEntryFormValues } from '../ContentEntryWindow'
import { CONTENT_GROUP_OPTIONS } from '@/common/data/content/constants/contentGroupConstants'
import { useContentTypeOptions } from '@/common/data/content/hooks/useContentTypeOptions'
import { useContentCategoryOptions } from '@/common/data/content/hooks/useContentCategoryOptions'
import { useContentTagOptions } from '@/common/data/content/hooks/useContentTagOptions'
import { TaxonomyMultiSelect } from '@/components/taxonomy-multi-select/TaxonomyMultiSelect'
import translations from '../_i18n'

interface DocumentSegmentProps {
  control: Control<ContentEntryFormValues>
  accessToken?: string
  watchDisplayAuthor: boolean
  authorName: string | null
  image: string | null
  setImage: (image: string | null) => void
  imageInfo: { name: string; size: string } | null
  setImageInfo: (info: { name: string; size: string } | null) => void
  setImageFile: (file: File | null) => void
  extractedContentGroup?: string | null
  onCreateCategory?: (label: string) => Promise<string>
  onCreateTag?: (label: string) => Promise<string>
  onCategoriesChange?: (categories: string[]) => void
  onTagsChange?: (tags: string[]) => void
}

const MAX_IMAGE_SIZE_MB = 5

export const DocumentSegment: React.FC<DocumentSegmentProps> = ({
  control,
  accessToken,
  image,
  setImage,
  imageInfo,
  setImageInfo,
  setImageFile,
  extractedContentGroup,
  onCreateCategory,
  onCreateTag,
  onCategoriesChange,
  onTagsChange
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

  const { options: contentTypeOptions, isLoading: typesLoading } = useContentTypeOptions(accessToken, activeGroup)
  const { options: categoryOptions, isLoading: categoriesLoading } = useContentCategoryOptions(accessToken)
  const { options: tagOptions, isLoading: tagsLoading } = useContentTagOptions(accessToken)

  const processFile = useCallback(
    (file: File, setValue: any) => {
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
        setValue('contentImage', reader.result as any)
      }
      reader.readAsDataURL(file)
    },
    [setImage, setImageInfo, setImageFile]
  )

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, setValue: any) => {
      const file = event.target.files?.[0]
      if (!file) return
      processFile(file, setValue)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [processFile]
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>, setValue: any) => {
      event.preventDefault()
      event.stopPropagation()
      setDragActive(false)
      const file = event.dataTransfer.files?.[0]
      if (file) processFile(file, setValue)
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

  const handleUrlFetch = useCallback(
    async (setValue: any) => {
      if (!urlInput.trim()) return
      setIsLoadingUrl(true)
      try {
        const response = await fetch(urlInput.trim(), { mode: 'cors' })
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
        const blob = await response.blob()
        if (!blob.type.startsWith('image/')) throw new Error('URL does not point to an image')
        const fileName = urlInput.split('/').pop()?.split('?')[0] || 'image.jpg'
        const mimeType = blob.type || `image/jpeg`
        processFile(new File([blob], fileName, { type: mimeType }), setValue)
        setUrlInput('')
        setUrlPopoverOpen(false)
        setUploadMenuOpen(false)
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to fetch image from URL')
      } finally {
        setIsLoadingUrl(false)
      }
    },
    [urlInput, processFile]
  )

  const handleImageRemove = useCallback(
    (setValue: any) => {
      setImage(null)
      setImageInfo(null)
      setImageFile(null)
      setValue('contentImage', null)
    },
    [setImage, setImageInfo, setImageFile]
  )

  return (
    <div className="gba:space-y-6">
      <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:mb-4">
        {!extractedContentGroup && (
          <FormField
            control={control as any}
            name="contentGroup"
            rules={{ required: t('group-required') }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('content-group')}</FormLabel>
                <FormControl>
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="content-entry-window-group-select">
                      <SelectValue placeholder={t('select-group') || 'Select group'} />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_GROUP_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
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
            <FormItem>
              <FormLabel>{t('content-type')}</FormLabel>
              <FormControl>
                <Select
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  disabled={!activeGroup || typesLoading}
                >
                  <SelectTrigger data-testid="document-segment-type-select">
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
      </div>

      <div className="gba:space-y-2">
        <FormLabel>
          {t('header-image') || 'Header Image'}{' '}
          <span className="gba:text-muted-foreground gba:text-xs">({t('optional') || 'Optional'})</span>
        </FormLabel>
        <div
          className={`gba:flex gba:flex-col gba:items-center gba:gap-3 gba:p-4 gba:border-2 gba:border-dashed gba:rounded-lg gba:transition-colors ${
            dragActive ? 'gba:border-primary gba:bg-primary/5' : 'gba:border-border gba:bg-muted/20'
          }`}
          onDrop={e => handleDrop(e, (control as any)._formValues)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {image ? (
            <div className="gba:relative gba:w-full">
              <img
                src={image}
                alt="Header preview"
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
                onClick={() => handleImageRemove((control as any)._formValues)}
                className="gba:mt-2 gba:w-full"
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
                onChange={e => handleImageUpload(e, (control as any)._formValues)}
                className="gba:hidden"
                data-testid="document-segment-image-input"
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
                                if (e.key === 'Enter' && !isLoadingUrl) handleUrlFetch((control as any)._formValues)
                              }}
                              data-testid="document-segment-url-input"
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
                              onClick={() => handleUrlFetch((control as any)._formValues)}
                              disabled={!urlInput.trim() || isLoadingUrl}
                              data-testid="document-segment-fetch-url-button"
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
      </div>

      <FormField
        control={control as any}
        name="title"
        rules={{ required: t('title-required') || 'Title is required' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('document-area-name') || 'Document Area Name'}</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t('document-area-name-placeholder') || 'e.g., HR Documents, Legal Contracts, Policies...'}
                data-testid="document-segment-title-input"
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
            <FormLabel>{t('short-description') || 'Short Description'}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={t('short-description-placeholder') || 'Brief summary shown in the document portal...'}
                rows={2}
                data-testid="document-segment-preview-textarea"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control as any}
        name="content"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('description') || 'Description'}{' '}
              <span className="gba:text-muted-foreground gba:text-xs">({t('optional') || 'Optional'})</span>
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={
                  t('document-area-description-placeholder') ||
                  'Describe what kind of documents will be stored in this area...'
                }
                rows={6}
                data-testid="document-segment-description-textarea"
              />
            </FormControl>
            <FormMessage />
            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
              {t('document-area-description-hint') || 'Help others understand the purpose of this document area'}
            </div>
          </FormItem>
        )}
      />

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
                  data-testid="document-segment-categories-select"
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
                  data-testid="document-segment-tags-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormFieldGroup>

      <input type="hidden" {...(control as any).register('allowReaction')} value="false" />
      <input type="hidden" {...(control as any).register('allowComment')} value="false" />
      <input type="hidden" {...(control as any).register('displayAuthor')} value="false" />
    </div>
  )
}

export default DocumentSegment
