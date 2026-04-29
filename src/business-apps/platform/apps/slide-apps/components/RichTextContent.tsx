/**
 * RichTextContent - Read-only renderer for the richer paragraph/run model on
 * TextElement. Preserves per-run styling, paragraph alignment, and bullets
 * coming from PPTX imports without requiring a full rich-text editor.
 *
 * Inline editing reuses the same paragraph/run model, so this renderer should
 * stay visually aligned with the editing surface.
 */

import React from 'react'
import type { RichTextParagraph, TextElement } from './slideElements'
import { ensureImportedWebFonts } from './fontStack'
import { getRichTextParagraphMarker, getRichTextParagraphStyle, getRichTextRunStyle } from './richTextStyles'

ensureImportedWebFonts()

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
        const marker = getRichTextParagraphMarker(paragraph, numberedCounters)

        return (
          <div
            key={pIdx}
            style={getRichTextParagraphStyle(paragraph, element, marker)}
            data-testid={`${testId}-paragraph-${pIdx}`}
          >
            {marker && (
              <span style={{ color: element.color, flexShrink: 0 }} aria-hidden="true">
                {marker.label}
              </span>
            )}
            <span style={{ flex: marker ? 1 : undefined }}>
              {paragraph.runs.map((run, rIdx) => {
                const style = getRichTextRunStyle(run, element)
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
