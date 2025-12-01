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

/**
 * Helper function to get translated text with fallback to custom label
 * Reduces duplication of the labels.X || getTranslationFromI18nKeyAndLabel pattern
 */
const getLabel = (customLabel: string | undefined, i18nKey: string, defaultText: string): string => {
  return customLabel || getTranslationFromI18nKeyAndLabel(i18nKey, defaultText)
}

/**
 * Helper function to get submit button text based on submission state
 */
const getSubmitButtonText = (
  isUploadingFiles: boolean,
  uploadProgress: string,
  isSubmitting: boolean,
  taskName: string | undefined,
  submitButtonLabel: string | undefined
): string => {
  if (isUploadingFiles) {
    return uploadProgress || getLabel(undefined, 'quickTask.button.uploading', 'Uploading files...')
  }

  if (isSubmitting) {
    if (taskName) {
      return `${getLabel(undefined, 'quickTask.button.creating.prefix', 'Creating')} ${taskName}...`
    }
    return getLabel(undefined, 'quickTask.button.creating', 'Creating Quick Task...')
  }

  if (submitButtonLabel) {
    return submitButtonLabel
  }

  if (taskName) {
    return `${getLabel(undefined, 'quickTask.button.create.prefix', 'Create')} ${taskName}`
  }

  return getLabel(undefined, 'quickTask.button.create', 'Create Quick Task')
}

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
            required: getLabel(labels.title, 'quickTask.field.title.required', 'Title is required')
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getLabel(labels.title, 'quickTask.field.title.label', 'Task Title')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={getLabel(
                    labels.titlePlaceholder,
                    'quickTask.field.title.placeholder',
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
          rules={{
            required: getLabel(labels.message, 'quickTask.field.message.required', 'Message is required')
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getLabel(labels.message, 'quickTask.field.message.label', 'Task Description')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={getLabel(
                    labels.messagePlaceholder,
                    'quickTask.field.message.placeholder',
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

        {/* Documents Field - Conditional */}
        {enableFileUpload && (
          <FormField
            control={form.control}
            name="documents"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {getLabel(labels.attachments, 'quickTask.field.documents.label', 'Attachments (Optional)')}
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
              ? getLabel(labels.assignee, 'quickTask.field.assignee.required', 'Please select an employee to assign')
              : false
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getLabel(labels.assignee, 'quickTask.field.assignee.label', 'Assign To')}</FormLabel>
              <FormControl>
                {assigneeSelector.mode === 'custom' && CustomAssigneeComponent ? (
                  <CustomAssigneeComponent
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                    placeholder={getLabel(
                      labels.assigneePlaceholder,
                      'quickTask.field.assignee.placeholder',
                      'Search and select...'
                    )}
                    searchPlaceholder={getLabel(
                      labels.assigneeSearchPlaceholder,
                      'quickTask.field.assignee.searchPlaceholder',
                      'Type to search...'
                    )}
                    emptyText={getLabel(
                      labels.assigneeEmptyText,
                      'quickTask.field.assignee.emptyText',
                      'No results found.'
                    )}
                    loading={employeesLoading}
                  />
                ) : (
                  <SearchableEmployeeCombobox
                    options={employeeOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    onSearchChange={onEmployeeSearch || (() => {})}
                    placeholder={getLabel(
                      labels.assigneePlaceholder,
                      'quickTask.field.assignee.placeholder',
                      'Search and select employee...'
                    )}
                    searchPlaceholder={getLabel(
                      labels.assigneeSearchPlaceholder,
                      'quickTask.field.assignee.searchPlaceholder',
                      'Type to search employees...'
                    )}
                    emptyText={getLabel(
                      labels.assigneeEmptyText,
                      'quickTask.field.assignee.emptyText',
                      'No employees found.'
                    )}
                    disabled={employeesLoading || isSubmitting}
                    loading={employeesLoading}
                  />
                )}
              </FormControl>
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
              required: getLabel(labels.dueDate, 'quickTask.field.dueDate.required', 'Due date is required')
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{getLabel(labels.dueDate, 'quickTask.field.dueDate.label', 'Due Date')}</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    placeholder={getLabel(
                      labels.dueDatePlaceholder,
                      'quickTask.field.dueDate.placeholder',
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
            {getLabel(labels.cancelButton, 'quickTask.button.cancel', 'Cancel')}
          </Button>
          <Button type="submit" variant="default" disabled={isSubmitting || isUploadingFiles}>
            {getSubmitButtonText(isUploadingFiles, uploadProgress, isSubmitting, taskName, labels.submitButton)}
          </Button>
        </div>
      </form>
    </Form>
  )
}
