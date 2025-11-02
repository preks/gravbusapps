import React from 'react'
import { Control } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Switch,
  useTranslation
} from '@newwork/nw-design-system'
import { ContentEntryFormValues } from '../ContentEntryWindow'
import translations from '../i18n'

interface QuestionSegmentProps {
  control: Control<ContentEntryFormValues>
  watchDisplayAuthor: boolean
  authorName: string | null
}

/**
 * QuestionSegment - Form segment for Q&A content
 * Features: Simple title, detailed description, tags, no rich formatting
 * Similar to Stack Overflow, Quora question forms
 */
export const QuestionSegment: React.FC<QuestionSegmentProps> = ({ control, watchDisplayAuthor, authorName }) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:space-y-6">
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

      {/* Preview Text */}
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

      {/* Settings */}
      <div className="gba:space-y-4">
        <FormField
          control={control as any}
          name="displayAuthor"
          render={({ field }) => (
            <FormItem className="gba:flex gba:items-center gba:justify-between gba:space-y-0 gba:p-4 gba:border gba:border-border gba:rounded-lg">
              <FormLabel>{t('display-author') || 'Display Author'}</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {watchDisplayAuthor && authorName && (
          <FormField
            control={control as any}
            name="author"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('author') || 'Author'}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} disabled />
                </FormControl>
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Hidden fields - Answers and Voting always enabled for questions */}
      <input type="hidden" {...(control as any).register('allowComment')} value="true" />
      <input type="hidden" {...(control as any).register('allowReaction')} value="true" />
    </div>
  )
}
