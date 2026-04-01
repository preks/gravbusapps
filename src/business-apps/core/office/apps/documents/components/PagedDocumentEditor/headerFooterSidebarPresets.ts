/** TipTap-compatible HTML snippets for header/footer page-number placement */

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

/** Header/footer body placement for page numbers (not the margin slot). */
export function createPageNumberPlacementHtml(params: {
  alignment: 'left' | 'center' | 'right'
  includeTotal: boolean
}): string {
  const { alignment, includeTotal } = params
  const content = includeTotal ? '{page} of {total}' : '{page}'
  return createThreeColumnPreset({
    left: alignment === 'left' ? content : '',
    center: alignment === 'center' ? content : '',
    right: alignment === 'right' ? content : ''
  })
}

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
