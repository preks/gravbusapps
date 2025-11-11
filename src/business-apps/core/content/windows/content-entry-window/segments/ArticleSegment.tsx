import React, { useMemo, useCallback } from 'react'
import { Control } from 'react-hook-form'
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
  useTranslation
} from '@newwork/nw-design-system'
import { Image } from '@phosphor-icons/react'
import ReactQuill from 'react-quill'
import { ContentEntryFormValues } from '../ContentEntryWindow'
import translations from '../_i18n'

interface ArticleSegmentProps {
  control: Control<ContentEntryFormValues>
  image: string | null
  setImage: (image: string | null) => void
  imageInfo: { name: string; size: string } | null
  setImageInfo: (info: { name: string; size: string } | null) => void
  authorName: string | null
  watchDisplayAuthor: boolean
  watchSchedulePublication: boolean
}

const MAX_IMAGE_SIZE_MB = 5

/**
 * ArticleSegment - Form segment for News, Knowledge Base articles
 * Features: Rich text editor, image upload, preview text
 */
export const ArticleSegment: React.FC<ArticleSegmentProps> = ({
  control,
  image,
  setImage,
  imageInfo,
  setImageInfo,
  watchDisplayAuthor,
  watchSchedulePublication
}) => {
  const { t } = useTranslation(translations)

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, setValue: any) => {
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

      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
        setImageInfo({
          name: file.name,
          size: `${fileSizeMB.toFixed(2)}MB`
        })
        setValue('contentImage', reader.result as any)
      }
      reader.readAsDataURL(file)
    },
    [setImage, setImageInfo]
  )

  const handleImageRemove = useCallback(
    (setValue: any) => {
      setImage(null)
      setImageInfo(null)
      setValue('contentImage', null)
    },
    [setImage, setImageInfo]
  )

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
    <div className="gba:space-y-6">
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
                data-testid="article-segment-title-input"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Image Upload */}
      <div className="gba:space-y-2">
        <FormLabel>{t('content-image') || 'Content Image'}</FormLabel>
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
                onClick={() => handleImageRemove((control as any)._formValues)}
                className="gba:mt-2 gba:w-full"
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
                  onChange={e => handleImageUpload(e, (control as any)._formValues)}
                  className="gba:hidden"
                  data-testid="article-segment-image-input"
                />
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>
                    <Image className="gba:mr-2" size={20} />
                    {t('upload-image') || 'Upload Image'}
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
        rules={{ required: t('preview-required') || 'Preview text is required' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('preview-text') || 'Preview Text'}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={t('preview-text-placeholder') || 'Brief preview of the article...'}
                rows={3}
                data-testid="article-segment-preview-textarea"
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
        rules={{ required: t('content-required') || 'Content is required' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('content') || 'Content'}</FormLabel>
            <FormControl>
              <div className="gba:[&_.ql-container]:h-[250px] gba:[&_.ql-editor]:min-h-[200px] gba:[&_.ql-editor]:max-h-[200px] gba:[&_.ql-editor]:overflow-y-auto">
                <ReactQuill
                  theme="snow"
                  value={field.value || ''}
                  onChange={field.onChange}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder={t('content-placeholder') || 'Write your article content here...'}
                  className="gba:min-h-[250px]"
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* Settings */}
      <div className="gba:grid gba:grid-cols-3 gba:gap-4">
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
      </div>
      <div className="gba:space-y-4">
        {watchDisplayAuthor && (
          <FormField
            control={control as any}
            name="author"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('author') || 'Author'}</FormLabel>
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
              <FormLabel>{t('schedule-publication') || 'Schedule Publication'}</FormLabel>
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
                  <FormLabel>{t('start-date') || 'Start Date'}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="datetime-local"
                      value={field.value || ''}
                      data-testid="article-segment-start-date-input"
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
                      data-testid="article-segment-end-date-input"
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
  )
}
