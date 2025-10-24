import React from 'react'
import {
  Button,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea
} from '@newwork/nw-design-system'
import { UseFormReturn } from 'react-hook-form'
import { BlinkFileUpload } from './BlinkFileUpload'
import { BlinkUploadFile } from '../hooks/useBlinkFileUpload'
import { SearchableEmployeeCombobox } from './SearchableEmployeeCombobox'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface BlinkTaskFormData {
  title: string
  message: string
  documents: BlinkUploadFile[]
  assignedUserId: string
  dueDate: string
}

export interface BlinkTaskFormProps {
  form: UseFormReturn<BlinkTaskFormData>
  onSubmit: (data: BlinkTaskFormData) => Promise<void>
  employeeOptions: Array<{ value: string; label: string }>
  employeesLoading: boolean
  isSubmitting: boolean
  isUploadingFiles: boolean
  uploadProgress: string
  onEmployeeSearch: (query: string) => void
}

export const BlinkTaskForm: React.FC<BlinkTaskFormProps> = ({
  form,
  onSubmit,
  employeeOptions,
  employeesLoading,
  isSubmitting,
  isUploadingFiles,
  uploadProgress,
  onEmployeeSearch
}) => {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="gba:space-y-6">
        {/* Title Field */}
        <FormField
          control={form.control}
          name="title"
          rules={{ required: getTranslationFromI18nKeyAndLabel('blink.field.title.required', 'Title is required') }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getTranslationFromI18nKeyAndLabel('blink.field.title.label', 'Task Title')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'blink.field.title.placeholder',
                    'Enter task title...'
                  )}
                  {...field}
                  data-testid="blink-task-title-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Message Field */}
        <FormField
          control={form.control}
          name="message"
          rules={{ required: getTranslationFromI18nKeyAndLabel('blink.field.message.required', 'Message is required') }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('blink.field.message.label', 'Task Description')}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'blink.field.message.placeholder',
                    'Enter detailed description or instructions...'
                  )}
                  rows={4}
                  {...field}
                  data-testid="blink-task-message-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Documents Field */}
        <FormField
          control={form.control}
          name="documents"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('blink.field.documents.label', 'Attachments (Optional)')}
              </FormLabel>
              <FormControl>
                <BlinkFileUpload
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting || isUploadingFiles}
                  maxFiles={5}
                  maxFileSize={10}
                  allowedFileTypes={['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.zip']}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Employee Selector */}
        <FormField
          control={form.control}
          name="assignedUserId"
          rules={{
            required: getTranslationFromI18nKeyAndLabel(
              'blink.field.assignee.required',
              'Please select an employee to assign'
            )
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getTranslationFromI18nKeyAndLabel('blink.field.assignee.label', 'Assign To')}</FormLabel>
              <FormControl>
                <SearchableEmployeeCombobox
                  options={employeeOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                  onSearchChange={onEmployeeSearch}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'blink.field.assignee.placeholder',
                    'Search and select employee...'
                  )}
                  searchPlaceholder={getTranslationFromI18nKeyAndLabel(
                    'blink.field.assignee.searchPlaceholder',
                    'Type to search employees...'
                  )}
                  emptyText={getTranslationFromI18nKeyAndLabel('blink.field.assignee.emptyText', 'No employees found.')}
                  disabled={employeesLoading || isSubmitting}
                  loading={employeesLoading}
                />
              </FormControl>
              <p className="gba:text-xs gba:text-gray-500 gba:mt-1">
                {getTranslationFromI18nKeyAndLabel(
                  'blink.field.assignee.hint',
                  'Type to search employees by name (max 20 results).'
                )}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Due Date Field */}
        <FormField
          control={form.control}
          name="dueDate"
          rules={{
            required: getTranslationFromI18nKeyAndLabel('blink.field.dueDate.required', 'Due date is required')
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getTranslationFromI18nKeyAndLabel('blink.field.dueDate.label', 'Due Date')}</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'blink.field.dueDate.placeholder',
                    'Select due date...'
                  )}
                  {...field}
                  data-testid="blink-task-due-date-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Buttons */}
        <div className="gba:flex gba:justify-end gba:gap-3 gba:pt-4 gba:border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset()
            }}
          >
            {getTranslationFromI18nKeyAndLabel('blink.button.cancel', 'Cancel')}
          </Button>
          <Button type="submit" variant="default" disabled={isSubmitting || isUploadingFiles}>
            {isUploadingFiles
              ? uploadProgress || getTranslationFromI18nKeyAndLabel('blink.button.uploading', 'Uploading files...')
              : isSubmitting
                ? getTranslationFromI18nKeyAndLabel('blink.button.creating', 'Creating Blink...')
                : getTranslationFromI18nKeyAndLabel('blink.button.create', 'Create Blink')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
