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
import { useContentTags } from '@/business-apps/core/content/apps/content-hub/hooks/useContentTags'
import { useContentGroups } from '@/business-apps/core/content/apps/content-hub/hooks/useContentGroups'
import { useContentTypes } from '@/business-apps/core/content/apps/content-hub/hooks/useContentTypes'
import { ContentFormVals } from '@/business-apps/core/content/apps/content-hub/types/content.types'

export interface ContentFormProps extends BusinessAppContextProps {
  contentId?: string
}

const ContentForm: React.FC<ContentFormProps> = context => {
  const { t } = useTranslation('content')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { isLoading: tagsLoading } = useContentTags(context.accessToken)
  const { groupValues, isLoading: groupsLoading } = useContentGroups(context.accessToken)
  const { isLoading: typesLoading } = useContentTypes(context.accessToken)

  const form = useForm<ContentFormVals>({
    defaultValues: {
      id: context.contentId || '',
      title: '',
      previewText: '',
      content: '',
      articleGroupRef: '',
      articleTypeRef: '',
      tags: [],
      contentImage: null,
      displayAuthor: true,
      allowComment: true,
      allowLike: true,
      author: null,
      authorId: context.userInfo?.employeeDetails?.employeeId || '',
      schedulePublication: false,
      startDate: null,
      endDate: null,
      status: 'draft'
    }
  })

  const { handleSubmit, control, watch } = form
  const watchArticleGroup = watch('articleGroupRef')

  const onSubmit = async (data: ContentFormVals) => {
    setIsSubmitting(true)
    try {
      // TODO: Implement content creation/update
      console.log('Content Form Submit:', data)

      // Dispatch success event
      window.dispatchEvent(
        new CustomEvent('com.newwork.form.success', {
          detail: { contentId: data.id || 'new' }
        })
      )
    } catch (error) {
      console.error('Content form error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = tagsLoading || groupsLoading || typesLoading

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-screen">
        <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-primary"></div>
      </div>
    )
  }

  return (
    <div className="gba:max-w-4xl gba:mx-auto gba:p-6" data-testid="content-form">
      <h1 className="gba:text-2xl gba:font-bold gba:mb-6 gba:text-foreground">
        {context.contentId ? t('edit_content') : t('create_content')}
      </h1>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="gba:space-y-6">
          {/* Content Group Selection */}
          <FormField
            control={control}
            name="articleGroupRef"
            rules={{ required: t('validations.group_required') }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.content_group')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="content-form-group-select">
                      <SelectValue placeholder={t('fields.select_group')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {groupValues.map(group => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Content Type Selection */}
          {watchArticleGroup && (
            <FormField
              control={control}
              name="articleTypeRef"
              rules={{ required: t('validations.type_required') }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.content_type')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="content-form-type-select">
                        <SelectValue placeholder={t('fields.select_type')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {typeValues
                        .filter(type => type.parentEntryId === watchArticleGroup)
                        .map(type => (
                          <SelectItem key={type.id} value={type.name}>
                            {type.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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
                    data-testid="content-form-title-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Preview Text */}
          <FormField
            control={control}
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
                    data-testid="content-form-preview-textarea"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Content Editor - Simplified for now */}
          <FormField
            control={control}
            name="content"
            rules={{ required: t('validations.content_required') }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.content')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={t('fields.content_placeholder')}
                    rows={10}
                    data-testid="content-form-content-textarea"
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
              data-testid="content-form-cancel-button"
            >
              {t('actions.cancel')}
            </Button>
            <Button type="submit" variant="default" disabled={isSubmitting} data-testid="content-form-submit-button">
              {isSubmitting ? t('actions.saving') : t('actions.save')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default ContentForm
