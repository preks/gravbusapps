import React, { useMemo } from 'react'
import { Control, useWatch } from 'react-hook-form'
import {
  Combobox,
  DateInput,
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
import ReactQuill from 'react-quill'
import { TableHandler } from '../quillTableSetup'
import { ContentEntryFormValues } from '../ContentEntryWindow'
import { ContentAiTextGenerator } from '../components/ContentAiTextGenerator'
import { CONTENT_GROUP_VALUES, CONTENT_GROUP_KEY } from '@/common/data/content/constants/contentConstants'
import { useContentTypeSelect } from '@/common/data/content/hooks/useContentTypeSelect'
import { useContentCategorySelect } from '@/common/data/content/hooks/useContentCategorySelect'
import { useContentTagSelect } from '@/common/data/content/hooks/useContentTagSelect'
import translations from '../_i18n'

interface PolicyAiTextGeneratorWrapperProps {
  control: Control<ContentEntryFormValues>
  watchTitle: string
  watchPreview: string
  watchContentTypeId?: string
  watchContentCategoryIds?: string[]
  watchContentTagIds?: string[]
  setValue: (name: keyof ContentEntryFormValues, value: any) => void
  context: any
  extractedContentGroup?: string | null
  onContentTypeIdChange?: (value: string | undefined) => void
  onContentCategoryIdsChange?: (ids: string[]) => void
  onContentTagIdsChange?: (ids: string[]) => void
}

const PolicyAiTextGeneratorWrapper = React.memo(function PolicyAiTextGeneratorWrapper({
  control,
  watchTitle,
  watchPreview,
  watchContentTypeId,
  watchContentCategoryIds,
  watchContentTagIds,
  setValue,
  context,
  extractedContentGroup,
  onContentTypeIdChange,
  onContentCategoryIdsChange,
  onContentTagIdsChange
}: PolicyAiTextGeneratorWrapperProps) {
  const content = useWatch({ control, name: 'content' })
  return (
    <ContentAiTextGenerator
      title={watchTitle || ''}
      previewText={watchPreview || ''}
      content={content || ''}
      onTitleChange={value => setValue('title', value)}
      onPreviewTextChange={value => setValue('preview', value)}
      onContentChange={value => setValue('content', value)}
      accessToken={context.accessToken || ''}
      context={context}
      contentGroup={extractedContentGroup}
      contentTypeId={watchContentTypeId}
      contentCategoryIds={watchContentCategoryIds || []}
      contentTagIds={watchContentTagIds || []}
      onContentTypeIdChange={onContentTypeIdChange}
      onContentCategoryIdsChange={onContentCategoryIdsChange}
      onContentTagIdsChange={onContentTagIdsChange}
    />
  )
})

interface PolicySegmentProps {
  control: Control<ContentEntryFormValues>
  watchTitle: string
  watchPreview: string
  watchContentTypeId?: string
  watchContentCategoryIds?: string[]
  watchContentCategoryNames?: string[]
  watchContentTagIds?: string[]
  watchContentTagNames?: string[]
  setValue: (name: keyof ContentEntryFormValues, value: any) => void
  context: any
  extractedContentGroup?: string | null
  onContentTypeIdChange?: (value: string | undefined) => void
  onContentCategoryIdsChange?: (ids: string[]) => void
  onContentTagIdsChange?: (ids: string[]) => void
}

export const PolicySegment: React.FC<PolicySegmentProps> = React.memo(
  ({
    control,
    watchTitle,
    watchPreview,
    watchContentTypeId,
    watchContentCategoryIds,
    watchContentCategoryNames,
    watchContentTagIds,
    watchContentTagNames,
    setValue,
    context,
    extractedContentGroup,
    onContentTypeIdChange,
    onContentCategoryIdsChange,
    onContentTagIdsChange
  }) => {
    const { t } = useTranslation(translations)

    const watchContentGroup = useWatch({ control, name: 'contentGroup' })
    const activeGroup = extractedContentGroup || watchContentGroup

    const {
      options: contentTypeOptions,
      isLoading: typesLoading,
      isReady: typeOptionsReady,
      setSearch: setTypeSearch,
      hasMore: typeHasMore,
      loadMore: loadMoreTypes,
      component: typeComponent
    } = useContentTypeSelect(context.accessToken, activeGroup, watchContentTypeId ? [watchContentTypeId] : [])

    const {
      options: categoryOptions,
      isLoading: categoriesLoading,
      isReady: categoryOptionsReady,
      setSearch: setCategorySearch,
      hasMore: categoryHasMore,
      loadMore: loadMoreCategories
    } = useContentCategorySelect(context.accessToken, watchContentCategoryIds || [])

    const {
      options: tagOptions,
      isLoading: tagsLoading,
      isReady: tagOptionsReady,
      setSearch: setTagSearch,
      hasMore: tagHasMore,
      loadMore: loadMoreTags
    } = useContentTagSelect(context.accessToken, watchContentTagIds || [])

    const createdCategoryOptions = useMemo(
      () => (watchContentCategoryNames || []).map(name => ({ value: name, label: name })),
      [watchContentCategoryNames]
    )
    const createdTagOptions = useMemo(
      () => (watchContentTagNames || []).map(name => ({ value: name, label: name })),
      [watchContentTagNames]
    )
    const displayedCategoryValues = useMemo(
      () => [...(watchContentCategoryIds || []), ...(watchContentCategoryNames || [])],
      [watchContentCategoryIds, watchContentCategoryNames]
    )
    const displayedTagValues = useMemo(
      () => [...(watchContentTagIds || []), ...(watchContentTagNames || [])],
      [watchContentTagIds, watchContentTagNames]
    )
    const categoryOptionValues = useMemo(() => new Set(categoryOptions.map(option => option.value)), [categoryOptions])
    const tagOptionValues = useMemo(() => new Set(tagOptions.map(option => option.value)), [tagOptions])

    const quillModules = useMemo(
      () => ({
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
          ['link', 'image', 'video'],
          [TableHandler.toolName],
          ['clean']
        ],
        [TableHandler.moduleName]: { fullWidth: true, customButton: 'Insert table', dragResize: false }
      }),
      []
    )

    return (
      <div className="gba:flex gba:flex-1 gba:flex-col gba:gap-6 gba:overflow-hidden">
        <div className="gba:flex-1 gba:flex gba:flex-col gba:space-y-4">
          <div className="gba:flex gba:justify-end gba:mb-4">
            <PolicyAiTextGeneratorWrapper
              control={control}
              watchTitle={watchTitle}
              watchPreview={watchPreview}
              watchContentTypeId={watchContentTypeId}
              watchContentCategoryIds={watchContentCategoryIds}
              watchContentTagIds={watchContentTagIds}
              setValue={setValue}
              context={context}
              extractedContentGroup={extractedContentGroup}
              onContentTypeIdChange={onContentTypeIdChange}
              onContentCategoryIdsChange={onContentCategoryIdsChange}
              onContentTagIdsChange={onContentTagIdsChange}
            />
          </div>

          <FormFieldGroup>
            {!extractedContentGroup && (
              <FormField
                control={control as any}
                name="contentGroup"
                rules={{ required: t('group-required') }}
                render={({ field }) => (
                  <FormItem className="gba:flex-1">
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
                <FormItem className="gba:flex-1">
                  <FormLabel>{t('content-type')}</FormLabel>
                  <FormControl>
                    {typeComponent === 'select' ? (
                      <Select
                        key={typeOptionsReady ? 'resolved' : 'resolving'}
                        value={typeOptionsReady ? field.value || '' : ''}
                        onValueChange={field.onChange}
                        disabled={!activeGroup || typesLoading}
                      >
                        <SelectTrigger data-testid="content-entry-window-type-select">
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
                        data-testid="content-entry-window-type-select"
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormFieldGroup>

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
                    placeholder={t('policy-title-placeholder') || 'Enter policy title...'}
                    className="gba:text-2xl gba:font-bold"
                    data-testid="content-entry-window-title-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control as any}
            name="preview"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('preview-text') || 'Preview Text'}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={t('policy-preview-placeholder') || 'Brief summary of the policy...'}
                    rows={3}
                    data-testid="content-entry-window-preview-textarea"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="gba:flex-1 gba:flex gba:flex-col gba:border-t gba:border-border gba:overflow-hidden gba:min-h-0">
            <style>{`
            .ql-editor { min-height: 50px; }
            .ql-table { border-collapse: separate; table-layout: fixed; }
            .ql-table[data-full] { width: 100%; }
            .ql-table-wrapper { width: 100%; padding-left: 1px; padding-right: 1px; overflow: auto; }
            .ql-table-cell { padding: 8px 12px; border: 1px solid #a1a1aa; font-size: 0.875rem; outline: 0; overflow: auto; }
            .ql-table-cell-inner { display: inline-block; min-width: 100%; word-break: break-word; }
            .ql-table col { border-collapse: separate; text-indent: initial; display: table-column; table-layout: fixed; }
            .ql-table-operation-menu { background: #fff; border-radius: 6px; box-shadow: 0 2px 12px 0 rgba(0,0,0,.1); width: 200px; overflow: auto; font-size: 0.875rem; z-index: 1; }
            .ql-table-operation-menu-item { display: flex; align-items: center; padding: 10px 16px; cursor: pointer; color: #595959; }
            .ql-table-operation-menu-item:hover { background: #f5f5f5; }
            .ql-table-operation-menu-dividing { height: 1px; background: #efefef; }
            .ql-table-selection_line { display: none; position: absolute; border: 2px solid; pointer-events: none; }
          `}</style>
            <FormField
              control={control as any}
              name="content"
              rules={{ required: t('content-required') || 'Content is required' }}
              render={({ field }) => (
                <FormItem className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0">
                  <FormLabel>{t('content') || 'Content'}</FormLabel>
                  <FormControl>
                    <ReactQuill
                      theme="snow"
                      value={field.value || ''}
                      onChange={field.onChange}
                      modules={quillModules}
                      placeholder={t('policy-content-placeholder') || 'Write the policy content here...'}
                      className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:overflow-hidden"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
                      value={categoryOptionsReady ? displayedCategoryValues : watchContentCategoryNames || []}
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
                        if ((watchContentCategoryNames || []).includes(trimmedName)) return
                        setValue('contentCategoryNames', [...(watchContentCategoryNames || []), trimmedName])
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
                      data-testid="content-entry-window-categories-select"
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
                      value={tagOptionsReady ? displayedTagValues : watchContentTagNames || []}
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
                        if ((watchContentTagNames || []).includes(trimmedName)) return
                        setValue('contentTagNames', [...(watchContentTagNames || []), trimmedName])
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
                      data-testid="content-entry-window-tags-select"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormFieldGroup>
        </div>

        <div className="gba:flex gba:flex-col gba:gap-6 gba:flex-shrink-0 gba:overflow-y-auto gba:transition-all gba:duration-300 gba:border-border gba:w-full gba:pt-4 gba:border-t">
          <div className="gba:space-y-4">
            <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
              {t('policy-validity-period') || 'Policy Validity Period'}
            </div>

            <FormFieldGroup>
              <FormField
                control={control as any}
                name="activeFrom"
                render={({ field }) => (
                  <FormItem className="gba:flex-1">
                    <FormLabel>{t('policy-valid-from') || 'Valid From'}</FormLabel>
                    <FormControl>
                      <DateInput
                        type="date"
                        value={field.value ?? ''}
                        onChange={value => field.onChange(value == null || value === '' ? null : value)}
                        outputFormat="iso"
                        data-testid="content-entry-window-start-date-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control as any}
                name="activeTo"
                render={({ field }) => (
                  <FormItem className="gba:flex-1">
                    <FormLabel>{t('policy-valid-to') || 'Valid To'}</FormLabel>
                    <FormControl>
                      <DateInput
                        type="date"
                        value={field.value ?? ''}
                        onChange={value => field.onChange(value == null || value === '' ? null : value)}
                        outputFormat="iso"
                        data-testid="content-entry-window-end-date-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormFieldGroup>
          </div>

          <FormField
            control={control as any}
            name="displayCreator"
            render={({ field }) => (
              <FormItem className="gba:flex gba:items-center gba:gap-2 gba:space-y-0">
                <FormLabel className="gba:text-sm">{t('display-author') || 'Display Author'}</FormLabel>
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={e => field.onChange(e.target.checked)}
                    className="gba:ml-auto"
                    data-testid="content-entry-window-display-author-toggle"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </div>
    )
  }
)

export default PolicySegment
