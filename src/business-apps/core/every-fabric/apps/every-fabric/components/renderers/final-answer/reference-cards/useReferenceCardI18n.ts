import { useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../../../_i18n'
import { formatDate, humanizeToken } from './referenceCardUtils'

export function useReferenceCardI18n() {
  const { t } = useTranslation(translations)

  const field = useCallback((key: string) => t(`renderer-ref-field-${key}`), [t])

  const countChip = useCallback(
    (count: number | undefined, unitKey: string) => {
      if (!count || count < 1) return undefined
      return t(`renderer-ref-count-${unitKey}`, { count })
    },
    [t]
  )

  const intentLabel = useCallback(
    (intent?: string) => {
      if (!intent) return undefined
      return t(`renderer-ref-intent-${intent.replace(/_/g, '-')}`)
    },
    [t]
  )

  const relativeOrShortDate = useCallback(
    (value: string | undefined) => {
      if (!value) return undefined
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return value
      const diffMs = Date.now() - date.getTime()
      const diffMin = Math.round(diffMs / 60000)
      if (diffMin < 1) return t('renderer-ref-time-just-now')
      if (diffMin < 60) return t('renderer-ref-time-minutes-ago', { count: diffMin })
      const diffHours = Math.round(diffMin / 60)
      if (diffHours < 24) return t('renderer-ref-time-hours-ago', { count: diffHours })
      const diffDays = Math.round(diffHours / 24)
      if (diffDays === 1) return t('renderer-ref-time-yesterday')
      if (diffDays < 30) return t('renderer-ref-time-days-ago', { count: diffDays })
      return formatDate(value)
    },
    [t]
  )

  const progressSteps = useCallback(
    (completed: number, total: number) => t('renderer-ref-progress-steps', { completed, total }),
    [t]
  )

  const participantSummary = useCallback(
    (count: number, extra: number) => {
      const base = t('renderer-ref-participant-count', { count })
      return extra > 0 ? `${base} · +${extra}` : base
    },
    [t]
  )

  const unreadStatus = useCallback((count: number) => t('renderer-ref-unread-count', { count }), [t])

  const versionLabel = useCallback((version: number) => t('renderer-ref-version', { version }), [t])

  return {
    t,
    field,
    countChip,
    intentLabel,
    relativeOrShortDate,
    humanizeToken,
    progressSteps,
    participantSummary,
    unreadStatus,
    versionLabel
  }
}
