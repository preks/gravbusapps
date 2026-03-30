import React, { useMemo } from 'react'
import { Control, useWatch } from 'react-hook-form'
import {
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
import { CONTENT_GROUP_OPTIONS } from '@/common/data/content/constants/contentGroupConstants'
import { useContentTypeOptions } from '@/common/data/content/hooks/useContentTypeOptions'
import { useContentCategoryOptions } from '@/common/data/content/hooks/useContentCategoryOptions'
import { useContentTagOptions } from '@/common/data/content/hooks/useContentTagOptions'
import { TaxonomyMultiSelect } from '@/components/taxonomy-multi-select/TaxonomyMultiSelect'
import translations from '../_i18n'

interface PolicyAiTextGeneratorWrapperProps {
  control: Control<ContentEntryFormValues>
  watchTitle: string
  watchPreviewText: string
  watchContentTypeId?: string
  watchCategories?: string[]
  watchTags?: string[]
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
  watchPreviewText,
  watchContentTypeId,
  watchCategories,
  watchTags,
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
      previewText={watchPreviewText || ''}
      content={content || ''}
      onTitleChange={value => setValue('title', value)}
      onPreviewTextChange={value => setValue('previewText', value)}
      onContentChange={value => setValue('content', value)}
      accessToken={context.accessToken || ''}
      context={context}
      contentGroup={extractedContentGroup}
      contentTypeId={watchContentTypeId}
      contentCategoryIds={watchCategories || []}
      contentTagIds={watchTags || []}
      onContentTypeIdChange={onContentTypeIdChange}
      onContentCategoryIdsChange={onContentCategoryIdsChange}
      onContentTagIdsChange={onContentTagIdsChange}
    />
  )
})

interface PolicySegmentProps {
  control: Control<ContentEntryFormValues>
  watchTitle: string
  watchPreviewText: string
  watchContentTypeId?: string
  watchCategories?: string[]
  watchTags?: string[]
  setValue: (name: keyof ContentEntryFormValues, value: any) => void
  context: any
  extractedContentGroup?: string | null
  onCreateCategory?: (label: string) => Promise<string>
  onCreateTag?: (label: string) => Promise<string>
  onCategoriesChange?: (categories: string[]) => void
  onTagsChange?: (tags: string[]) => void
  onContentTypeIdChange?: (value: string | undefined) => void
  onContentCategoryIdsChange?: (ids: string[]) => void
  onContentTagIdsChange?: (ids: string[]) => void
}

export const PolicySegment: React.FC<PolicySegmentProps> = React.memo(
  ({
    control,
    watchTitle,
    watchPreviewText,
    watchContentTypeId,
    watchCategories,
    watchTags,
    setValue,
    context,
    extractedContentGroup,
    onCreateCategory,
    onCreateTag,
    onCategoriesChange,
    onTagsChange,
    onContentTypeIdChange,
    onContentCategoryIdsChange,
    onContentTagIdsChange
  }) => {
    const { t } = useTranslation(translations)

    const watchContentGroup = useWatch({ control, name: 'contentGroup' })
    const activeGroup = extractedContentGroup || watchContentGroup

    const { options: contentTypeOptions, isLoading: typesLoading } = useContentTypeOptions(
      context.accessToken,
      activeGroup
    )
    const { options: categoryOptions, isLoading: categoriesLoading } = useContentCategoryOptions(context.accessToken)
    const { options: tagOptions, isLoading: tagsLoading } = useContentTagOptions(context.accessToken)

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
              watchPreviewText={watchPreviewText}
              watchContentTypeId={watchContentTypeId}
              watchCategories={watchCategories}
              watchTags={watchTags}
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
              name="contentTypeId"
              render={({ field }) => (
                <FormItem className="gba:flex-1">
                  <FormLabel>{t('content-type')}</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      disabled={!activeGroup || typesLoading}
                    >
                      <SelectTrigger data-testid="content-entry-window-type-select">
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
            name="previewText"
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
                      data-testid="content-entry-window-categories-select"
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
                name="startDate"
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
                name="endDate"
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
            name="displayAuthor"
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
