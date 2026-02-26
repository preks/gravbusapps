'use client'

import React, { useMemo, useRef } from 'react'
import { message } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import AppActionForm from '@/components/app-action-form/AppActionForm'
import FormScreenComponent, { type MilestoneItem } from './components/FormScreenComponent'
import flowSmall from '@/assets/icons/flowSmall.svg'
import FormHeader from '../components/FormHeader'
import { Employee } from '@/business-apps/hr/core/apps/employee-record/hooks/useEmployeeData'
import { startProcess } from '@/common/utils/start-process'
import { beginSilentSave } from '@/common/utils/silent-processes'

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
  objectiveType: string
  startValue?: number
  targetValue?: number
  note?: string
  milestones?: MilestoneItem[]
}

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
  const isEditMode = !!additionalData?.goalId
  const cycleStartDate = additionalData?.cycleStartDate as string | undefined
  const cycleEndDate = additionalData?.cycleEndDate as string | undefined

  // Guard: AppActionForm listens to ALL processCompletion events while mounted.
  // If the note fires saveEmployeePerformanceGoalUpdate and it completes before unmount,
  // AppActionForm would call onSuccess again. This ref prevents that double-fire.
  const successHandledRef = useRef(false)

  // Snapshot of milestones that existed when the edit form opened — used to compute diffs
  const initialMilestonesRef = useRef<MilestoneItem[]>(
    isEditMode ? (additionalData?.existingMilestones as MilestoneItem[]) || [] : []
  )

  // Pending operations that need the backend-assigned goal ID to execute
  const pendingOpsRef = useRef<{
    employeeId: string
    title: string
    goalId: string
    milestonesToAdd: MilestoneItem[]
    milestonesToDelete: MilestoneItem[]
  } | null>(null)

  // Helper function to safely convert date strings to Date objects
  const safeDateConversion = (dateString: string | undefined): Date => {
    if (!dateString) return new Date()
    try {
      const date = new Date(dateString)
      return Number.isNaN(date.getTime()) ? new Date() : date
    } catch (error) {
      console.warn('Failed to parse date:', dateString, error)
      return new Date()
    }
  }

  const clampDateToCycle = (date: Date): Date => {
    const start = cycleStartDate ? dayjs(cycleStartDate).startOf('day') : null
    const end = cycleEndDate ? dayjs(cycleEndDate).startOf('day') : null
    const current = dayjs(date).startOf('day')

    if (start && current.isBefore(start)) return start.toDate()
    if (end && current.isAfter(end)) return end.toDate()
    return current.toDate()
  }

  // Prepare initial form data
  const getInitialFormData = (): PerformanceGoalFormData => {
    const additionalProps = (additionalData?.additionalProperties as Record<string, unknown>) || {}

    // Resolve objectiveType: prefer the proper DB column, fall back to legacy additionalProperties.goalType
    const resolveObjectiveType = (): string => {
      const dbType = additionalData?.objectiveType as string | undefined
      if (
        dbType === 'NUMERIC_PERFORMANCE_GOAL' ||
        dbType === 'MILESTONE_PERFORMANCE_GOAL' ||
        dbType === 'PERCENTAGE_PERFORMANCE_GOAL'
      ) {
        return dbType
      }
      const rawGoalType = additionalProps?.goalType as string | undefined
      if (rawGoalType === 'NUMERIC') return 'NUMERIC_PERFORMANCE_GOAL'
      if (rawGoalType === 'MILESTONE') return 'MILESTONE_PERFORMANCE_GOAL'
      return 'PERCENTAGE_PERFORMANCE_GOAL'
    }

    if (additionalData?.goalId) {
      const dueDate = dayjs(additionalData.dueDate as string).add(5, 'day')
      return {
        title: (additionalData.title as string) || '',
        startDate: clampDateToCycle(safeDateConversion(additionalData.startDate as string)),
        dueDate: clampDateToCycle(safeDateConversion((additionalData.dueDate as string) || dueDate.toISOString())),
        status: (additionalData.status as string) || 'ON_TRACK',
        progressPercent: (additionalData.progressPercent as number) || 0,
        completionDate: additionalData.completionDate
          ? safeDateConversion(additionalData.completionDate as string)
          : undefined,
        objectiveType: resolveObjectiveType(),
        // Prefer proper DB columns, fall back to legacy additionalProperties for old data
        startValue: (additionalData.startValue as number) ?? (additionalProps?.numeric as any)?.current ?? undefined,
        targetValue: (additionalData.targetValue as number) ?? (additionalProps?.numeric as any)?.target ?? undefined,
        note: '',
        milestones: (additionalData.existingMilestones as MilestoneItem[]) || []
      }
    } else {
      const today = dayjs().startOf('day')
      const dueDate = today.add(5, 'day')
      return {
        title: '',
        startDate: clampDateToCycle(today.toDate()),
        dueDate: clampDateToCycle(dueDate.toDate()),
        status: '',
        progressPercent: 0,
        objectiveType: 'PERCENTAGE_PERFORMANCE_GOAL',
        note: '',
        milestones: []
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
    return date
  }

  const handleFormSubmit = async (formData: PerformanceGoalFormData) => {
    try {
      if (isEditMode && !additionalData?.goalId) {
        throw new Error('Cannot edit goal: Goal ID not found')
      }

      const isNumeric = formData.objectiveType === 'NUMERIC_PERFORMANCE_GOAL'
      const isMilestone = formData.objectiveType === 'MILESTONE_PERFORMANCE_GOAL'

      // Compute milestone diffs for edit mode
      // Backend replaces milestones on UPDATE when milestones array is sent, so adds/deletes use separate calls
      let milestonesToAdd: MilestoneItem[] = []
      let milestonesToDelete: MilestoneItem[] = []
      if (isEditMode && isMilestone) {
        const currentIds = new Set((formData.milestones || []).map(m => m.id))
        milestonesToAdd = (formData.milestones || []).filter(m => m.id.startsWith('ms-'))
        milestonesToDelete = initialMilestonesRef.current.filter(m => !currentIds.has(m.id))
      }

      // Edit mode: milestone adds and deletes both need separate calls
      pendingOpsRef.current =
        isEditMode && (milestonesToAdd.length > 0 || milestonesToDelete.length > 0)
          ? {
              employeeId: additionalData?.employeeId as string,
              title: formData.title,
              goalId: additionalData.goalId as string,
              milestonesToAdd,
              milestonesToDelete
            }
          : null

      // additionalProperties: numeric state + note (edit mode, stored inline to avoid a second request)
      const additionalProperties: Record<string, unknown> = {
        ...(isNumeric ? { numeric: { current: formData.startValue ?? 0, unit: '' } } : {}),
        ...(isEditMode && formData.note?.trim() ? { note: formData.note.trim() } : {})
      }

      const payload = {
        employeePerformanceGoal: {
          // Only include id for UPDATE — INSERT lets the backend generate it
          ...(isEditMode ? { id: additionalData.goalId as string } : {}),
          title: formData.title,
          startDate: dateToISOString(formData.startDate),
          dueDate: dateToISOString(formData.dueDate),
          ...(isEditMode ? {} : { status: null }),
          progressPercent: formData.progressPercent || 0,
          objectiveType: formData.objectiveType,
          ...(isNumeric ? { startValue: formData.startValue ?? 0, targetValue: formData.targetValue ?? 0 } : {}),
          employee: additionalData?.employeeId,
          ...(Object.keys(additionalProperties).length > 0 ? { additionalProperties } : {}),
          ...(formData.progressPercent === 100 && formData.completionDate
            ? { completionDate: dateToISOString(formData.completionDate) }
            : {}),
          ...(isEditMode ? { version: additionalData.version } : {}),
          // CREATE only: send all milestones inline — backend creates them atomically
          ...(!isEditMode && isMilestone && formData.milestones?.length
            ? {
                milestones: formData.milestones.map((m, i) => ({
                  title: m.title,
                  done: false,
                  sortOrder: i
                }))
              }
            : {})
        },
        changeMode: isEditMode ? 'UPDATE' : 'INSERT'
      }

      return payload
    } catch (error) {
      console.error('Error preparing performance goal data:', error)
      throw error
    }
  }

  const handleFormSuccess = async () => {
    if (successHandledRef.current) return
    successHandledRef.current = true

    if (pendingOpsRef.current) {
      const { goalId, milestonesToAdd, milestonesToDelete } = pendingOpsRef.current
      try {
        // INSERT newly added milestones via separate calls (inline on UPDATE replaces all milestones)
        const existingCount = initialMilestonesRef.current.length
        milestonesToAdd?.forEach((milestone, index) => {
          beginSilentSave()
          startProcess({
            domain: 'employee',
            processName: 'saveEmployeePerformanceGoalMilestone',
            payload: {
              changeMode: 'INSERT',
              employeePerformanceGoalMilestone: {
                title: milestone.title,
                done: false,
                sortOrder: existingCount + index,
                performanceGoal: goalId
              }
            },
            skipScreen: true
          })
        })

        // DELETE removed milestones
        milestonesToDelete?.forEach(milestone => {
          beginSilentSave()
          startProcess({
            domain: 'employee',
            processName: 'saveEmployeePerformanceGoalMilestone',
            payload: {
              changeMode: 'DELETE',
              employeePerformanceGoalMilestone: {
                id: milestone.id,
                version: milestone.version ?? 0,
                performanceGoal: goalId
              }
            },
            skipScreen: true
          })
        })
      } catch (e) {
        console.error('[PerformanceGoalForm] Failed to execute post-save operations:', e)
      }
      pendingOpsRef.current = null
    }

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
            prefixDataTestId={prefixDataTestId}
            dataTestId={`${prefixDataTestId}-form`}
            form={form}
            cycleStartDate={cycleStartDate}
            cycleEndDate={cycleEndDate}
            isEditMode={isEditMode}
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
