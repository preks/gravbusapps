/** Date/time format options for header/footer insert dialog */

export interface DateFormatOption {
  id: string
  labelKey: string
  format: (d: Date) => string
}

export const DATE_FORMAT_OPTIONS: DateFormatOption[] = [
  {
    id: 'locale-short',
    labelKey: 'header-footer-sidebar-date-locale-short',
    format: d => d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  },
  {
    id: 'locale-long',
    labelKey: 'header-footer-sidebar-date-locale-long',
    format: d =>
      d.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
  },
  {
    id: 'iso',
    labelKey: 'header-footer-sidebar-date-iso',
    format: d => d.toISOString().slice(0, 10)
  },
  {
    id: 'time',
    labelKey: 'header-footer-sidebar-date-option-datetime',
    format: d => d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
  }
]
