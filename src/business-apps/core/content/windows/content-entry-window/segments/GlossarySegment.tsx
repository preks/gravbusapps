import React from 'react'
import { Control, useWatch } from 'react-hook-form'
import {
  Combobox,
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
import { useContentCategorySelect } from '@/common/data/content/hooks/useContentCategorySelect'
import { useContentTagSelect } from '@/common/data/content/hooks/useContentTagSelect'
import translations from '../_i18n'

interface GlossarySegmentProps {
  control: Control<ContentEntryFormValues>
  setValue: (name: keyof ContentEntryFormValues, value: any) => void
  accessToken?: string
  extractedContentGroup?: string | null
}

export const GlossarySegment: React.FC<GlossarySegmentProps> = ({
  control,
  setValue,
  accessToken,
  extractedContentGroup
}) => {
  const { t } = useTranslation(translations)

  const watchedContentCategoryIds = useWatch({ control, name: 'contentCategoryIds' })
  const watchedContentCategoryNames = useWatch({ control, name: 'contentCategoryNames' })
  const watchedContentTagIds = useWatch({ control, name: 'contentTagIds' })
  const watchedContentTagNames = useWatch({ control, name: 'contentTagNames' })

  const {
    options: categoryOptions,
    isLoading: categoriesLoading,
    isReady: categoryOptionsReady,
    setSearch: setCategorySearch,
    hasMore: categoryHasMore,
    loadMore: loadMoreCategories
  } = useContentCategorySelect(accessToken, watchedContentCategoryIds || [])

  const {
    options: tagOptions,
    isLoading: tagsLoading,
    isReady: tagOptionsReady,
    setSearch: setTagSearch,
    hasMore: tagHasMore,
    loadMore: loadMoreTags
  } = useContentTagSelect(accessToken, watchedContentTagIds || [])

  const createdCategoryOptions = (watchedContentCategoryNames || []).map(name => ({ value: name, label: name }))
  const createdTagOptions = (watchedContentTagNames || []).map(name => ({ value: name, label: name }))
  const displayedCategoryValues = [...(watchedContentCategoryIds || []), ...(watchedContentCategoryNames || [])]
  const displayedTagValues = [...(watchedContentTagIds || []), ...(watchedContentTagNames || [])]
  const categoryOptionValues = new Set(categoryOptions.map(option => option.value))
  const tagOptionValues = new Set(tagOptions.map(option => option.value))

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
        name="preview"
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
          name="contentCategoryIds"
          render={({ field }) => (
            <FormItem className="gba:flex-1">
              <FormLabel>{t('categories') || 'Categories'}</FormLabel>
              <FormControl>
                <Combobox
                  mode="tags"
                  options={categoryOptions}
                  value={categoryOptionsReady ? displayedCategoryValues : watchedContentCategoryNames || []}
                  onValueChange={(next: string[]) => {
                    field.onChange(next.filter(value => categoryOptionValues.has(value)))
                    setValue(
                      'contentCategoryNames',
                      next.filter(value => !categoryOptionValues.has(value))
                    )
                  }}
                  onCreateTag={rawName => {
                    const trimmedName = rawName.trim()
                    if (!trimmedName) return
                    if ((watchedContentCategoryNames || []).includes(trimmedName)) return
                    setValue('contentCategoryNames', [...(watchedContentCategoryNames || []), trimmedName])
                  }}
                  createdOptions={createdCategoryOptions}
                  placeholder="Select categories..."
                  searchPlaceholder="Search or create..."
                  emptyText={categoriesLoading ? 'Loading...' : 'No results'}
                  loading={categoriesLoading}
                  onSearch={setCategorySearch}
                  searchDebounce={300}
                  onLoadMore={loadMoreCategories}
                  hasMore={categoryHasMore}
                  data-testid="glossary-segment-categories-select"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control as any}
          name="contentTagIds"
          render={({ field }) => (
            <FormItem className="gba:flex-1">
              <FormLabel>{t('tags') || 'Tags'}</FormLabel>
              <FormControl>
                <Combobox
                  mode="tags"
                  options={tagOptions}
                  value={tagOptionsReady ? displayedTagValues : watchedContentTagNames || []}
                  onValueChange={(next: string[]) => {
                    field.onChange(next.filter(value => tagOptionValues.has(value)))
                    setValue(
                      'contentTagNames',
                      next.filter(value => !tagOptionValues.has(value))
                    )
                  }}
                  onCreateTag={rawName => {
                    const trimmedName = rawName.trim()
                    if (!trimmedName) return
                    if ((watchedContentTagNames || []).includes(trimmedName)) return
                    setValue('contentTagNames', [...(watchedContentTagNames || []), trimmedName])
                  }}
                  createdOptions={createdTagOptions}
                  placeholder="Select tags..."
                  searchPlaceholder="Search or create..."
                  emptyText={tagsLoading ? 'Loading...' : 'No results'}
                  loading={tagsLoading}
                  onSearch={setTagSearch}
                  searchDebounce={300}
                  onLoadMore={loadMoreTags}
                  hasMore={tagHasMore}
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
