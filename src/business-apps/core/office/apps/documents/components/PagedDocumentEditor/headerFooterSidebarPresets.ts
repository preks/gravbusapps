/** TipTap-compatible HTML snippets for header/footer galleries */

export interface HeaderFooterPresetItem {
  id: string
  labelKey: string
  html: string
}

function createHeaderFooterPresetCell(content: string, align: 'left' | 'center' | 'right') {
  const paragraph = content.length > 0 ? `<p>${content}</p>` : '<p></p>'

  return `<td style="text-align: ${align}; vertical-align: middle; border-color: #d1d5db">${paragraph}</td>`
}

function createThreeColumnPreset(cells: { left?: string; center?: string; right?: string }) {
  return [
    '<table style="width: 100%">',
    '<tbody>',
    '<tr>',
    createHeaderFooterPresetCell(cells.left ?? '', 'left'),
    createHeaderFooterPresetCell(cells.center ?? '', 'center'),
    createHeaderFooterPresetCell(cells.right ?? '', 'right'),
    '</tr>',
    '</tbody>',
    '</table>'
  ].join('')
}

export const HEADER_PRESETS: HeaderFooterPresetItem[] = [
  { id: 'blank', labelKey: 'header-footer-sidebar-preset-blank', html: createThreeColumnPreset({}) },
  {
    id: 'title-left',
    labelKey: 'header-footer-sidebar-preset-header-title-left',
    html: createThreeColumnPreset({})
  },
  {
    id: 'title-center',
    labelKey: 'header-footer-sidebar-preset-header-title-center',
    html: createThreeColumnPreset({})
  },
  {
    id: 'page-right',
    labelKey: 'header-footer-sidebar-preset-header-page-right',
    html: createThreeColumnPreset({ right: '{page}' })
  }
]

export const FOOTER_PRESETS: HeaderFooterPresetItem[] = [
  { id: 'blank', labelKey: 'header-footer-sidebar-preset-blank', html: createThreeColumnPreset({}) },
  {
    id: 'page-center',
    labelKey: 'header-footer-sidebar-preset-footer-page-center',
    html: createThreeColumnPreset({ center: '{page}' })
  },
  {
    id: 'page-of-total',
    labelKey: 'header-footer-sidebar-preset-footer-page-total',
    html: createThreeColumnPreset({ center: 'Page {page} of {total}' })
  },
  {
    id: 'page-right',
    labelKey: 'header-footer-sidebar-preset-footer-page-right',
    html: createThreeColumnPreset({ right: '{page}' })
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
