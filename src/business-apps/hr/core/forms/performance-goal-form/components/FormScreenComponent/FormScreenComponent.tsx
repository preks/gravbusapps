'use client'

import React, { useEffect, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@newwork/nw-design-system'
import { formatDate } from '@/common/utils/windowUtils'
import { PercentIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'

interface FormScreenComponentProps {
  statusOptions: { value: string; label: string }[]
  prefixDataTestId?: string
  dataTestId?: string
  form: UseFormReturn<FormData>
  cycleStartDate?: string
  cycleEndDate?: string
}

interface FormData {
  title: string
  startDate: Date
  dueDate: Date
  status: string
  progressPercent: number
  completionDate?: Date
}

export const FormScreenComponent: React.FC<FormScreenComponentProps> = ({
  statusOptions,
  prefixDataTestId = 'performance-goal-form',
  dataTestId = 'performance-goal-form-modal',
  form,
  cycleStartDate,
  cycleEndDate
}) => {
  const { t } = useTranslation()
  const cycleStart = cycleStartDate ? dayjs(cycleStartDate).startOf('day') : null
  const cycleEnd = cycleEndDate ? dayjs(cycleEndDate).startOf('day') : null
  const cycleStartValue = cycleStart ? cycleStart.format('YYYY-MM-DD') : undefined
  const cycleEndValue = cycleEnd ? cycleEnd.format('YYYY-MM-DD') : undefined

  // Store initial progress value to determine disabled state
  const [initialProgress] = useState(() => form.getValues('progressPercent'))

  // Watch progress percent to auto-set completion date when reaching 100%
  const progressPercent = form.watch('progressPercent')
  const completionDate = form.watch('completionDate')

  const isStartDateDisabled = initialProgress > 0
  const isFieldsDisabled = initialProgress === 100

  useEffect(() => {
    if (progressPercent === 100 && !completionDate) {
      // Only set completion date if it's not already set (first time reaching 100%)
      form.setValue('completionDate', new Date())
    } else if (progressPercent < 100 && completionDate) {
      // Clear completion date if progress is less than 100%
      form.setValue('completionDate', undefined)
    }
    // If progressPercent === 100 and completionDate already exists, don't change it
  }, [progressPercent, completionDate, form])

  return (
    <div className="gba:space-y-6" data-testid={dataTestId}>
      {/* Title Field */}
      <FormField
        control={form.control}
        name="title"
        rules={{ required: t('performance_goal.title_required', 'Please enter a goal title') }}
        render={({ field }) => (
          <FormItem data-testid={`${prefixDataTestId}-title-field`}>
            <FormLabel>{t('performance_goal.title_label', 'Title')} *</FormLabel>
            <FormControl>
              <Input
                disabled={isFieldsDisabled}
                placeholder={t('performance_goal.title_placeholder', 'Enter goal title')}
                maxLength={100}
                data-testid={`${prefixDataTestId}-title-input`}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Start Date Field */}
      <FormField
        control={form.control}
        name="startDate"
        rules={{
          required: t('performance_goal.start_date_required', 'Please select a start date'),
          validate: value => {
            if (!value) return t('performance_goal.start_date_required', 'Please select a start date')
            const startDate = dayjs(value).startOf('day')
            const dueDate = dayjs(form.getValues('dueDate')).startOf('day')
            if (cycleStart && startDate.isBefore(cycleStart, 'day')) {
              return t('performance_goal.start_date_cycle_min', 'Start date must be within the selected cycle')
            }
            if (cycleEnd && startDate.isAfter(cycleEnd, 'day')) {
              return t('performance_goal.start_date_cycle_max', 'Start date must be within the selected cycle')
            }
            if (dueDate.isValid() && startDate.isAfter(dueDate, 'day')) {
              return t('performance_goal.start_before_due', 'Start date must be on or before due date')
            }
            return true
          }
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-birth-place-label">
              {t('performance_goal.start_date_placeholder', 'Start date')} *
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                type="date"
                disabled={isStartDateDisabled}
                data-testid="flw_changePersonalData_startDate"
                placeholder={t(
                  'lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder',
                  'Please Select'
                )}
                value={
                  field.value
                    ? `${field.value.getFullYear()}-${String(field.value.getMonth() + 1).padStart(2, '0')}-${String(field.value.getDate()).padStart(2, '0')}`
                    : ''
                }
                className="gba:w-full"
                min={cycleStartValue}
                max={cycleEndValue}
                onChange={e => {
                  const dateValue = e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined
                  field.onChange(dateValue)
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Due Date Field */}
      <FormField
        control={form.control}
        name="dueDate"
        rules={{
          required: t('performance_goal.Due_date_required', 'Please select a due date'),
          validate: value => {
            if (!value) return t('performance_goal.Due_date_required', 'Please select a due date')
            const dueDate = dayjs(value).startOf('day')
            const startDate = dayjs(form.getValues('startDate')).startOf('day')
            if (cycleStart && dueDate.isBefore(cycleStart, 'day')) {
              return t('performance_goal.due_date_cycle_min', 'Due date must be within the selected cycle')
            }
            if (cycleEnd && dueDate.isAfter(cycleEnd, 'day')) {
              return t('performance_goal.due_date_cycle_max', 'Due date must be within the selected cycle')
            }
            if (startDate.isValid() && dueDate.isBefore(startDate, 'day')) {
              return t('performance_goal.due_after_start', 'Due date must be on or after start date')
            }
            return true
          }
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-birth-place-label">
              {t('performance_goal.Due_date_placeholder', 'Due date')} *
            </FormLabel>
            <FormControl>
              <Input
                className="gba:w-full"
                {...field}
                type="date"
                disabled={isFieldsDisabled}
                placeholder={t(
                  'lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder',
                  'Please Select'
                )}
                data-testid="flw_changePersonalData_dueDate"
                min={cycleStartValue}
                max={cycleEndValue}
                value={
                  field.value
                    ? `${field.value.getFullYear()}-${String(field.value.getMonth() + 1).padStart(2, '0')}-${String(field.value.getDate()).padStart(2, '0')}`
                    : ''
                }
                onChange={e => {
                  const dateValue = e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined
                  field.onChange(dateValue)
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Status Field */}
      <FormField
        control={form.control}
        name="status"
        rules={{ required: t('performance_goal.status_required', 'Please select a status') }}
        render={({ field }) => (
          <FormItem data-testid={`${prefixDataTestId}-status-field`}>
            <FormLabel>{t('performance_goal.status_label', 'Status')} *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger data-testid={`${prefixDataTestId}-status-select`}>
                  <SelectValue placeholder={t('performance_goal.status_placeholder', 'Select status')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Progress Field */}
      <FormField
        control={form.control}
        name="progressPercent"
        rules={{
          validate: (v: any) => {
            // Check if field is empty
            if (v === undefined || v === null || v === '') {
              return t('performance_goal.progress_required', 'Please enter progress percentage')
            }

            // Check if it's a valid number
            const num = Number(v)
            if (Number.isNaN(num)) {
              return t('performance_goal.invalid_number', 'Please enter a valid number (0-100)')
            }

            // Check range
            if (num < 0 || num > 100) {
              return t('performance_goal.range_error', 'Please enter a number between 0 and 100')
            }

            return true
          }
        }}
        render={({ field }) => (
          <FormItem data-testid={`${prefixDataTestId}-progress-field`}>
            <FormLabel data-testid={`${prefixDataTestId}-progress-label`}>
              {t('performance_goal.progress_label', 'Progress')} *
            </FormLabel>
            <FormControl>
              <Input
                className="gba:w-full"
                {...field}
                disabled={isFieldsDisabled}
                placeholder={t('performance_goal.progress_placeholder', 'Enter progress percentage')}
                // type="number"
                inputMode="decimal"
                data-testid={`${prefixDataTestId}-progress-input`}
                endAddOn={<PercentIcon className="gba:w-4 gba:h-4" />}
                onChange={e => {
                  if (e.target.value === '') {
                    field.onChange(0)
                  } else {
                    const value = Number.parseInt(e.target.value, 10)
                    field.onChange(Number.isNaN(value) ? undefined : value)
                  }
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Completion Date Field - Only show when progress is 100% */}
      {progressPercent === 100 && (
        <FormField
          control={form.control}
          name="completionDate"
          render={({ field }) => (
            <FormItem data-testid={`${prefixDataTestId}-completion-date-field`}>
              <FormLabel>{t('performance_goal.completion_date_label', 'Completion Date')}</FormLabel>
              <FormControl>
                <button
                  type="button"
                  disabled
                  className="gba:flex gba:h-10 gba:w-full gba:items-center gba:justify-between gba:rounded-md gba:border gba:border-input gba:bg-muted gba:px-3 gba:py-2 gba:text-sm gba:ring-offset-background placeholder:gba:text-muted-foreground focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring focus:gba:ring-offset-2 disabled:gba:cursor-not-allowed disabled:gba:opacity-50"
                  data-testid={`${prefixDataTestId}-completion-date-trigger`}
                >
                  {field.value
                    ? formatDate(field.value, 'date.long')
                    : t('performance_goal.completion_date_placeholder', 'Select completion date')}
                </button>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )
}

export default FormScreenComponent
