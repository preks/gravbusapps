/**
 * Hook for locale-aware date formatting
 * Returns formatters with translation function and locale already bound
 *
 * Use this hook in components for convenience.
 * For utility functions or when t is passed as prop, use taskFormatters.ts directly.
 */

import { useCallback } from 'react'
import { useTranslation, useLocale } from '@newwork/nw-design-system'
import {
  formatRelativeTime as baseFormatRelativeTime,
  formatDate as baseFormatDate,
  formatDateTime as baseFormatDateTime,
  isOverdue as baseIsOverdue,
  isDueSoon as baseIsDueSoon
} from '../utils/taskFormatters'
import translations from '../_i18n'

export const useDateFormatters = () => {
  const { t } = useTranslation(translations)
  const { locale } = useLocale()

  /**
   * Format date to relative time (e.g., "2 hours ago", "vor 2 Stunden")
   */
  const formatRelativeTime = useCallback(
    (date: string | Date): string => {
      return baseFormatRelativeTime(date, locale)
    },
    [locale]
  )

  /**
   * Format date with Today/Yesterday support
   * e.g., "Today", "Yesterday", "01/15/2025"
   */
  const formatDate = useCallback(
    (date: string | Date): string => {
      return baseFormatDate(date, locale, t)
    },
    [locale, t]
  )

  /**
   * Format date with time and Today/Yesterday support
   * e.g., "Today, 10:30 AM", "Yesterday, 14:30", "01/15/2025 10:30 AM"
   */
  const formatDateTime = useCallback(
    (date: string | Date): string => {
      return baseFormatDateTime(date, locale, t)
    },
    [locale, t]
  )

  /**
   * Check if date is overdue
   */
  const isOverdue = useCallback((dueDate?: string): boolean => {
    return baseIsOverdue(dueDate)
  }, [])

  /**
   * Check if date is due soon (within 24 hours)
   */
  const isDueSoon = useCallback((dueDate?: string): boolean => {
    return baseIsDueSoon(dueDate)
  }, [])

  return {
    formatRelativeTime,
    formatDate,
    formatDateTime,
    isOverdue,
    isDueSoon,
    locale // Export locale for components that need it
  }
}
