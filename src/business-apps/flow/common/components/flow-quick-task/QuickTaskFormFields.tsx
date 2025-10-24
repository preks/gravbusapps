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
import { QuickTaskFileUpload } from './QuickTaskFileUpload'
import { SearchableEmployeeCombobox } from './SearchableEmployeeCombobox'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { QuickTaskFormConfig, QuickTaskFormData, AssigneeOption } from './types'
import { cn } from '@/common/utils/cn'

export interface QuickTaskFormFieldsProps {
  form: UseFormReturn<QuickTaskFormData>
  onSubmit: (data: QuickTaskFormData) => Promise<void>
  onCancel?: () => void
  config?: QuickTaskFormConfig
  // For employee search mode
  employeeOptions?: AssigneeOption[]
  employeesLoading?: boolean
  onEmployeeSearch?: (query: string) => void
  // Submission states
  isSubmitting: boolean
  isUploadingFiles?: boolean
  uploadProgress?: string
}

export const QuickTaskFormFields: React.FC<QuickTaskFormFieldsProps> = ({
  form,
  onSubmit,
  onCancel,
  config = {},
  employeeOptions = [],
  employeesLoading = false,
  onEmployeeSearch,
  isSubmitting,
  isUploadingFiles = false,
  uploadProgress = ''
}) => {
  const {
    taskName,
    enableFileUpload = true,
    enableDueDate = true,
    maxFiles = 5,
    maxFileSize = 10,
    allowedFileTypes = ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.zip'],
    assigneeSelector = { mode: 'employee-search', required: true },
    labels = {},
    className
  } = config

  // Custom assignee component
  const CustomAssigneeComponent = assigneeSelector.customComponent

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn('gba:space-y-6 gba:w-full', className)}>
        {/* Title Field */}
        <FormField
          control={form.control}
          name="title"
          rules={{
            required:
              labels.title || getTranslationFromI18nKeyAndLabel('quickTask.field.title.required', 'Title is required')
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {labels.title || getTranslationFromI18nKeyAndLabel('quickTask.field.title.label', 'Task Title')}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={
                    labels.titlePlaceholder ||
                    getTranslationFromI18nKeyAndLabel('quickTask.field.title.placeholder', 'Enter task title...')
                  }
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
          rules={{
            required:
              labels.message ||
              getTranslationFromI18nKeyAndLabel('quickTask.field.message.required', 'Message is required')
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {labels.message ||
                  getTranslationFromI18nKeyAndLabel('quickTask.field.message.label', 'Task Description')}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={
                    labels.messagePlaceholder ||
                    getTranslationFromI18nKeyAndLabel(
                      'quickTask.field.message.placeholder',
                      'Enter detailed description or instructions...'
                    )
                  }
                  rows={4}
                  {...field}
                  data-testid="blink-task-message-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Documents Field - Conditional */}
        {enableFileUpload && (
          <FormField
            control={form.control}
            name="documents"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {labels.attachments ||
                    getTranslationFromI18nKeyAndLabel('quickTask.field.documents.label', 'Attachments (Optional)')}
                </FormLabel>
                <FormControl>
                  <QuickTaskFileUpload
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isSubmitting || isUploadingFiles}
                    maxFiles={maxFiles}
                    maxFileSize={maxFileSize}
                    allowedFileTypes={allowedFileTypes}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Assignee Selector - Conditional based on mode */}
        <FormField
          control={form.control}
          name="assignedUserId"
          rules={{
            required: assigneeSelector.required
              ? labels.assignee ||
                getTranslationFromI18nKeyAndLabel(
                  'quickTask.field.assignee.required',
                  'Please select an employee to assign'
                )
              : false
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {labels.assignee || getTranslationFromI18nKeyAndLabel('quickTask.field.assignee.label', 'Assign To')}
              </FormLabel>
              <FormControl>
                {assigneeSelector.mode === 'custom' && CustomAssigneeComponent ? (
                  <CustomAssigneeComponent
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                    placeholder={
                      labels.assigneePlaceholder ||
                      getTranslationFromI18nKeyAndLabel('quickTask.field.assignee.placeholder', 'Search and select...')
                    }
                    searchPlaceholder={
                      labels.assigneeSearchPlaceholder ||
                      getTranslationFromI18nKeyAndLabel(
                        'quickTask.field.assignee.searchPlaceholder',
                        'Type to search...'
                      )
                    }
                    emptyText={
                      labels.assigneeEmptyText ||
                      getTranslationFromI18nKeyAndLabel('quickTask.field.assignee.emptyText', 'No results found.')
                    }
                    loading={employeesLoading}
                  />
                ) : (
                  <SearchableEmployeeCombobox
                    options={employeeOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    onSearchChange={onEmployeeSearch || (() => {})}
                    placeholder={
                      labels.assigneePlaceholder ||
                      getTranslationFromI18nKeyAndLabel(
                        'quickTask.field.assignee.placeholder',
                        'Search and select employee...'
                      )
                    }
                    searchPlaceholder={
                      labels.assigneeSearchPlaceholder ||
                      getTranslationFromI18nKeyAndLabel(
                        'quickTask.field.assignee.searchPlaceholder',
                        'Type to search employees...'
                      )
                    }
                    emptyText={
                      labels.assigneeEmptyText ||
                      getTranslationFromI18nKeyAndLabel('quickTask.field.assignee.emptyText', 'No employees found.')
                    }
                    disabled={employeesLoading || isSubmitting}
                    loading={employeesLoading}
                  />
                )}
              </FormControl>
              {assigneeSelector.mode === 'employee-search' && (
                <p className="gba:text-xs gba:text-gray-500 gba:mt-1">
                  {labels.assigneeHint ||
                    getTranslationFromI18nKeyAndLabel(
                      'quickTask.field.assignee.hint',
                      'Type to search employees by name (max 20 results).'
                    )}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Due Date Field - Conditional */}
        {enableDueDate && (
          <FormField
            control={form.control}
            name="dueDate"
            rules={{
              required: getTranslationFromI18nKeyAndLabel('quickTask.field.dueDate.required', 'Due date is required')
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {labels.dueDate || getTranslationFromI18nKeyAndLabel('quickTask.field.dueDate.label', 'Due Date')}
                </FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    placeholder={
                      labels.dueDatePlaceholder ||
                      getTranslationFromI18nKeyAndLabel('quickTask.field.dueDate.placeholder', 'Select due date...')
                    }
                    {...field}
                    data-testid="blink-task-due-date-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Submit Buttons */}
        <div className="gba:flex gba:justify-end gba:gap-3 gba:pt-4 gba:border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (onCancel) {
                onCancel()
              } else {
                form.reset()
              }
            }}
          >
            {labels.cancelButton || getTranslationFromI18nKeyAndLabel('quickTask.button.cancel', 'Cancel')}
          </Button>
          <Button type="submit" variant="default" disabled={isSubmitting || isUploadingFiles}>
            {isUploadingFiles
              ? uploadProgress || getTranslationFromI18nKeyAndLabel('quickTask.button.uploading', 'Uploading files...')
              : isSubmitting
                ? taskName
                  ? `${getTranslationFromI18nKeyAndLabel('quickTask.button.creating.prefix', 'Creating')} ${taskName}...`
                  : getTranslationFromI18nKeyAndLabel('quickTask.button.creating', 'Creating Quick Task...')
                : labels.submitButton ||
                  (taskName
                    ? `${getTranslationFromI18nKeyAndLabel('quickTask.button.create.prefix', 'Create')} ${taskName}`
                    : getTranslationFromI18nKeyAndLabel('quickTask.button.create', 'Create Quick Task'))}
          </Button>
        </div>
      </form>
    </Form>
  )
}
