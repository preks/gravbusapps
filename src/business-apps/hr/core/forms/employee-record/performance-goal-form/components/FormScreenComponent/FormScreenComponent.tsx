'use client'

import React, { useState, useEffect } from 'react'
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
  FormMessage,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@newwork/nw-design-system'
import { formatDate } from '@/common/utils/windowUtils'

interface FormScreenComponentProps {
  statusOptions: { value: string; label: string }[]
  prefixDataTestId?: string
  dataTestId?: string
  form: UseFormReturn<FormData>
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
  form
}) => {
  const { t } = useTranslation()
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [dueDateOpen, setDueDateOpen] = useState(false)

  // Watch progress percent to auto-set completion date when reaching 100%
  const progressPercent = form.watch('progressPercent')
  const completionDate = form.watch('completionDate')

  useEffect(() => {
    if (progressPercent === 100 && !completionDate) {
      form.setValue('completionDate', new Date())
    } else if (progressPercent < 100 && completionDate) {
      // Clear completion date if progress is less than 100%
      form.setValue('completionDate', undefined)
    }
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
          required: t('performance_goal.start_date_required', 'Please select a start date')
        }}
        render={({ field }) => {
          const isStartDateDisabled = progressPercent > 0

          return (
            <FormItem data-testid={`${prefixDataTestId}-start-date-field`}>
              <FormLabel>{t('performance_goal.start_date_label', 'Start Date')} *</FormLabel>
              <FormControl>
                {isStartDateDisabled ? (
                  <button
                    type="button"
                    disabled
                    className="gba:flex gba:h-10 gba:w-full gba:items-center gba:justify-between gba:rounded-md gba:border gba:border-input gba:bg-muted gba:px-3 gba:py-2 gba:text-sm gba:ring-offset-background placeholder:gba:text-muted-foreground focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring focus:gba:ring-offset-2 disabled:gba:cursor-not-allowed disabled:gba:opacity-50"
                    data-testid={`${prefixDataTestId}-start-date-trigger`}
                  >
                    {field.value
                      ? formatDate(field.value, 'date.long')
                      : t('performance_goal.start_date_placeholder', 'Select start date')}
                  </button>
                ) : (
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="gba:flex gba:h-10 gba:w-full gba:items-center gba:justify-between gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:ring-offset-background placeholder:gba:text-muted-foreground focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring focus:gba:ring-offset-2 disabled:gba:cursor-not-allowed disabled:gba:opacity-50"
                        data-testid={`${prefixDataTestId}-start-date-trigger`}
                      >
                        {field.value
                          ? formatDate(field.value, 'date.long')
                          : t('performance_goal.start_date_placeholder', 'Select start date')}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="gba:w-auto gba:p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={date => {
                          field.onChange(date)
                          setStartDateOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />

      {/* Due Date Field */}
      <FormField
        control={form.control}
        name="dueDate"
        rules={{
          required: t('performance_goal.due_date_required', 'Please select a due date'),
          validate: value => {
            const startDate = form.getValues('startDate')
            if (!value || !startDate) return true

            const dueDate = value instanceof Date ? value : new Date(value)
            const start = startDate instanceof Date ? startDate : new Date(startDate)

            // Compare only the date part (year, month, day) ignoring time
            const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
            const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate())

            if (dueDateOnly >= startDateOnly) {
              return true
            }
            return t('performance_goal.due_date_after_start', 'Due date must be on or after start date')
          }
        }}
        render={({ field }) => (
          <FormItem data-testid={`${prefixDataTestId}-due-date-field`}>
            <FormLabel>{t('performance_goal.due_date_label', 'Due Date')} *</FormLabel>
            <FormControl>
              <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="gba:flex gba:h-10 gba:w-full gba:items-center gba:justify-between gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:ring-offset-background placeholder:gba:text-muted-foreground focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring focus:gba:ring-offset-2 disabled:gba:cursor-not-allowed disabled:gba:opacity-50"
                    data-testid={`${prefixDataTestId}-due-date-trigger`}
                  >
                    {field.value
                      ? formatDate(field.value, 'date.long')
                      : t('performance_goal.due_date_placeholder', 'Select due date')}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="gba:w-auto gba:p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={undefined}
                    onSelect={date => {
                      field.onChange(date)
                      setDueDateOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
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
          required: t('performance_goal.progress_required', 'Please enter progress percentage'),
          min: { value: 0, message: 'Progress must be at least 0%' },
          max: { value: 100, message: 'Progress must be at most 100%' }
        }}
        render={({ field }) => (
          <FormItem data-testid={`${prefixDataTestId}-progress-field`}>
            <FormLabel>{t('performance_goal.progress_label', 'Progress')} *</FormLabel>
            <FormControl>
              <div className="gba:relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder={t('performance_goal.progress_placeholder', 'Enter progress percentage')}
                  data-testid={`${prefixDataTestId}-progress-input`}
                  {...field}
                  onChange={e => {
                    let value = parseInt(e.target.value || '0', 10)
                    if (isNaN(value)) value = 0
                    value = Math.min(100, Math.max(0, value))
                    field.onChange(value)
                  }}
                />
                <div className="gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2 gba:pointer-events-none">
                  <span className="gba:text-muted-foreground">%</span>
                </div>
              </div>
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
