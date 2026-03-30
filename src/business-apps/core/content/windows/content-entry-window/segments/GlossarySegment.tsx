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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { ContentEntryFormValues } from '../ContentEntryWindow'
import { CONTENT_GROUP_OPTIONS } from '@/common/data/content/constants/contentGroupConstants'
import { useContentCategoryOptions } from '@/common/data/content/hooks/useContentCategoryOptions'
import { useContentTagOptions } from '@/common/data/content/hooks/useContentTagOptions'
import { TaxonomyMultiSelect } from '@/components/taxonomy-multi-select/TaxonomyMultiSelect'
import translations from '../_i18n'

interface GlossarySegmentProps {
  control: Control<ContentEntryFormValues>
  accessToken?: string
  extractedContentGroup?: string | null
  onCreateCategory?: (label: string) => Promise<string>
  onCreateTag?: (label: string) => Promise<string>
  onCategoriesChange?: (categories: string[]) => void
  onTagsChange?: (tags: string[]) => void
}

export const GlossarySegment: React.FC<GlossarySegmentProps> = ({
  control,
  accessToken,
  extractedContentGroup,
  onCreateCategory,
  onCreateTag,
  onCategoriesChange,
  onTagsChange
}) => {
  const { t } = useTranslation(translations)

  const { options: categoryOptions, isLoading: categoriesLoading } = useContentCategoryOptions(accessToken)
  const { options: tagOptions, isLoading: tagsLoading } = useContentTagOptions(accessToken)

  return (
    <div className="gba:space-y-6">
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
                  <SelectTrigger data-testid="glossary-segment-group-select">
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

      <FormFieldGroup>
        <FormField
          control={control as any}
          name="categories"
          render={({ field }) => (
            <FormItem className="gba:flex-1">
              <FormLabel>{t('categories') || 'Categories'}</FormLabel>
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
                  data-testid="glossary-segment-categories-select"
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
              <FormLabel>{t('tags') || 'Tags'}</FormLabel>
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
                  data-testid="glossary-segment-tags-select"
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

export default GlossarySegment
