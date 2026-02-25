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

export interface MilestoneItem {
  id: string
  title: string
  version?: number // present for DB-backed milestones (edit mode)
}

interface FormScreenComponentProps {
  prefixDataTestId?: string
  dataTestId?: string
  form: UseFormReturn<FormData>
  cycleStartDate?: string
  cycleEndDate?: string
  isEditMode?: boolean
}

export interface FormData {
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

const OBJECTIVE_TYPES = [
  { value: 'PERCENTAGE_PERFORMANCE_GOAL', label: 'Percentage' },
  { value: 'NUMERIC_PERFORMANCE_GOAL', label: 'Numeric' },
  { value: 'MILESTONE_PERFORMANCE_GOAL', label: 'Milestone' }
]

export const FormScreenComponent: React.FC<FormScreenComponentProps> = ({
  prefixDataTestId = 'performance-goal-form',
  dataTestId = 'performance-goal-form-modal',
  form,
  cycleStartDate,
  cycleEndDate,
  isEditMode = false
}) => {
  const { t } = useTranslation()
  const cycleStart = cycleStartDate ? dayjs(cycleStartDate).startOf('day') : null
  const cycleEnd = cycleEndDate ? dayjs(cycleEndDate).startOf('day') : null
  const cycleStartValue = cycleStart ? cycleStart.format('YYYY-MM-DD') : undefined
  const cycleEndValue = cycleEnd ? cycleEnd.format('YYYY-MM-DD') : undefined

  const [initialProgress] = useState(() => form.getValues('progressPercent'))
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('')

  const progressPercent = form.watch('progressPercent')
  const completionDate = form.watch('completionDate')
  const objectiveType = form.watch('objectiveType') || 'PERCENTAGE_PERFORMANCE_GOAL'
  const milestones = form.watch('milestones') || []

  const isStartDateDisabled = initialProgress > 0
  const isFieldsDisabled = initialProgress === 100

  const isPercentage = objectiveType === 'PERCENTAGE_PERFORMANCE_GOAL'
  const isNumeric = objectiveType === 'NUMERIC_PERFORMANCE_GOAL'
  const isMilestone = objectiveType === 'MILESTONE_PERFORMANCE_GOAL'

  useEffect(() => {
    if (progressPercent === 100 && !completionDate) {
      form.setValue('completionDate', new Date())
    } else if (progressPercent < 100 && completionDate) {
      form.setValue('completionDate', undefined)
    }
  }, [progressPercent, completionDate, form])

  const addMilestone = () => {
    const trimmed = newMilestoneTitle.trim()
    if (!trimmed) return
    const next: MilestoneItem[] = [...milestones, { id: `ms-${Date.now()}`, title: trimmed }]
    form.setValue('milestones', next, { shouldDirty: true })
    setNewMilestoneTitle('')
  }

  const removeMilestone = (id: string) => {
    form.setValue(
      'milestones',
      milestones.filter(m => m.id !== id),
      { shouldDirty: true }
    )
  }

  return (
    <div className="gba:space-y-6" data-testid={dataTestId}>
      {/* Title */}
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

      {/* Type (create only) */}
      {!isEditMode && (
        <FormField
          control={form.control}
          name="objectiveType"
          rules={{ required: 'Please select a goal type' }}
          render={({ field }) => (
            <FormItem data-testid={`${prefixDataTestId}-type-field`}>
              <FormLabel>Type *</FormLabel>
              <Select
                onValueChange={val => {
                  field.onChange(val)
                  form.setValue('milestones', [], { shouldDirty: false })
                  form.setValue('startValue', undefined, { shouldDirty: false })
                  form.setValue('targetValue', undefined, { shouldDirty: false })
                  form.setValue('progressPercent', 0, { shouldDirty: false })
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger data-testid={`${prefixDataTestId}-type-select`}>
                    <SelectValue placeholder="Select goal type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {OBJECTIVE_TYPES.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Start Date */}
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
            <FormLabel>{t('performance_goal.start_date_placeholder', 'Start date')} *</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="date"
                disabled={isStartDateDisabled}
                data-testid="flw_changePersonalData_startDate"
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

      {/* Due Date */}
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
            <FormLabel>{t('performance_goal.Due_date_placeholder', 'Due date')} *</FormLabel>
            <FormControl>
              <Input
                className="gba:w-full"
                {...field}
                type="date"
                disabled={isFieldsDisabled}
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

      {/* Progress — Percentage type (create only) */}
      {!isEditMode && isPercentage && (
        <FormField
          control={form.control}
          name="progressPercent"
          rules={{
            validate: (v: any) => {
              if (v === undefined || v === null || v === '') {
                return t('performance_goal.progress_required', 'Please enter progress percentage')
              }
              const num = Number(v)
              if (Number.isNaN(num)) {
                return t('performance_goal.invalid_number', 'Please enter a valid number (0-100)')
              }
              if (num < 0 || num > 100) {
                return t('performance_goal.range_error', 'Please enter a number between 0 and 100')
              }
              return true
            }
          }}
          render={({ field }) => (
            <FormItem data-testid={`${prefixDataTestId}-progress-field`}>
              <FormLabel>{t('performance_goal.progress_label', 'Progress')} *</FormLabel>
              <FormControl>
                <Input
                  className="gba:w-full"
                  {...field}
                  disabled={isFieldsDisabled}
                  placeholder={t('performance_goal.progress_placeholder', 'Enter progress percentage')}
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
      )}

      {/* Completion Date — only when progress === 100, create only */}
      {!isEditMode && isPercentage && progressPercent === 100 && (
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
                  className="gba:flex gba:h-10 gba:w-full gba:items-center gba:justify-between gba:rounded-md gba:border gba:border-input gba:bg-muted gba:px-3 gba:py-2 gba:text-sm"
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

      {/* Numeric type — Start Value + Target Value */}
      {isNumeric && (
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <FormField
            control={form.control}
            name="startValue"
            rules={{ required: 'Please enter a start value' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Value *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    className="gba:w-full"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="targetValue"
            rules={{ required: 'Please enter a target value' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Value *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="100"
                    className="gba:w-full"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {/* Milestone type — milestone list editor */}
      {isMilestone && (
        <div className="gba:space-y-3">
          <div className="gba:text-sm gba:font-medium">Milestones</div>
          {milestones.length > 0 && (
            <div className="gba:space-y-2">
              {milestones.map((milestone, index) => {
                const isExisting = !milestone.id.startsWith('ms-')
                return (
                  <div
                    key={milestone.id}
                    className="gba:flex gba:items-center gba:gap-2 gba:rounded-md gba:border gba:border-border gba:px-3 gba:py-2 gba:text-sm gba:bg-muted/30"
                  >
                    <span className="gba:w-5 gba:h-5 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:text-xs gba:text-muted-foreground gba:shrink-0 gba:font-medium">
                      {index + 1}
                    </span>
                    <span className="gba:flex-1">{milestone.title}</span>
                    {isExisting && (
                      <span className="gba:text-xs gba:text-muted-foreground gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded">
                        existing
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMilestone(milestone.id)}
                      className="gba:text-muted-foreground gba:hover:text-destructive gba:transition-colors gba:text-xs gba:px-1"
                      aria-label="Remove milestone"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          <div className="gba:flex gba:gap-2">
            <input
              type="text"
              value={newMilestoneTitle}
              onChange={e => setNewMilestoneTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addMilestone()
                }
              }}
              placeholder="Add a milestone…"
              className="gba:flex-1 gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring"
            />
            <button
              type="button"
              onClick={addMilestone}
              disabled={!newMilestoneTitle.trim()}
              className="gba:h-9 gba:px-3 gba:rounded-md gba:bg-primary gba:text-primary-foreground gba:text-sm disabled:gba:opacity-40"
            >
              Add
            </button>
          </div>
          {milestones.length === 0 && (
            <p className="gba:text-xs gba:text-muted-foreground">Add at least one milestone to define this goal.</p>
          )}
        </div>
      )}

      {/* Note — edit mode only; create mode has no comment field on the goal entity */}
      {isEditMode && (
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <textarea
                  rows={3}
                  placeholder="Add any context, links, or notes for this goal…"
                  className="gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:resize-none gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                  {...field}
                />
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
