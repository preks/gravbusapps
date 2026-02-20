import React from 'react'
import { QuickTaskFormProps } from './types'
import { useQuickTaskForm } from './hooks/useQuickTaskForm'
import { QuickTaskFormFields } from './QuickTaskFormFields'

/**
 * QuickTaskForm - Main reusable form component for creating quick tasks
 *
 * This component provides a configurable form for creating Quick Tasks with:
 * - Customizable assignee selection (employee search or custom component)
 * - Optional file upload
 * - Optional due date
 * - Flexible layout options (compact, standard, full-width)
 * - i18n support through labels configuration
 *
 * @example
 * ```tsx
 * <QuickTaskForm
 *   accessToken={accessToken}
 *   onSubmit={handleSubmit}
 *   config={{
 *     assigneeSelector: { mode: 'employee-search' },
 *     enableFileUpload: true,
 *     layout: 'standard'
 *   }}
 * />
 * ```
 */
export const QuickTaskForm: React.FC<QuickTaskFormProps> = ({
  config,
  accessToken,
  currentUserId,
  onSubmit,
  onCancel,
  defaultValues,
  isSubmitting: externalIsSubmitting
}) => {
  const { form, handleSubmit, isSubmitting, employeeOptions, employeesLoading, handleEmployeeSearch } =
    useQuickTaskForm({
      accessToken,
      currentUserId,
      config,
      defaultValues,
      onSubmit
    })

  // Use external isSubmitting if provided, otherwise use internal
  const submitting = externalIsSubmitting ?? isSubmitting

  return (
    <QuickTaskFormFields
      form={form}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      config={config}
      accessToken={accessToken}
      employeeOptions={employeeOptions}
      employeesLoading={employeesLoading}
      onEmployeeSearch={handleEmployeeSearch}
      isSubmitting={submitting}
    />
  )
}
