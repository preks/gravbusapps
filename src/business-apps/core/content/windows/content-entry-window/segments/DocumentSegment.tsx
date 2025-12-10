import React, { useCallback } from 'react'
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
  useTranslation
} from '@newwork/nw-design-system'
import { ImageIcon } from '@phosphor-icons/react'
import { ContentEntryFormValues } from '../ContentEntryWindow'
import translations from '../_i18n'

interface DocumentSegmentProps {
  control: Control<ContentEntryFormValues>
  watchDisplayAuthor: boolean
  authorName: string | null
  image: string | null
  setImage: (image: string | null) => void
  imageInfo: { name: string; size: string } | null
  setImageInfo: (info: { name: string; size: string } | null) => void
  setImageFile: (file: File | null) => void
}

const MAX_IMAGE_SIZE_MB = 5

/**
 * DocumentSegment - Simple metadata form for Document Areas/Containers
 * This creates the CONTAINER where documents will be uploaded later
 */
export const DocumentSegment: React.FC<DocumentSegmentProps> = ({
  control,
  image,
  setImage,
  imageInfo,
  setImageInfo,
  setImageFile
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
      setImageFile(null)
      setValue('contentImage', null)
    },
    [setImage, setImageInfo, setImageFile]
  )

  return (
    <div className="gba:space-y-6">
      {/* Optional Header Image */}
      <div className="gba:space-y-2">
        <FormLabel>
          {t('header-image') || 'Header Image'}{' '}
          <span className="gba:text-muted-foreground gba:text-xs">({t('optional') || 'Optional'})</span>
        </FormLabel>
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:p-4 gba:border gba:border-border gba:rounded-lg gba:bg-muted/20">
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
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
              <label className="gba:cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleImageUpload(e, (control as any)._formValues)}
                  className="gba:hidden"
                  data-testid="document-segment-image-input"
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

      {/* Area Name */}
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

      {/* Short Description (Preview Text) */}
      <FormField
        control={control as any}
        name="previewText"
        rules={{ required: t('preview-required') || 'Short description is required' }}
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

      {/* Description (Optional) */}
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

      {/* Hidden fields */}
      <input type="hidden" {...(control as any).register('allowReaction')} value="false" />
      <input type="hidden" {...(control as any).register('allowComment')} value="false" />
      <input type="hidden" {...(control as any).register('displayAuthor')} value="false" />
    </div>
  )
}
