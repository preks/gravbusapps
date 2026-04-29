import type { CSSProperties } from 'react'
import type { RichTextParagraph, RichTextRun, ShapeInText, TextElement } from './slideElements'
import { textTransformToCss } from './slideElements'
import { resolveFontStack } from './fontStack'

export type RichTextRenderable = Pick<
  TextElement | ShapeInText,
  | 'fontFamily'
  | 'fontSize'
  | 'fontWeight'
  | 'fontStyle'
  | 'textDecoration'
  | 'textAlign'
  | 'color'
  | 'lineHeight'
  | 'letterSpacing'
  | 'textTransform'
>

export interface RichTextParagraphMarker {
  bulletType: NonNullable<RichTextParagraph['bulletType']>
  label: string
}

const DEFAULT_BULLET_GLYPH = '•'

function paragraphHasVisibleText(paragraph: RichTextParagraph): boolean {
  return paragraph.runs.some(run => run.text.trim().length > 0)
}

function alignmentToStyle(
  alignment: RichTextParagraph['alignment'],
  fallback: RichTextRenderable['textAlign']
): CSSProperties['textAlign'] {
  if (alignment === 'justify') return 'justify'
  if (alignment === 'center') return 'center'
  if (alignment === 'right') return 'right'
  return alignment ?? fallback
}

export function getRichTextRunStyle(run: RichTextRun, fallback: RichTextRenderable): CSSProperties {
  return {
    fontFamily: resolveFontStack(run.fontFamily || fallback.fontFamily),
    fontSize: run.fontSize || fallback.fontSize,
    fontWeight: run.fontWeight || fallback.fontWeight,
    fontStyle: run.fontStyle || fallback.fontStyle,
    textDecoration: run.textDecoration || fallback.textDecoration,
    color: run.color || fallback.color,
    backgroundColor: run.backgroundColor,
    ...textTransformToCss(run.textTransform ?? fallback.textTransform)
  }
}

export function getRichTextBoxStyle(element: RichTextRenderable): CSSProperties {
  return {
    width: '100%',
    fontFamily: resolveFontStack(element.fontFamily),
    fontSize: element.fontSize,
    fontWeight: element.fontWeight,
    fontStyle: element.fontStyle,
    textDecoration: element.textDecoration,
    textAlign: element.textAlign,
    color: element.color,
    lineHeight: element.lineHeight,
    letterSpacing: element.letterSpacing,
    ...textTransformToCss(element.textTransform),
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  }
}

export function getRichTextParagraphMarker(
  paragraph: RichTextParagraph,
  numberedCounters?: Map<number, number>
): RichTextParagraphMarker | null {
  const level = paragraph.indentLevel ?? 0
  const bulletType = paragraph.bulletType ?? 'none'
  const hasVisibleText = paragraphHasVisibleText(paragraph)

  if (!hasVisibleText) {
    if (bulletType !== 'number') {
      numberedCounters?.delete(level)
    }
    return null
  }

  if (bulletType === 'bullet') {
    return {
      bulletType,
      label: paragraph.bulletChar || DEFAULT_BULLET_GLYPH
    }
  }

  if (bulletType === 'number') {
    const next = (numberedCounters?.get(level) ?? 0) + 1
    numberedCounters?.set(level, next)
    if (numberedCounters) {
      for (const key of Array.from(numberedCounters.keys())) {
        if (key > level) numberedCounters.delete(key)
      }
    }
    return {
      bulletType,
      label: `${next}.`
    }
  }

  numberedCounters?.delete(level)
  return null
}

export function getRichTextParagraphStyle(
  paragraph: RichTextParagraph,
  fallback: RichTextRenderable,
  marker?: RichTextParagraphMarker | null
): CSSProperties {
  const level = paragraph.indentLevel ?? 0

  return {
    textAlign: alignmentToStyle(paragraph.alignment, fallback.textAlign),
    lineHeight: paragraph.lineHeight ?? fallback.lineHeight,
    marginTop: paragraph.spaceBefore,
    marginBottom: paragraph.spaceAfter,
    paddingLeft: level > 0 ? level * 16 : undefined,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    display: marker ? 'flex' : 'block',
    gap: marker ? 6 : undefined,
    alignItems: marker ? 'baseline' : undefined
  }
}
