/**
 * useReviewFormData Hook
 * Shared hook for HR Core review forms to reduce cognitive complexity
 * Consolidates change counting and field comparison logic
 */

import { useMemo } from 'react'

export interface FieldComparison {
  changed: boolean
  oldValue: string
  newValue: string
}

export interface UseReviewFormDataParams<T> {
  newData: T
  oldData: T
  fields: (keyof T)[]
  formatters?: Partial<Record<keyof T, (val: any) => string>>
  defaultFormatter?: (val: any) => string
  t: (key: string) => string
}

export interface UseReviewFormDataReturn<T> {
  changesCount: number
  hasOldData: boolean
  changeMode: 'INSERT' | 'UPDATE' | 'DELETE'
  isInsertMode: boolean
  compareField: (field: keyof T, customFormatter?: (val: any) => string) => FieldComparison
  getAlertMessage: () => string
  getCardTitle: () => string
}

/**
 * Hook to manage review form data comparison and change detection
 * Reduces cognitive complexity by centralizing common logic
 */
export function useReviewFormData<T extends Record<string, any>>({
  newData,
  oldData,
  fields,
  formatters = {},
  defaultFormatter,
  t
}: UseReviewFormDataParams<T>): UseReviewFormDataReturn<T> {
  // Check if old data exists
  const hasOldData = useMemo(() => {
    return fields.some(field => {
      const value = oldData[field]
      return value !== null && value !== undefined && value !== ''
    })
  }, [oldData, fields])

  // Determine change mode
  const changeMode = hasOldData ? 'UPDATE' : 'INSERT'
  const isInsertMode = changeMode === 'INSERT'

  // Default formatter function
  const format = (val: any): string => {
    if (defaultFormatter) {
      return defaultFormatter(val)
    }
    return String(val || t('value-na'))
  }

  // Compare two field values
  const compareFieldValues = (field: keyof T, customFormatter?: (val: any) => string): FieldComparison => {
    const formatter = customFormatter || formatters[field] || format
    const newFormatted = formatter(newData[field])
    const oldFormatted = formatter(oldData[field])

    return {
      changed: newFormatted !== oldFormatted,
      oldValue: oldFormatted,
      newValue: newFormatted
    }
  }

  // Count total changes
  const changesCount = useMemo(() => {
    if (!hasOldData) return 0

    return fields.reduce((count, field) => {
      const comparison = compareFieldValues(field)
      return comparison.changed ? count + 1 : count
    }, 0)
  }, [newData, oldData, hasOldData, fields, formatters])

  // Get alert message based on mode and changes
  const getAlertMessage = (): string => {
    if (changeMode === 'INSERT') {
      return t('alert-new-data')
    }
    if (hasOldData && changesCount > 0) {
      return t('alert-update-with-changes')
    }
    return t('alert-update-no-changes')
  }

  // Get card title based on mode
  const getCardTitle = (): string => {
    if (changeMode === 'INSERT') {
      return t('card-title-new-data')
    }
    return t('card-title-changes')
  }

  return {
    changesCount,
    hasOldData,
    changeMode,
    isInsertMode,
    compareField: compareFieldValues,
    getAlertMessage,
    getCardTitle
  }
}
