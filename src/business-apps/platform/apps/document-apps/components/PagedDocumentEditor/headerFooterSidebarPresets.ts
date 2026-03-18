/** TipTap-compatible HTML snippets for header/footer galleries */

export interface HeaderFooterPresetItem {
  id: string
  labelKey: string
  html: string
}

export const HEADER_PRESETS: HeaderFooterPresetItem[] = [
  { id: 'blank', labelKey: 'header-footer-sidebar-preset-blank', html: '<p></p>' },
  {
    id: 'title-left',
    labelKey: 'header-footer-sidebar-preset-header-title-left',
    html: '<p style="text-align: left"></p>'
  },
  {
    id: 'title-center',
    labelKey: 'header-footer-sidebar-preset-header-title-center',
    html: '<p style="text-align: center"></p>'
  },
  {
    id: 'page-right',
    labelKey: 'header-footer-sidebar-preset-header-page-right',
    html: '<p style="text-align: right">{page}</p>'
  }
]

export const FOOTER_PRESETS: HeaderFooterPresetItem[] = [
  { id: 'blank', labelKey: 'header-footer-sidebar-preset-blank', html: '<p></p>' },
  {
    id: 'page-center',
    labelKey: 'header-footer-sidebar-preset-footer-page-center',
    html: '<p style="text-align: center">{page}</p>'
  },
  {
    id: 'page-of-total',
    labelKey: 'header-footer-sidebar-preset-footer-page-total',
    html: '<p style="text-align: center">Page {page} of {total}</p>'
  },
  {
    id: 'page-right',
    labelKey: 'header-footer-sidebar-preset-footer-page-right',
    html: '<p style="text-align: right">{page}</p>'
  }
]

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
