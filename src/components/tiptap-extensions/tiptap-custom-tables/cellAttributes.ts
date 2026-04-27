import type { Attribute } from '@tiptap/core'
import {
  normalizeBorderStyle,
  normalizeCellTextAlign,
  normalizeCellVerticalAlign,
  normalizeColorValue,
  normalizeCssLength
} from './styleUtils'

type HtmlAttributeRecord = Record<string, unknown>

function getElementStyles(element: HTMLElement) {
  return {
    textAlign: normalizeCellTextAlign(element.style.textAlign),
    verticalAlign: normalizeCellVerticalAlign(element.style.verticalAlign),
    backgroundColor: normalizeColorValue(element.style.backgroundColor),
    borderColor: normalizeColorValue(element.style.borderColor),
    borderTopStyle: normalizeBorderStyle(element.style.borderTopStyle),
    borderTopWidth: normalizeCssLength(element.style.borderTopWidth),
    borderTopColor: normalizeColorValue(element.style.borderTopColor),
    borderRightStyle: normalizeBorderStyle(element.style.borderRightStyle),
    borderRightWidth: normalizeCssLength(element.style.borderRightWidth),
    borderRightColor: normalizeColorValue(element.style.borderRightColor),
    borderBottomStyle: normalizeBorderStyle(element.style.borderBottomStyle),
    borderBottomWidth: normalizeCssLength(element.style.borderBottomWidth),
    borderBottomColor: normalizeColorValue(element.style.borderBottomColor),
    borderLeftStyle: normalizeBorderStyle(element.style.borderLeftStyle),
    borderLeftWidth: normalizeCssLength(element.style.borderLeftWidth),
    borderLeftColor: normalizeColorValue(element.style.borderLeftColor)
  }
}

type CellAttrConfig = {
  key: string
  dataAttr: string
  readStyle: (styles: ReturnType<typeof getElementStyles>) => string | null
  normalize: (value: string | undefined | null) => string | null
}

function createNormalizedAttr({ key, dataAttr, readStyle, normalize }: CellAttrConfig): Attribute {
  return {
    default: null,
    parseHTML: element =>
      normalize(element.getAttribute(dataAttr)) ??
      (element instanceof HTMLElement ? readStyle(getElementStyles(element)) : null),
    renderHTML: attributes => {
      const value = normalize(attributes[key])
      if (!value) return {}

      return {
        [dataAttr]: value
      } satisfies HtmlAttributeRecord
    }
  }
}

export function createCustomCellAttributes() {
  const attrs: Record<string, Attribute> = {
    cellTextAlign: {
      default: null,
      parseHTML: element =>
        normalizeCellTextAlign(element.getAttribute('data-cell-text-align')) ??
        normalizeCellTextAlign(element.getAttribute('align')) ??
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

  const borderConfigs: CellAttrConfig[] = [
    {
      key: 'borderTopStyle',
      dataAttr: 'data-cell-border-top-style',
      readStyle: styles => styles.borderTopStyle,
      normalize: normalizeBorderStyle
    },
    {
      key: 'borderTopWidth',
      dataAttr: 'data-cell-border-top-width',
      readStyle: styles => styles.borderTopWidth,
      normalize: normalizeCssLength
    },
    {
      key: 'borderTopColor',
      dataAttr: 'data-cell-border-top-color',
      readStyle: styles => styles.borderTopColor,
      normalize: normalizeColorValue
    },
    {
      key: 'borderRightStyle',
      dataAttr: 'data-cell-border-right-style',
      readStyle: styles => styles.borderRightStyle,
      normalize: normalizeBorderStyle
    },
    {
      key: 'borderRightWidth',
      dataAttr: 'data-cell-border-right-width',
      readStyle: styles => styles.borderRightWidth,
      normalize: normalizeCssLength
    },
    {
      key: 'borderRightColor',
      dataAttr: 'data-cell-border-right-color',
      readStyle: styles => styles.borderRightColor,
      normalize: normalizeColorValue
    },
    {
      key: 'borderBottomStyle',
      dataAttr: 'data-cell-border-bottom-style',
      readStyle: styles => styles.borderBottomStyle,
      normalize: normalizeBorderStyle
    },
    {
      key: 'borderBottomWidth',
      dataAttr: 'data-cell-border-bottom-width',
      readStyle: styles => styles.borderBottomWidth,
      normalize: normalizeCssLength
    },
    {
      key: 'borderBottomColor',
      dataAttr: 'data-cell-border-bottom-color',
      readStyle: styles => styles.borderBottomColor,
      normalize: normalizeColorValue
    },
    {
      key: 'borderLeftStyle',
      dataAttr: 'data-cell-border-left-style',
      readStyle: styles => styles.borderLeftStyle,
      normalize: normalizeBorderStyle
    },
    {
      key: 'borderLeftWidth',
      dataAttr: 'data-cell-border-left-width',
      readStyle: styles => styles.borderLeftWidth,
      normalize: normalizeCssLength
    },
    {
      key: 'borderLeftColor',
      dataAttr: 'data-cell-border-left-color',
      readStyle: styles => styles.borderLeftColor,
      normalize: normalizeColorValue
    }
  ]

  for (const config of borderConfigs) {
    attrs[config.key] = createNormalizedAttr(config)
  }

  return attrs
}
