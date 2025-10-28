import React, { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Switch
} from '@newwork/nw-design-system'
import { useContentTypes } from '@/business-apps/core/content/apps/content-hub/hooks/useContentTypes'
import { DOCUMENT_CATEGORIES } from '@/business-apps/core/content/apps/content-hub/constants/contentConstants'

export interface DocumentFormProps extends BusinessAppContextProps {
  documentId?: string
}

interface DocumentFormValues {
  title: string
  description: string
  category: string
  tags: string[]
  file: File | null
  displayAuthor: boolean
  allowComment: boolean
  allowLike: boolean
}

const DocumentForm: React.FC<DocumentFormProps> = context => {
  const { t } = useTranslation('content')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const { isLoading: typesLoading } = useContentTypes(context.accessToken)

  const form = useForm<DocumentFormValues>({
    defaultValues: {
      title: '',
      description: '',
      category: '',
      tags: [],
      file: null,
      displayAuthor: true,
      allowComment: true,
      allowLike: true
    }
  })

  const { handleSubmit, control } = form

  const onSubmit = async (data: DocumentFormValues) => {
    setIsSubmitting(true)
    try {
      // TODO: Implement document upload
      console.log('Document Form Submit:', data)

      // Dispatch success event
      window.dispatchEvent(
        new CustomEvent('com.newwork.form.success', {
          detail: { documentId: 'new' }
        })
      )
    } catch (error) {
      console.error('Document form error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      form.setValue('file', file)
    }
  }

  if (typesLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-screen">
        <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-primary"></div>
      </div>
    )
  }

  return (
    <div className="gba:max-w-4xl gba:mx-auto gba:p-6" data-testid="document-form">
      <h1 className="gba:text-2xl gba:font-bold gba:mb-6 gba:text-foreground">
        {context.documentId ? t('edit_document') : t('upload_document')}
      </h1>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="gba:space-y-6">
          {/* File Upload */}
          <div className="gba:border gba:border-border gba:rounded-lg gba:p-6 gba:bg-muted/50">
            <FormLabel>{t('fields.document_file')}</FormLabel>
            <div className="gba:mt-2">
              <input
                type="file"
                onChange={handleFileChange}
                className="gba:w-full"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                data-testid="document-form-file-input"
              />
              {selectedFile && (
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">
                  {t('selected_file')}: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>

          {/* Category */}
          <FormField
            control={control}
            name="category"
            rules={{ required: t('validations.category_required') }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.category')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="document-form-category-select">
                      <SelectValue placeholder={t('fields.select_category')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Title */}
          <FormField
            control={control}
            name="title"
            rules={{ required: t('validations.title_required') }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.title')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t('fields.title_placeholder')}
                    data-testid="document-form-title-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={control}
            name="description"
            rules={{ required: t('validations.description_required') }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.description')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={t('fields.description_placeholder')}
                    rows={4}
                    data-testid="document-form-description-textarea"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Settings */}
          <div className="gba:grid gba:grid-cols-3 gba:gap-4">
            <FormField
              control={control}
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
              control={control}
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
              control={control}
              name="allowLike"
              render={({ field }) => (
                <FormItem className="gba:flex gba:items-center gba:justify-between gba:space-y-0 gba:p-4 gba:border gba:border-border gba:rounded-lg">
                  <FormLabel>{t('fields.allow_likes')}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Form Actions */}
          <div className="gba:flex gba:justify-end gba:gap-4 gba:pt-6 gba:border-t gba:border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('com.newwork.form.cancel'))
              }}
              data-testid="document-form-cancel-button"
            >
              {t('actions.cancel')}
            </Button>
            <Button type="submit" variant="default" disabled={isSubmitting} data-testid="document-form-submit-button">
              {isSubmitting ? t('actions.uploading') : t('actions.upload')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default DocumentForm
