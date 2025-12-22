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

interface GlossarySegmentProps {
  control: Control<ContentEntryFormValues>
  extractedContentGroupRef?: string
  onCreateCategory?: (label: string) => Promise<string>
  onCreateTag?: (label: string) => Promise<string>
  onCategoriesChange?: (categories: string[]) => void
  onTagsChange?: (tags: string[]) => void
}

/**
 * GlossarySegment - Form segment for Glossary terms
 * Features: Term (title), Definition (content), Examples (preview), Tags
 * Simplified form focused on term definitions
 */
export const GlossarySegment: React.FC<GlossarySegmentProps> = ({
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
                  data-testid="glossary-segment-group-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Term (Title) */}
      <FormField
        control={control as any}
        name="title"
        rules={{ required: t('glossary-term-required') || 'Term is required' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('glossary-term') || 'Term'}</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t('glossary-term-placeholder') || 'Enter the term (e.g., "API", "SLA")'}
                data-testid="glossary-segment-term-input"
              />
            </FormControl>
            <FormMessage />
            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
              {t('glossary-term-hint') || 'The word, phrase, or acronym to define'}
            </div>
          </FormItem>
        )}
      />

      {/* Definition (Content) - Optional to allow "Request term" workflow */}
      <FormField
        control={control as any}
        name="content"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('glossary-definition') || 'Definition'}
              <span className="gba:text-muted-foreground gba:font-normal gba:ml-1">
                ({t('optional') || 'optional'})
              </span>
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={t('glossary-definition-placeholder') || 'Provide a clear, concise definition...'}
                rows={6}
                data-testid="glossary-segment-definition-textarea"
              />
            </FormControl>
            <FormMessage />
            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
              {t('glossary-definition-hint-optional') ||
                "Leave empty if you don't know the definition - someone else can fill it in later"}
            </div>
          </FormItem>
        )}
      />

      {/* Examples / Additional Context (Preview Text) */}
      <FormField
        control={control as any}
        name="previewText"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('glossary-examples') || 'Examples (optional)'}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={t('glossary-examples-placeholder') || 'Add usage examples or additional context...'}
                rows={3}
                data-testid="glossary-segment-examples-textarea"
              />
            </FormControl>
            <FormMessage />
            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
              {t('glossary-examples-hint') || 'Help others understand how this term is used in practice'}
            </div>
          </FormItem>
        )}
      />

      {/* Categories and Tags */}
      <FormFieldGroup>
        {/* Categories */}
        <FormField
          control={control as any}
          name="categories"
          render={({ field }) => (
            <FormItem className="gba:flex-1">
              <FormLabel>{t('categories') || 'Categories'}</FormLabel>
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
                  data-testid="glossary-segment-categories-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags */}
        <FormField
          control={control as any}
          name="tags"
          render={({ field }) => (
            <FormItem className="gba:flex-1">
              <FormLabel>{t('tags') || 'Tags'}</FormLabel>
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
                  data-testid="glossary-segment-tags-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormFieldGroup>

      {/* Hidden fields - Comments and Reactions enabled for glossary terms */}
      <input type="hidden" {...(control as any).register('allowComment')} value="true" />
      <input type="hidden" {...(control as any).register('allowReaction')} value="true" />

      {/* Hidden contentGroupRef - ensure it's always submitted when provided via context */}
      {extractedContentGroupRef && (
        <input type="hidden" {...(control as any).register('contentGroupRef')} value={extractedContentGroupRef} />
      )}
    </div>
  )
}

export default GlossarySegment
