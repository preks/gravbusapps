import React, { useMemo } from 'react'
import { Control } from 'react-hook-form'
import {
  DateInput,
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
import ReactQuill from 'react-quill'
import { CatalogSelect } from '@/components/catalog-select'
import { ContentEntryFormValues } from '../ContentEntryWindow'
import { ContentAiTextGenerator } from '../components/ContentAiTextGenerator'
import translations from '../_i18n'

interface PolicySegmentProps {
  control: Control<ContentEntryFormValues>
  watchTitle: string
  watchPreviewText: string
  watchContent: string
  watchContentTypeRef?: string
  watchCategories?: string[]
  watchTags?: string[]
  setValue: (name: keyof ContentEntryFormValues, value: any) => void
  context: any
  extractedContentGroupRef?: string
  onCreateCategory?: (label: string) => Promise<string>
  onCreateTag?: (label: string) => Promise<string>
  onCategoriesChange?: (categories: string[]) => void
  onTagsChange?: (tags: string[]) => void
  onContentTypeRefChange?: (value: string | undefined) => void
  onContentCategoryRefsChange?: (value: string[]) => void
  onContentCategoryNamesChange?: (value: string[]) => void
  onContentTagRefsChange?: (value: string[]) => void
  onContentTagNamesChange?: (value: string[]) => void
}

/**
 * PolicySegment - Form segment for Policies
 * Simplified version without picture upload, comments, reactions
 * Features: Title, Preview, Rich Text Editor, Validity Period (activeFrom/activeTo)
 */
export const PolicySegment: React.FC<PolicySegmentProps> = ({
  control,
  watchTitle,
  watchPreviewText,
  watchContent,
  watchContentTypeRef,
  watchCategories,
  watchTags,
  setValue,
  context,
  extractedContentGroupRef,
  onCreateCategory,
  onCreateTag,
  onCategoriesChange,
  onTagsChange,
  onContentTypeRefChange,
  onContentCategoryRefsChange,
  onContentCategoryNamesChange,
  onContentTagRefsChange,
  onContentTagNamesChange
}) => {
  const { t } = useTranslation(translations)

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
        ['link', 'image', 'video'],
        ['clean']
      ]
    }),
    []
  )

  const quillFormats = useMemo(
    () => ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'indent', 'link', 'image', 'video'],
    []
  )

  return (
    <div className="gba:flex gba:flex-1 gba:flex-col gba:gap-6 gba:overflow-hidden">
      {/* MAIN CONTENT */}
      <div className="gba:flex-1 gba:flex gba:flex-col gba:space-y-4">
        {/* AI Text Generator Button */}
        <div className="gba:flex gba:justify-end gba:mb-4">
          <ContentAiTextGenerator
            title={watchTitle || ''}
            previewText={watchPreviewText || ''}
            content={watchContent || ''}
            onTitleChange={value => setValue('title', value)}
            onPreviewTextChange={value => setValue('previewText', value)}
            onContentChange={value => setValue('content', value)}
            accessToken={context.accessToken || ''}
            context={context}
            contentGroupRef={extractedContentGroupRef}
            contentTypeRef={watchContentTypeRef}
            contentCategoryRefs={
              watchCategories?.filter(cat => {
                const parts = cat.split(':')
                return parts.length >= 2
              }) || []
            }
            contentCategoryNames={
              watchCategories?.filter(cat => {
                const parts = cat.split(':')
                return parts.length < 2
              }) || []
            }
            contentTagRefs={
              watchTags?.filter(tag => {
                const parts = tag.split(':')
                return parts.length >= 2
              }) || []
            }
            contentTagNames={
              watchTags?.filter(tag => {
                const parts = tag.split(':')
                return parts.length < 2
              }) || []
            }
            onContentTypeRefChange={onContentTypeRefChange}
            onContentCategoryRefsChange={onContentCategoryRefsChange}
            onContentCategoryNamesChange={onContentCategoryNamesChange}
            onContentTagRefsChange={onContentTagRefsChange}
            onContentTagNamesChange={onContentTagNamesChange}
          />
        </div>

        {/* Content Group and Content Type */}
        <FormFieldGroup>
          {/* Content Group Selection - Hidden if provided via props or additionalData */}
          {!extractedContentGroupRef && (
            <FormField
              control={control as any}
              name="contentGroupRef"
              rules={{ required: t('group-required') }}
              render={({ field }) => (
                <FormItem className="gba:flex-1">
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
              <FormItem className="gba:flex-1">
                <FormLabel>{t('content-type')}</FormLabel>
                <FormControl>
                  <CatalogSelect
                    catalogIdentifier="ContentType:v1"
                    parentField="contentGroupRef"
                    requireSourceForEnable={true}
                    autoSelectFirst={true}
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    data-testid="content-entry-window-type-select"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormFieldGroup>

        {/* Title */}
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

        {/* Preview Text (optional for policies) */}
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

        {/* Quill Editor - Takes full remaining height */}
        <div className="gba:flex-1 gba:flex gba:flex-col gba:border-t gba:border-border gba:overflow-hidden gba:min-h-0">
          <style>{`
            .ql-editor {
              min-height: 50px;
            }
          `}</style>
          <FormField
            control={control as any}
            name="content"
            rules={{ required: t('content-required') || 'Content is required' }}
            render={({ field }) => (
              <FormItem className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden gba:min-h-0">
                <FormLabel>{t('content') || 'Content'}</FormLabel>
                <FormControl className="gba:h-full gba:max-h-full gba:flex gba:flex-col gba:min-h-0">
                  <ReactQuill
                    theme="snow"
                    value={field.value || ''}
                    onChange={field.onChange}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder={t('policy-content-placeholder') || 'Write the policy content here...'}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Categories and Tags */}
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
                    data-testid="content-entry-window-categories-select"
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
                    data-testid="content-entry-window-tags-select"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormFieldGroup>
      </div>

      {/* BOTTOM CONTROLS - Validity Period */}
      <div className="gba:flex gba:flex-col gba:gap-6 gba:flex-shrink-0 gba:overflow-y-auto gba:transition-all gba:duration-300 gba:border-border gba:w-full gba:pt-4 gba:border-t">
        {/* Validity Period (activeFrom/activeTo) */}
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

        {/* Display Author Toggle (policies typically show author) */}
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

export default PolicySegment
