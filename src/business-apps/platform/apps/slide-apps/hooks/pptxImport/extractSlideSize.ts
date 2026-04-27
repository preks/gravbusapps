// Extract the deck-level slide dimensions from ppt/presentation.xml.
//
// PowerPoint presentations declare their canvas via <p:sldSz cx cy type/> in
// EMU (English Metric Units, 914400 per inch). Common values:
//   - Widescreen (16:9): 12192000 x 6858000 EMU  -> 1280 x 720 px
//   - On-screen Show 4:3: 9144000 x 6858000 EMU  -> 960  x 720 px
//   - On-screen Show 16:10: 9144000 x 5715000 EMU -> 960  x 600 px
//   - A4 Paper (landscape): 10692000 x 7560000 EMU -> 1122 x 794 px
//   - Letter Paper (landscape): 10688000 x 8237250 EMU -> 1122 x 865 px
//   - Custom: any cx/cy the deck author chose
//
// Until this module existed the importer pretended every deck was 1280x720,
// which silently broke layout fidelity for 4:3 / A4 / custom-size decks by
// cramming their content into the left portion of a 16:9 canvas.

import type { SlideCanvasSize } from '../../components/slideElements'
import { DEFAULT_SLIDE_CANVAS_SIZE } from '../../components/slideElements'
import { emuToPixels } from './ooxmlUtils'

/**
 * Size category label derived from the PPTX type attribute (or inferred
 * from the aspect ratio when type is custom/missing). Useful for logging
 * and future UI that wants to offer presets.
 */
export type SlideSizePreset =
  | 'screen4x3'
  | 'screen16x9'
  | 'screen16x10'
  | 'letter'
  | 'a4'
  | 'b4iso'
  | 'b5iso'
  | '35mm'
  | 'overhead'
  | 'banner'
  | 'custom'

/** PPTX "type" attribute → preset label (spec: ST_SlideSizeType). */
const TYPE_MAP: Record<string, SlideSizePreset> = {
  screen4x3: 'screen4x3',
  screen16x9: 'screen16x9',
  screen16x10: 'screen16x10',
  letter: 'letter',
  a4: 'a4',
  b4ISO: 'b4iso',
  b5ISO: 'b5iso',
  '35mm': '35mm',
  overhead: 'overhead',
  banner: 'banner',
  custom: 'custom'
}

export interface ParsedSlideSize extends SlideCanvasSize {
  preset: SlideSizePreset
  /** Aspect ratio rounded to 3 decimals; helpful for quick comparisons. */
  aspectRatio: number
}

function classifyByAspect(aspect: number): SlideSizePreset {
  if (Math.abs(aspect - 16 / 9) < 0.01) return 'screen16x9'
  if (Math.abs(aspect - 4 / 3) < 0.01) return 'screen4x3'
  if (Math.abs(aspect - 16 / 10) < 0.01) return 'screen16x10'
  return 'custom'
}

/**
 * Parse <p:sldSz> from a `ppt/presentation.xml` Document. Returns `undefined`
 * when the element (or its attributes) is missing so callers can fall back to
 * {@link DEFAULT_SLIDE_CANVAS_SIZE}.
 */
export function extractSlideSize(presentationXml: Document): ParsedSlideSize | undefined {
  const sldSz = presentationXml.getElementsByTagName('p:sldSz')[0]
  if (!sldSz) return undefined

  const cxRaw = sldSz.getAttribute('cx')
  const cyRaw = sldSz.getAttribute('cy')
  if (!cxRaw || !cyRaw) return undefined

  const cx = Number(cxRaw)
  const cy = Number(cyRaw)
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || cx <= 0 || cy <= 0) return undefined

  // Round to whole pixels to keep coordinate math clean; PPTX decks never
  // care about sub-pixel canvas dimensions.
  const width = Math.max(1, Math.round(emuToPixels(cx)))
  const height = Math.max(1, Math.round(emuToPixels(cy)))

  const rawType = sldSz.getAttribute('type') || ''
  const declared = TYPE_MAP[rawType]
  const aspect = width / height
  const preset = declared && declared !== 'custom' ? declared : classifyByAspect(aspect)

  return {
    width,
    height,
    preset,
    aspectRatio: Math.round(aspect * 1000) / 1000
  }
}

export { DEFAULT_SLIDE_CANVAS_SIZE }
