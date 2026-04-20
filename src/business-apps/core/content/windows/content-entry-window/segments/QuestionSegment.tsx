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
import { useContentTypeSelect } from '@/common/data/content/hooks/useContentTypeSelect'
import { useContentCategorySelect } from '@/common/data/content/hooks/useContentCategorySelect'
import { useContentTagSelect } from '@/common/data/content/hooks/useContentTagSelect'
import translations from '../_i18n'

interface QuestionSegmentProps {
  control: Control<ContentEntryFormValues>
  setValue: (name: keyof ContentEntryFormValues, value: any) => void
  accessToken?: string
  extractedContentGroup?: string | null
}

export const QuestionSegment: React.FC<QuestionSegmentProps> = ({
  control,
  setValue,
  accessToken,
  extractedContentGroup
}) => {
  const { t } = useTranslation(translations)

  const watchContentGroup = useWatch({ control, name: 'contentGroup' })
  const watchContentTypeId = useWatch({ control, name: 'contentTypeId' })
  const watchedContentCategoryIds = useWatch({ control, name: 'contentCategoryIds' })
  const watchedContentCategoryNames = useWatch({ control, name: 'contentCategoryNames' })
  const watchedContentTagIds = useWatch({ control, name: 'contentTagIds' })
  const watchedContentTagNames = useWatch({ control, name: 'contentTagNames' })
  const activeGroup = extractedContentGroup || watchContentGroup

  const {
    options: contentTypeOptions,
    isLoading: typesLoading,
    isReady: typeOptionsReady,
    setSearch: setTypeSearch,
    hasMore: typeHasMore,
    loadMore: loadMoreTypes,
    component: typeComponent
  } = useContentTypeSelect(accessToken, activeGroup, watchContentTypeId ? [watchContentTypeId] : [])

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
                {typeComponent === 'select' ? (
                  <Select
                    key={typeOptionsReady ? 'resolved' : 'resolving'}
                    value={typeOptionsReady ? field.value || '' : ''}
                    onValueChange={field.onChange}
                    disabled={!activeGroup || typesLoading}
                  >
                    <SelectTrigger data-testid="question-segment-type-select">
                      <SelectValue placeholder={typesLoading ? 'Loading...' : t('select-type') || 'Select type'} />
                    </SelectTrigger>
                    <SelectContent>
                      {contentTypeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Combobox
                    key={typeOptionsReady ? 'resolved' : 'resolving'}
                    mode="default"
                    options={contentTypeOptions}
                    value={typeOptionsReady ? field.value || '' : ''}
                    onValueChange={(next: string) => field.onChange(next)}
                    placeholder={t('select-type') || 'Select type'}
                    searchPlaceholder="Search types..."
                    emptyText={typesLoading ? 'Loading...' : 'No results'}
                    loading={typesLoading}
                    onSearch={setTypeSearch}
                    searchDebounce={300}
                    onLoadMore={loadMoreTypes}
                    hasMore={typeHasMore}
                    disabled={!activeGroup}
                    data-testid="question-segment-type-select"
                  />
                )}
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
        name="preview"
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
          name="contentCategoryIds"
          render={({ field }) => (
            <FormItem className="gba:flex-1">
              <FormLabel>Categories</FormLabel>
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
                  data-testid="question-segment-categories-select"
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
              <FormLabel>Tags</FormLabel>
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
