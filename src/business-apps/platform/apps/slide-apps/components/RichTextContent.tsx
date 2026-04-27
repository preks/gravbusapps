/**
 * RichTextContent - Read-only renderer for the richer paragraph/run model on
 * TextElement. Preserves per-run styling, paragraph alignment, and bullets
 * coming from PPTX imports without requiring a full rich-text editor.
 *
 * Editing still falls back to the single-style textarea flow; when the user
 * saves a plain-text edit the paragraph array is discarded by callers so the
 * element stays consistent with the box-level styles.
 */

import React from 'react'
import type { RichTextParagraph, RichTextRun, RichTextTransform, TextElement } from './slideElements'
import { resolveFontStack } from './fontStack'

/**
 * Map our editor-facing {@link RichTextTransform} vocabulary to the subset of
 * CSS properties the browser needs to render it. Using `font-variant` for
 * small-caps keeps the underlying text casing untouched so copy/paste from
 * the rendered slide doesn't change the characters.
 */
function applyTransformStyle(base: React.CSSProperties, transform: RichTextTransform | undefined): React.CSSProperties {
  if (!transform || transform === 'none') return base
  if (transform === 'small-caps') {
    return { ...base, fontVariant: 'small-caps', textTransform: 'lowercase' }
  }
  return { ...base, textTransform: transform }
}

const BULLET_GLYPHS: Record<NonNullable<RichTextParagraph['bulletType']>, string> = {
  none: '',
  bullet: '•',
  number: ''
}

function alignmentToStyle(alignment: RichTextParagraph['alignment']): React.CSSProperties['textAlign'] {
  if (alignment === 'justify') return 'justify'
  if (alignment === 'center') return 'center'
  if (alignment === 'right') return 'right'
  return 'left'
}

function runStyle(run: RichTextRun, fallback: TextElement): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: resolveFontStack(run.fontFamily || fallback.fontFamily),
    fontSize: run.fontSize || fallback.fontSize,
    fontWeight: run.fontWeight || fallback.fontWeight,
    fontStyle: run.fontStyle || fallback.fontStyle,
    textDecoration: run.textDecoration || fallback.textDecoration,
    color: run.color || fallback.color,
    backgroundColor: run.backgroundColor
  }
  return applyTransformStyle(base, run.textTransform ?? fallback.textTransform)
}

export interface RichTextContentProps {
  element: TextElement
  paragraphs: RichTextParagraph[]
  'data-testid'?: string
}

export const RichTextContent: React.FC<RichTextContentProps> = ({
  element,
  paragraphs,
  'data-testid': testId = 'rich-text-content'
}) => {
  const numberedCounters = new Map<number, number>()

  return (
    <div data-testid={testId} style={{ width: '100%' }}>
      {paragraphs.map((paragraph, pIdx) => {
        const level = paragraph.indentLevel ?? 0
        const bulletType = paragraph.bulletType ?? 'none'

        let bulletLabel = ''
        if (bulletType === 'bullet') {
          bulletLabel = paragraph.bulletChar || BULLET_GLYPHS.bullet
        } else if (bulletType === 'number') {
          const next = (numberedCounters.get(level) ?? 0) + 1
          numberedCounters.set(level, next)
          for (const key of Array.from(numberedCounters.keys())) {
            if (key > level) numberedCounters.delete(key)
          }
          bulletLabel = `${next}.`
        } else {
          numberedCounters.delete(level)
        }

        const paragraphStyle: React.CSSProperties = {
          textAlign: alignmentToStyle(paragraph.alignment),
          lineHeight: paragraph.lineHeight ?? element.lineHeight,
          marginTop: paragraph.spaceBefore,
          marginBottom: paragraph.spaceAfter,
          paddingLeft: level > 0 ? level * 16 : undefined,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          display: bulletLabel ? 'flex' : 'block',
          gap: bulletLabel ? 6 : undefined,
          alignItems: bulletLabel ? 'baseline' : undefined
        }

        return (
          <div key={pIdx} style={paragraphStyle} data-testid={`${testId}-paragraph-${pIdx}`}>
            {bulletLabel && (
              <span style={{ color: element.color, flexShrink: 0 }} aria-hidden="true">
                {bulletLabel}
              </span>
            )}
            <span style={{ flex: bulletLabel ? 1 : undefined }}>
              {paragraph.runs.map((run, rIdx) => {
                const style = runStyle(run, element)
                if (run.hyperlink) {
                  return (
                    <a
                      key={rIdx}
                      href={run.hyperlink}
                      target="_blank"
                      rel="noreferrer noopener"
                      style={style}
                      data-testid={`${testId}-run-link-${pIdx}-${rIdx}`}
                    >
                      {run.text}
                    </a>
                  )
                }
                return (
                  <span key={rIdx} style={style} data-testid={`${testId}-run-${pIdx}-${rIdx}`}>
                    {run.text}
                  </span>
                )
              })}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default RichTextContent
