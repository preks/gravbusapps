import type { Attribute } from '@tiptap/core'
import { normalizeCellTextAlign, normalizeCellVerticalAlign, normalizeColorValue } from './styleUtils'

type HtmlAttributeRecord = Record<string, unknown>

function getElementStyles(element: HTMLElement) {
  return {
    textAlign: normalizeCellTextAlign(element.style.textAlign),
    verticalAlign: normalizeCellVerticalAlign(element.style.verticalAlign),
    backgroundColor: normalizeColorValue(element.style.backgroundColor),
    borderColor: normalizeColorValue(element.style.borderColor)
  }
}

export function createCustomCellAttributes() {
  const attrs: Record<string, Attribute> = {
    cellTextAlign: {
      default: null,
      parseHTML: element =>
        normalizeCellTextAlign(element.getAttribute('data-cell-text-align')) ??
        (element instanceof HTMLElement ? getElementStyles(element).textAlign : null),
      renderHTML: attributes => {
        const cellTextAlign = normalizeCellTextAlign(attributes.cellTextAlign)
        if (!cellTextAlign) return {}

        return {
          'data-cell-text-align': cellTextAlign
        } satisfies HtmlAttributeRecord
      }
    },
    cellVerticalAlign: {
      default: null,
      parseHTML: element =>
        normalizeCellVerticalAlign(element.getAttribute('data-cell-vertical-align')) ??
        (element instanceof HTMLElement ? getElementStyles(element).verticalAlign : null),
      renderHTML: attributes => {
        const cellVerticalAlign = normalizeCellVerticalAlign(attributes.cellVerticalAlign)
        if (!cellVerticalAlign) return {}

        return {
          'data-cell-vertical-align': cellVerticalAlign
        } satisfies HtmlAttributeRecord
      }
    },
    backgroundColor: {
      default: null,
      parseHTML: element =>
        normalizeColorValue(element.getAttribute('data-cell-background')) ??
        (element instanceof HTMLElement ? getElementStyles(element).backgroundColor : null),
      renderHTML: attributes => {
        const backgroundColor = normalizeColorValue(attributes.backgroundColor)
        if (!backgroundColor) return {}

        return {
          'data-cell-background': backgroundColor
        } satisfies HtmlAttributeRecord
      }
    },
    borderColor: {
      default: null,
      parseHTML: element =>
        normalizeColorValue(element.getAttribute('data-cell-border-color')) ??
        (element instanceof HTMLElement ? getElementStyles(element).borderColor : null),
      renderHTML: attributes => {
        const borderColor = normalizeColorValue(attributes.borderColor)
        if (!borderColor) return {}

        return {
          'data-cell-border-color': borderColor
        } satisfies HtmlAttributeRecord
      }
    }
  }

  return attrs
}
