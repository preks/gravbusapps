import { useEffect } from 'react'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

/**
 * Catalog TimelineEvent / TimelineHeader still call window.lowcoder.i18n.
 * We map their English default labels to Fluent keys while this tab is open.
 */
const CATALOG_LABEL_TO_FLUENT_KEY: Record<string, string> = {
  Status: 'expense-items-column-status',
  From: 'expense-calendar-tooltip-from',
  To: 'expense-calendar-tooltip-to',
  Note: 'expense-calendar-tooltip-note',
  View: 'expense-calendar-view-mode',
  Today: 'expense-calendar-today',
  Days: 'expense-calendar-days',
  'Search in Employees': 'expense-calendar-search-placeholder',
  January: 'expense-calendar-month-january',
  February: 'expense-calendar-month-february',
  March: 'expense-calendar-month-march',
  April: 'expense-calendar-month-april',
  May: 'expense-calendar-month-may',
  June: 'expense-calendar-month-june',
  July: 'expense-calendar-month-july',
  August: 'expense-calendar-month-august',
  September: 'expense-calendar-month-september',
  October: 'expense-calendar-month-october',
  November: 'expense-calendar-month-november',
  December: 'expense-calendar-month-december'
}

type CatalogI18nWindow = Window & {
  lowcoder?: {
    i18n?: {
      t?: (key: string, label?: string | Record<string, unknown>) => string
      formatDate?: (dateValue: string | Date | undefined, format?: string, locale?: string | null) => string | undefined
      selectedLocale?: string
    }
    [key: string]: unknown
  }
}

let installDepth = 0
let installSnapshot: CatalogI18nWindow['lowcoder'] | undefined

function normalizeUserLocale(userLocale: string): string {
  const lower = userLocale.trim().toLowerCase()
  if (lower.startsWith('ro')) return 'ro-RO'
  if (lower.startsWith('de')) return 'de-DE'
  return 'en-US'
}

function resolveDefaultLabel(label?: string | Record<string, unknown>): string | undefined {
  if (typeof label === 'string' && label.length > 0) return label
  if (label && typeof label === 'object' && 'defaultValue' in label) {
    const value = label.defaultValue
    if (typeof value === 'string' && value.length > 0) return value
  }
  return undefined
}

function installCatalogFluentBridge(t: (key: string) => string, userLocale: string) {
  if (typeof window === 'undefined') return

  const win = window as CatalogI18nWindow
  const resolvedLocale = normalizeUserLocale(userLocale)

  if (installDepth === 0) installSnapshot = win.lowcoder
  installDepth += 1

  const previousI18n = win.lowcoder?.i18n

  const catalogT = (key: string, label?: string | Record<string, unknown>) => {
    const defaultLabel = resolveDefaultLabel(label)
    if (defaultLabel) {
      const fluentKey = CATALOG_LABEL_TO_FLUENT_KEY[defaultLabel]
      if (fluentKey) return t(fluentKey)
      return defaultLabel
    }

    const previous = previousI18n?.t?.(key, label)
    if (previous && previous !== key && !previous.startsWith('lowcoder:')) return previous

    return ''
  }

  const catalogFormatDate = (dateValue: string | Date | undefined, _format?: string, locale?: string | null) => {
    if (!dateValue) return undefined
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue)
    if (Number.isNaN(date.getTime())) return String(dateValue)
    const formatLocale = locale ?? previousI18n?.selectedLocale ?? resolvedLocale
    return new Intl.DateTimeFormat(formatLocale, { dateStyle: 'short' }).format(date)
  }

  win.lowcoder = {
    ...win.lowcoder,
    i18n: {
      ...previousI18n,
      selectedLocale: resolvedLocale,
      t: catalogT,
      formatDate: catalogFormatDate
    }
  }
}

function uninstallCatalogFluentBridge() {
  if (typeof window === 'undefined' || installDepth === 0) return

  installDepth -= 1
  if (installDepth > 0) return

  const win = window as CatalogI18nWindow
  if (installSnapshot === undefined) Reflect.deleteProperty(win, 'lowcoder')
  else win.lowcoder = installSnapshot
  installSnapshot = undefined
}

/** Fluent for our UI + catalog tooltip/header strings that cannot receive t() as a prop yet. */
export function useExpenseCalendarI18n(t: (key: string) => string, userLocale?: string) {
  const resolvedLocale = userLocale ?? getCurrentActiveUserLocale() ?? 'en-US'

  useEffect(() => {
    installCatalogFluentBridge(t, resolvedLocale)
    return () => uninstallCatalogFluentBridge()
  }, [t, resolvedLocale])
}
