// Utilities for measuring round-trip parity between imported and exported decks.
//
// These helpers are intentionally lightweight: they summarize the shape of a
// deck so tests and tooling can assert that export does not drop element
// types that import populated. Full binary-level round-trip comparison lives
// in the fixture regression suite.

import type { SlideData } from '../components/slideElements'

export interface DeckParitySummary {
  slideCount: number
  totalElements: number
  elementTypeCounts: Record<string, number>
  richTextElementCount: number
  richTableCount: number
  hyperlinkCount: number
  notesCount: number
}

export function summarizeDeck(slides: SlideData[]): DeckParitySummary {
  const summary: DeckParitySummary = {
    slideCount: slides.length,
    totalElements: 0,
    elementTypeCounts: {},
    richTextElementCount: 0,
    richTableCount: 0,
    hyperlinkCount: 0,
    notesCount: 0
  }

  for (const slide of slides) {
    if (slide.notes && slide.notes.trim().length > 0) summary.notesCount += 1

    for (const el of slide.elements) {
      summary.totalElements += 1
      summary.elementTypeCounts[el.type] = (summary.elementTypeCounts[el.type] || 0) + 1

      if (el.type === 'text') {
        if (el.paragraphs && el.paragraphs.length > 0) summary.richTextElementCount += 1
        if (el.links && el.links.length > 0) summary.hyperlinkCount += el.links.length
        if (el.paragraphs) {
          for (const p of el.paragraphs) {
            for (const run of p.runs) {
              if (run.hyperlink) summary.hyperlinkCount += 1
            }
          }
        }
      } else if (el.type === 'table') {
        if (el.cells && el.cells.length > 0) summary.richTableCount += 1
      }
    }
  }

  return summary
}

export interface ParityRegressionReport {
  lostElements: Record<string, number>
  gainedElements: Record<string, number>
  richTextDelta: number
  notesDelta: number
  hyperlinkDelta: number
  isRegression: boolean
}

/**
 * Compare two deck summaries. A regression occurs when the "after" summary
 * lost element types that existed in the "before" summary. Gains (e.g.
 * from a richer model) are allowed.
 */
export function compareDeckSummaries(before: DeckParitySummary, after: DeckParitySummary): ParityRegressionReport {
  const lost: Record<string, number> = {}
  const gained: Record<string, number> = {}
  const allTypes = new Set<string>([...Object.keys(before.elementTypeCounts), ...Object.keys(after.elementTypeCounts)])

  for (const type of allTypes) {
    const b = before.elementTypeCounts[type] || 0
    const a = after.elementTypeCounts[type] || 0
    if (a < b) lost[type] = b - a
    else if (a > b) gained[type] = a - b
  }

  const richTextDelta = after.richTextElementCount - before.richTextElementCount
  const notesDelta = after.notesCount - before.notesCount
  const hyperlinkDelta = after.hyperlinkCount - before.hyperlinkCount

  return {
    lostElements: lost,
    gainedElements: gained,
    richTextDelta,
    notesDelta,
    hyperlinkDelta,
    isRegression: Object.keys(lost).length > 0 || richTextDelta < 0 || notesDelta < 0 || hyperlinkDelta < 0
  }
}
