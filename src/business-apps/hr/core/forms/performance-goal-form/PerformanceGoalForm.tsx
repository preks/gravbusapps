'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
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
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

// Fetch milestones and updates directly from GraphQL to avoid contextData pipeline limitations
const goalMilestonesQuery = `
  query GetGoalMilestones($goalId: uuid!) {
    EmployeePerformanceGoal(where: { id: { _eq: $goalId } }) {
      id
      version
      progressPercent
      status
      employeePerformanceGoalMilestone(orderBy: { sortOrder: ASC }) {
        id
        title
        done
        doneAt
        sortOrder
        version
      }
      employeePerformanceGoalUpdate(orderBy: { updateTime: ASC }) {
        id
        progressPercent
        comment
        updateTime
        updateDelta
      }
    }
  }
`

interface PerformanceGoalFormProps {
  onClose: () => void
  onSuccess?: () => void
  prefixDataTestId?: string
  additionalData: Record<string, unknown>
  employee: Employee
  accessToken: string
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

/** Stable fallback for AppActionForm — submit always receives values from RHF `handleSubmit`. */
const APP_ACTION_FORM_DATA_PLACEHOLDER: Record<string, unknown> = {}

/**
 * Performance Goal Form Component
 * Form for creating new employee performance goals or editing existing ones
 */
const PerformanceGoalFormContent: React.FC<PerformanceGoalFormProps> = ({
  onClose,
  onSuccess,
  prefixDataTestId = 'performance-goal-form',
  additionalData,
  employee,
  accessToken
}) => {
  const { t } = useTranslation()
  const isEditMode = !!additionalData?.goalId
  const goalId = additionalData?.goalId as string | undefined
  const cycleStartDate = additionalData?.cycleStartDate as string | undefined
  const cycleEndDate = additionalData?.cycleEndDate as string | undefined

  // Guard: AppActionForm listens to ALL processCompletion events globally while mounted.
  // This ref ensures handleFormSuccess only executes once per form instance.
  const successHandledRef = useRef(false)

  // Fetch milestones and updates directly from GraphQL — contextData pipeline may not
  // reliably pass large serialized fields through the process system.
  const graphQLClient = useGraphqlClient(accessToken)
  const [fetchedMilestones, setFetchedMilestones] = useState<MilestoneItem[] | null>(null)
  const [fetchedUpdates, setFetchedUpdates] = useState<Array<{
    id: string
    comment?: string
    progressPercent?: number
    updateTime?: string
  }> | null>(null)
  const [fetchedVersion, setFetchedVersion] = useState<number | null>(null)

  useEffect(() => {
    if (!goalId || !isEditMode) return
    graphQLClient
      .request(goalMilestonesQuery, { goalId })
      .then((res: any) => {
        const goal = res?.EmployeePerformanceGoal?.[0]
        if (!goal) return
        setFetchedVersion(goal.version ?? null)

        const updates: any[] = goal.employeePerformanceGoalUpdate || []
        setFetchedUpdates(
          updates.map((u: any) => ({
            id: u.id,
            comment: u.comment,
            progressPercent: u.progressPercent,
            updateTime: u.updateTime
          }))
        )

        // "Save Update" stores done states in updateDelta, NOT in the milestone table's done column.
        // Restore the latest done states from the most recent update that has a milestone snapshot.
        const latestWithDelta = [...updates].reverse().find((u: any) => u.updateDelta?.milestones?.length)
        const deltaMap: Record<string, { done: boolean; doneAt: string | null }> = {}
        if (latestWithDelta?.updateDelta?.milestones) {
          for (const m of latestWithDelta.updateDelta.milestones) {
            deltaMap[m.id] = { done: m.done ?? false, doneAt: m.doneAt ?? null }
          }
        }

        setFetchedMilestones(
          (goal.employeePerformanceGoalMilestone || []).map((m: any) => {
            const deltaState = deltaMap[m.id]
            return {
              id: m.id,
              title: m.title,
              version: m.version ?? 0,
              done: deltaState ? deltaState.done : (m.done ?? false),
              doneAt: deltaState ? deltaState.doneAt : (m.doneAt ?? null)
            }
          })
        )
      })
      .catch(() => {
        /* silently fall back to contextData */
      })
  }, [goalId])

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

  // Prepare initial form data (milestones populated once GraphQL data arrives via useEffect below)
  const getInitialFormData = (): PerformanceGoalFormData => {
    const additionalProps = (additionalData?.additionalProperties as Record<string, unknown>) || {}

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
        startValue: (additionalData.startValue as number) ?? (additionalProps?.numeric as any)?.current ?? undefined,
        targetValue: (additionalData.targetValue as number) ?? (additionalProps?.numeric as any)?.target ?? undefined,
        note: '',
        milestones: [] // populated by GraphQL fetch below
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
    // onBlur avoids validating the full form on every keystroke (major input lag).
    mode: 'onBlur',
    // Default reValidateMode is onChange — without this, fields would lag again after first blur.
    reValidateMode: 'onBlur',
    // Only subscribe to fields needed for the submit button — avoids re-rendering on unrelated formState.
    formState: {
      isDirty: true,
      isValid: true
    }
  })

  // Once milestones arrive from GraphQL, push them into the form
  useEffect(() => {
    if (fetchedMilestones !== null) {
      form.setValue('milestones', fetchedMilestones, { shouldDirty: false, shouldValidate: false })
    }
  }, [fetchedMilestones])

  const isFormValid = form.formState.isDirty && form.formState.isValid

  const formHeaderEmployee = useMemo(
    () =>
      employee
        ? {
            firstName: employee.firstName,
            lastName: employee.lastName,
            pictureThumbnail: employee.pictureThumbnail,
            jobTitle: Array.isArray(employee.employeePosition)
              ? employee.employeePosition?.[0]?.jobPosition?.name
              : (employee.employeePosition as { jobPosition?: { name?: string } })?.jobPosition?.name
          }
        : undefined,
    [employee]
  )

  const dateToISOString = (date: Date | string): string => {
    if (date instanceof Date) {
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

      const additionalProperties: Record<string, unknown> = {
        ...(isNumeric ? { numeric: { current: formData.startValue ?? 0, unit: '' } } : {})
      }

      // Build a lookup map from fetchedMilestones for done state — formData.milestones may not
      // carry `done` reliably since the field is unregistered in react-hook-form.
      const fetchedDoneMap = new Map<string, { done: boolean; doneAt: string | null }>(
        (fetchedMilestones ?? []).map(m => [m.id, { done: m.done ?? false, doneAt: m.doneAt ?? null }])
      )

      // Current milestone list from the form (structure after user adds/removes)
      const currentMilestones = form.getValues('milestones') || formData.milestones || []

      // For milestone goals: send full current list. Backend reconciles adds (no id), keeps (with id),
      // and removes (omitted from array). Use fetchedDoneMap for correct done state on existing items.
      const milestonesPayload =
        isMilestone && currentMilestones.length
          ? {
              milestones: currentMilestones.map((m, i) => {
                const isExisting = m.id && !m.id.startsWith('ms-')
                const doneState = isExisting ? fetchedDoneMap.get(m.id) : undefined
                return {
                  ...(isExisting ? { id: m.id } : {}),
                  title: m.title,
                  done: doneState?.done ?? false,
                  ...(doneState?.doneAt ? { doneAt: doneState.doneAt } : {}),
                  sortOrder: i
                }
              })
            }
          : {}

      // Updates — send existing ones (with id) to preserve them, append auto-generated + user note entries.
      // Prefer GraphQL-fetched data; fall back to contextData JSON strings.
      const existingUpdates: Array<{
        id: string
        comment?: string
        progressPercent?: number
        updateTime?: string
      }> = fetchedUpdates ?? JSON.parse((additionalData?.existingUpdatesJson as string) || '[]')

      // Auto-generate a milestone change log entry when milestones are added or removed.
      // Prefer GraphQL-fetched milestones for accurate diffing.
      const existingMilestones: MilestoneItem[] =
        fetchedMilestones ?? JSON.parse((additionalData?.existingMilestonesJson as string) || '[]')
      const currentIds = new Set(currentMilestones.map(m => m.id))
      const addedCount = isEditMode && isMilestone ? currentMilestones.filter(m => m.id.startsWith('ms-')).length : 0
      const removedCount = isEditMode && isMilestone ? existingMilestones.filter(m => !currentIds.has(m.id)).length : 0
      const milestoneChangeParts: string[] = []
      if (addedCount > 0) milestoneChangeParts.push(`${addedCount} milestone${addedCount > 1 ? 's' : ''} added`)
      if (removedCount > 0) milestoneChangeParts.push(`${removedCount} milestone${removedCount > 1 ? 's' : ''} removed`)
      const milestoneChangeComment = milestoneChangeParts.join(', ')

      // Recalculate progress for milestone goals using fetchedDoneMap as source of truth for done states
      let effectiveProgress = formData.progressPercent || 0
      if (isMilestone && isEditMode && currentMilestones.length) {
        const totalMilestones = currentMilestones.length
        const doneMilestones = currentMilestones.filter(m => {
          if (m.id.startsWith('ms-')) return false // new milestones are never done
          return fetchedDoneMap.get(m.id)?.done ?? false
        }).length
        effectiveProgress = totalMilestones > 0 ? Math.round((doneMilestones / totalMilestones) * 10000) / 100 : 0
      }

      const now = new Date().toISOString()
      const employeeId = additionalData?.employeeId as string | undefined
      const newEntries: Array<{ comment: string; progressPercent: number; updateTime: string; employee?: string }> = []
      if (milestoneChangeComment) {
        const combined = formData.note?.trim()
          ? `${milestoneChangeComment}. ${formData.note.trim()}`
          : milestoneChangeComment
        newEntries.push({
          comment: combined,
          progressPercent: effectiveProgress,
          updateTime: now,
          ...(employeeId ? { employee: employeeId } : {})
        })
      } else if (isEditMode && formData.note?.trim()) {
        newEntries.push({
          comment: formData.note.trim(),
          progressPercent: effectiveProgress,
          updateTime: now,
          ...(employeeId ? { employee: employeeId } : {})
        })
      }

      const updatesPayload =
        isEditMode && (existingUpdates.length > 0 || newEntries.length > 0)
          ? {
              updates: [
                ...existingUpdates.map(u => ({
                  id: u.id,
                  comment: u.comment,
                  progressPercent: u.progressPercent,
                  updateTime: u.updateTime
                })),
                ...newEntries
              ]
            }
          : {}

      const payload = {
        employeePerformanceGoal: {
          ...(isEditMode ? { id: additionalData.goalId as string } : {}),
          title: formData.title,
          startDate: dateToISOString(formData.startDate),
          dueDate: dateToISOString(formData.dueDate),
          ...(isEditMode ? {} : { status: null }),
          progressPercent: effectiveProgress,
          objectiveType: formData.objectiveType,
          ...(isNumeric ? { startValue: formData.startValue ?? 0, targetValue: formData.targetValue ?? 0 } : {}),
          employee: additionalData?.employeeId,
          ...(Object.keys(additionalProperties).length > 0 ? { additionalProperties } : {}),
          ...(formData.progressPercent === 100 && formData.completionDate
            ? { completionDate: dateToISOString(formData.completionDate) }
            : {}),
          // Use GraphQL-fetched version (always current) — contextData version can be stale
          ...(isEditMode ? { version: fetchedVersion ?? additionalData.version } : {}),
          ...milestonesPayload,
          ...updatesPayload
        },
        changeMode: isEditMode ? 'UPDATE' : 'INSERT'
      }

      return payload
    } catch (error) {
      console.error('Error preparing performance goal data:', error)
      throw error
    }
  }

  const handleFormSuccess = () => {
    if (successHandledRef.current) return
    successHandledRef.current = true

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
      <FormHeader title={getFormTitle()} flowIconUrl={flowSmall} employee={formHeaderEmployee} />

      <div className="gba:flex-grow gba:w-full">
        <AppActionForm
          processType={isEditMode ? 'update' : 'create'}
          submitEventType="pse_complete"
          cancelEventType="pse_pause"
          onSubmit={handleFormSubmit}
          onCancel={onClose}
          onSuccess={handleFormSuccess}
          formData={APP_ACTION_FORM_DATA_PLACEHOLDER}
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
> = ({ onClose = () => {}, onSuccess, additionalData, accessToken }) => {
  const initialParameters = additionalData?.psi_taskPayload?.psi_initialParameters
  const employee = initialParameters?.employee as Employee | undefined
  const goalId = initialParameters?.goalId as string | undefined

  return (
    <PerformanceGoalFormContent
      key={goalId || 'create'}
      employee={employee as Employee}
      onClose={onClose}
      onSuccess={onSuccess}
      additionalData={initialParameters}
      accessToken={accessToken}
    />
  )
}

export default PerformanceGoalForm
