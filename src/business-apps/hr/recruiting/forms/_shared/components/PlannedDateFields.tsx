import React from 'react'
import { Control, FieldValues, Path } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, DateInput } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { JOB_REQUEST_LABELS } from '../constants/jobRequestLabels'

interface PlannedDateFieldsProps<T extends FieldValues> {
  control: Control<T>
  prefixDataTestId: string
  plannedHireDateName?: Path<T>
  plannedExitDateName?: Path<T>
}

/**
 * Reusable component for Planned Hiring Date and Planned Exit Date fields
 * Eliminates duplication across JobRequestForm, JobRequestSubmitForm, etc.
 */
export function PlannedDateFields<T extends FieldValues>({
  control,
  prefixDataTestId,
  plannedHireDateName = 'plannedHireDate' as Path<T>,
  plannedExitDateName = 'plannedExitDate' as Path<T>
}: PlannedDateFieldsProps<T>) {
  return (
    <div className="gba:grid gba:grid-cols-2 gba:gap-4">
      <FormField
        control={control}
        name={plannedHireDateName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{JOB_REQUEST_LABELS.plannedHiringDate}</FormLabel>
            <FormControl>
              <DateInput
                type="date"
                value={field.value || ''}
                onChange={value => field.onChange(value || '')}
                placeholder={JOB_REQUEST_LABELS.plannedHiringDatePlaceholder}
                data-testid={formatDataTestId(prefixDataTestId, 'planned-hire-date-input')}
                captionLayout="dropdown"
                outputFormat="iso"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={plannedExitDateName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{JOB_REQUEST_LABELS.plannedExitDate}</FormLabel>
            <FormControl>
              <DateInput
                type="date"
                value={field.value || ''}
                onChange={value => field.onChange(value || '')}
                placeholder={JOB_REQUEST_LABELS.plannedExitDatePlaceholder}
                data-testid={formatDataTestId(prefixDataTestId, 'planned-exit-date-input')}
                captionLayout="dropdown"
                outputFormat="iso"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
