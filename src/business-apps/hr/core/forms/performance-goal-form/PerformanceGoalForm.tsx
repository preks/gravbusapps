'use client'

import React, { useMemo } from 'react'
import { message } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import AppActionForm from '@/components/app-action-form/AppActionForm'
import FormScreenComponent from './components/FormScreenComponent'
import flowSmall from '@/assets/icons/flowSmall.svg'
import FormHeader from '../components/FormHeader'
import { Employee } from '@/business-apps/hr/core/apps/employee-record/hooks/useEmployeeData'

interface PerformanceGoalFormProps {
  onClose: () => void
  onSuccess?: () => void
  prefixDataTestId?: string
  additionalData: Record<string, unknown>
  employee: Employee
}

interface PerformanceGoalFormData {
  title: string
  startDate: Date
  dueDate: Date
  status: string
  progressPercent: number
  completionDate?: Date
}

const statusOptions = [
  { value: 'ON_TRACK', label: 'On Track' },
  { value: 'BEHIND_TARGET', label: 'Behind Target' },
  { value: 'AT_RISK', label: 'At Risk' },
  { value: 'ACHIEVED', label: 'Achieved' },
  { value: 'NOT_ACHIEVED', label: 'Not Achieved' }
]

/**
 * Performance Goal Form Component
 * Form for creating new employee performance goals or editing existing ones
 */
const PerformanceGoalFormContent: React.FC<PerformanceGoalFormProps> = ({
  onClose,
  onSuccess,
  prefixDataTestId = 'performance-goal-form',
  additionalData,
  employee
}) => {
  const { t } = useTranslation()
  const isEditMode = additionalData?.goalId ? true : false

  // Helper function to safely convert date strings to Date objects
  const safeDateConversion = (dateString: string | undefined): Date => {
    if (!dateString) return new Date()
    try {
      const date = new Date(dateString)
      return isNaN(date.getTime()) ? new Date() : date
    } catch (error) {
      console.warn('Failed to parse date:', dateString, error)
      return new Date()
    }
  }

  // Prepare initial form data
  const getInitialFormData = (): PerformanceGoalFormData => {
    if (additionalData) {
      const dueDate = dayjs(additionalData.dueDate as string).add(5, 'day')
      return {
        title: (additionalData.title as string) || '',
        startDate: safeDateConversion(additionalData.startDate as string),
        dueDate: safeDateConversion((additionalData.dueDate as string) || dueDate.toISOString()),
        status: (additionalData.status as string) || 'ON_TRACK',
        progressPercent: (additionalData.progressPercent as number) || 0,
        completionDate: additionalData.completionDate
          ? safeDateConversion(additionalData.completionDate as string)
          : undefined
      }
    } else {
      // For create mode, set start date to today and due date to 5 days from today
      const today = dayjs().startOf('day')
      const dueDate = today.add(5, 'day')
      return {
        title: '',
        startDate: today.toDate(),
        dueDate: dueDate.toDate(),
        status: 'ON_TRACK',
        progressPercent: 0
      }
    }
  }

  const form = useForm<PerformanceGoalFormData>({
    defaultValues: getInitialFormData(),
    mode: 'onChange'
  })

  // Check if form is valid (modified and no errors)
  const isFormValid = useMemo(
    () => form.formState.isValid && form.formState.isDirty,
    [form.formState.isValid, form.formState.isDirty]
  )

  // Helper function to convert date to ISO string with noon time to avoid timezone issues
  const dateToISOString = (date: Date | string): string => {
    if (date instanceof Date) {
      // Set time to noon to avoid timezone issues
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0)
      return dateOnly.toISOString()
    }
    return date as string
  }

  const handleFormSubmit = async (formData: PerformanceGoalFormData) => {
    try {
      // Validate that we have the required data for edit mode
      if (isEditMode && !additionalData?.goalId) {
        console.error('Edit mode enabled but no goal ID found:', additionalData)
        throw new Error('Cannot edit goal: Goal ID not found')
      }

      // Transform dates to ISO string format as required by API
      const payload = {
        employeePerformanceGoal: {
          ...(isEditMode ? { id: additionalData.goalId } : {}),
          title: formData.title,
          startDate: dateToISOString(formData.startDate),
          dueDate: dateToISOString(formData.dueDate),
          status: formData.status || 'ON_TRACK',
          progressPercent: formData.progressPercent || 0,
          employee: additionalData?.employeeId,
          ...(formData.progressPercent === 100 && formData.completionDate
            ? { completionDate: dateToISOString(formData.completionDate) }
            : {}),
          ...(isEditMode ? { version: additionalData.version } : {})
        },
        changeMode: isEditMode ? 'UPDATE' : 'INSERT'
      }

      // Return the payload for AppActionForm to handle the process event
      return payload
    } catch (error) {
      console.error('Error preparing performance goal data:', error)
      throw error
    }
  }

  const handleFormSuccess = () => {
    const successMessage = isEditMode
      ? 'Performance goal was successfully updated'
      : 'Performance goal was successfully created'

    message.success(successMessage)
    form.reset()
    onSuccess?.()
    onClose()
  }

  const getFormTitle = () => {
    return isEditMode
      ? t('performance_goal.edit_title', 'Edit Performance Goal')
      : t('performance_goal.title', 'Set New Goal')
  }

  return (
    <div
      className="gba:min-h-screen gba:w-full gba:flex gba:flex-col gba:bg-white gba:pt-3"
      data-testid="performance-goal-form-container"
    >
      <FormHeader
        title={getFormTitle()}
        flowIconUrl={flowSmall}
        employee={
          employee
            ? {
                firstName: employee.firstName,
                lastName: employee.lastName,
                pictureThumbnail: employee.pictureThumbnail,
                jobTitle: Array.isArray(employee.employeePosition)
                  ? employee.employeePosition?.[0]?.jobPosition?.name
                  : (employee.employeePosition as any)?.jobPosition?.name
              }
            : undefined
        }
      />

      <div className="gba:flex-grow gba:w-full">
        <AppActionForm
          processType={isEditMode ? 'update' : 'create'}
          submitEventType="pse_complete"
          cancelEventType="pse_pause"
          onSubmit={handleFormSubmit}
          onCancel={onClose}
          onSuccess={handleFormSuccess}
          formData={form.getValues()}
          form={form}
          submitButtonText={isEditMode ? 'Update Goal' : 'Create Goal'}
          cancelButtonText="Cancel"
          data-testid={prefixDataTestId}
          isSubmitDisabled={!isFormValid}
        >
          <FormScreenComponent
            statusOptions={statusOptions}
            prefixDataTestId={prefixDataTestId}
            dataTestId={`${prefixDataTestId}-form`}
            form={form}
          />
        </AppActionForm>
      </div>
    </div>
  )
}

// Wrapper component
const PerformanceGoalForm: React.FC<
  BusinessAppContextProps & {
    onClose?: () => void
    onSuccess?: () => void
  }
> = ({ onClose = () => {}, onSuccess, additionalData }) => {
  // Extract initial parameters from the flow payload
  const initialParameters = additionalData?.psi_taskPayload?.psi_initialParameters

  const employee = initialParameters?.employee as Employee | undefined

  return (
    <PerformanceGoalFormContent
      employee={employee as Employee}
      onClose={onClose}
      onSuccess={onSuccess}
      additionalData={initialParameters}
    />
  )
}

export default PerformanceGoalForm
