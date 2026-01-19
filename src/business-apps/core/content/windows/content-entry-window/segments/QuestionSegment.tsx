import React from 'react'
import { Control } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormFieldGroup,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { CatalogSelect } from '@/components/catalog-select'
import { ContentEntryFormValues } from '../ContentEntryWindow'
import translations from '../_i18n'

interface QuestionSegmentProps {
  control: Control<ContentEntryFormValues>
  extractedContentGroupRef?: string
  onCreateCategory?: (label: string) => Promise<string>
  onCreateTag?: (label: string) => Promise<string>
  onCategoriesChange?: (categories: string[]) => void
  onTagsChange?: (tags: string[]) => void
}

/**
 * QuestionSegment - Form segment for Q&A content
 * Features: Simple title, summary, detailed description, tags, categories
 * Similar to Stack Overflow, Quora question forms
 */
export const QuestionSegment: React.FC<QuestionSegmentProps> = ({
  control,
  extractedContentGroupRef,
  onCreateCategory,
  onCreateTag,
  onCategoriesChange,
  onTagsChange
}) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:space-y-6">
      {/* Content Group and Content Type - Above Question Title */}
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
            <FormItem>
              <FormLabel>{t('content-type')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier="ContentType:v1"
                  parentField="contentGroupRef"
                  requireSourceForEnable={true}
                  value={field.value || null}
                  onValueChange={field.onChange}
                  data-testid="question-segment-type-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Question Title */}
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

      {/* Preview Text / Summary - Between Title and Question Details */}
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

      {/* Question Details */}
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

      {/* Categories and Tags - Below Question Details */}
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
                  data-testid="question-segment-categories-select"
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
                  data-testid="question-segment-tags-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormFieldGroup>

      {/* Hidden fields - Answers and Voting always enabled for questions */}
      <input type="hidden" {...(control as any).register('allowComment')} value="true" />
      <input type="hidden" {...(control as any).register('allowReaction')} value="true" />
    </div>
  )
}

export default QuestionSegment
