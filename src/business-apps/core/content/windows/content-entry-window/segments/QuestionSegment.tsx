import React from 'react'
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
  useTranslation
} from '@newwork/nw-design-system'
import { ContentEntryFormValues } from '../ContentEntryWindow'
import { CONTENT_GROUP_VALUES, CONTENT_GROUP_KEY } from '@/common/data/content/constants/contentConstants'
import { useContentTypeOptions } from '@/common/data/content/hooks/useContentTypeOptions'
import { useContentCategoryOptions } from '@/common/data/content/hooks/useContentCategoryOptions'
import { useContentTagOptions } from '@/common/data/content/hooks/useContentTagOptions'
import { TaxonomyMultiSelect } from '@/components/taxonomy-multi-select/TaxonomyMultiSelect'
import translations from '../_i18n'

interface QuestionSegmentProps {
  control: Control<ContentEntryFormValues>
  accessToken?: string
  extractedContentGroup?: string | null
  onCreateCategory?: (label: string) => Promise<string>
  onCreateTag?: (label: string) => Promise<string>
  onCategoriesChange?: (categories: string[]) => void
  onTagsChange?: (tags: string[]) => void
}

export const QuestionSegment: React.FC<QuestionSegmentProps> = ({
  control,
  accessToken,
  extractedContentGroup,
  onCreateCategory,
  onCreateTag,
  onCategoriesChange,
  onTagsChange
}) => {
  const { t } = useTranslation(translations)

  const watchContentGroup = useWatch({ control, name: 'contentGroup' })
  const activeGroup = extractedContentGroup || watchContentGroup

  const { options: contentTypeOptions, isLoading: typesLoading } = useContentTypeOptions(accessToken, activeGroup)
  const { options: categoryOptions, isLoading: categoriesLoading } = useContentCategoryOptions(accessToken)
  const { options: tagOptions, isLoading: tagsLoading } = useContentTagOptions(accessToken)

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
            <FormItem>
              <FormLabel>{t('content-type')}</FormLabel>
              <FormControl>
                <Select
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  disabled={!activeGroup || typesLoading}
                >
                  <SelectTrigger data-testid="question-segment-type-select">
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

      <FormField
        control={control as any}
        name="title"
        rules={{ required: t('title-required') || 'Question title is required' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('question-title') || 'Question Title'}</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t('question-title-placeholder') || 'What is your question?'}
                data-testid="question-segment-title-input"
              />
            </FormControl>
            <FormMessage />
            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
              {t('question-title-hint') || 'Be specific and clear. Ask as if you are asking a person.'}
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={control as any}
        name="previewText"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('summary') || 'Summary'}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={t('summary-placeholder') || 'Brief summary of your question...'}
                rows={2}
                data-testid="question-segment-preview-textarea"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control as any}
        name="content"
        rules={{ required: t('content-required') || 'Question details are required' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('question-details') || 'Question Details'}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={
                  t('question-details-placeholder') ||
                  'Include all relevant details, what you have tried, and specific context...'
                }
                rows={10}
                className="gba:font-mono gba:text-sm"
                data-testid="question-segment-content-textarea"
              />
            </FormControl>
            <FormMessage />
            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
              {t('question-details-hint') || 'Provide enough context so others can understand and answer.'}
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
                  data-testid="question-segment-categories-select"
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
                  data-testid="question-segment-tags-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormFieldGroup>

      <input type="hidden" {...(control as any).register('allowComment')} value="true" />
      <input type="hidden" {...(control as any).register('allowReaction')} value="true" />
    </div>
  )
}

export default QuestionSegment
