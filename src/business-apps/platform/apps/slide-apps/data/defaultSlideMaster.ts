// Built-in default Slide Master with 9 standard layouts (PowerPoint "Office Theme" parity).

import type { SlideMaster, SlideLayout } from '../types/slideMaster'
import type { SlideTheme } from '../components/slideThemes'
import type { AnySlideElement, SlideData } from '../components/slideElements'
import { createTextElement, createShapeElement, createImageElement } from '../components/slideElements'

const CANVAS_W = 1280
const CANVAS_H = 720
const MARGIN = 60
const TITLE_HEIGHT = 80
const CONTENT_TOP = 170

export const DEFAULT_MASTER_ID = 'default-master'

let idCounter = 0
function uid(prefix: string): string {
  idCounter += 1
  return `${prefix}-default-${idCounter}`
}

function resetIds() {
  idCounter = 0
}

function titleElement(theme: SlideTheme, overrides?: Record<string, unknown>): AnySlideElement {
  return createTextElement({
    id: uid('title'),
    content: 'Click to add title',
    position: { x: MARGIN, y: MARGIN },
    size: { width: CANVAS_W - MARGIN * 2, height: TITLE_HEIGHT },
    fontSize: 40,
    fontWeight: 'bold',
    fontFamily: theme.theme.fonts.header,
    color: theme.theme.colors.primary,
    textAlign: 'left',
    verticalAlign: 'middle',
    ...overrides
  })
}

function subtitleElement(theme: SlideTheme, overrides?: Record<string, unknown>): AnySlideElement {
  return createTextElement({
    id: uid('subtitle'),
    content: 'Click to add subtitle',
    fontSize: 24,
    fontWeight: 'normal',
    fontFamily: theme.theme.fonts.text,
    color: '#64748b',
    textAlign: 'left',
    verticalAlign: 'top',
    ...overrides
  })
}

function bodyTextElement(theme: SlideTheme, content: string, overrides?: Record<string, unknown>): AnySlideElement {
  return createTextElement({
    id: uid('body'),
    content,
    fontSize: 20,
    fontWeight: 'normal',
    fontFamily: theme.theme.fonts.text,
    color: '#334155',
    textAlign: 'left',
    verticalAlign: 'top',
    lineHeight: 1.6,
    ...overrides
  })
}

function accentBar(theme: SlideTheme, overrides?: Record<string, unknown>): AnySlideElement {
  return createShapeElement('rectangle', {
    id: uid('accent'),
    position: { x: 0, y: CANVAS_H - 8 },
    size: { width: CANVAS_W, height: 8 },
    fill: theme.theme.colors.secondary,
    strokeWidth: 0,
    strokeColor: 'transparent',
    zIndex: 0,
    ...overrides
  })
}

function imagePlaceholder(overrides?: Record<string, unknown>): AnySlideElement {
  return createImageElement('', {
    id: uid('img'),
    alt: 'Click to add image',
    objectFit: 'cover',
    borderRadius: 8,
    ...overrides
  })
}

// --- Layout generators ---

function titleSlideLayout(masterId: string, theme: SlideTheme): SlideLayout {
  return {
    id: 'title-slide',
    name: 'Title Slide',
    description: 'Centered title and subtitle for opening slides',
    masterId,
    elements: [
      createTextElement({
        id: uid('title'),
        content: 'Presentation Title',
        position: { x: MARGIN + 40, y: 200 },
        size: { width: CANVAS_W - (MARGIN + 40) * 2, height: 100 },
        fontSize: 52,
        fontWeight: 'bold',
        fontFamily: theme.theme.fonts.header,
        color: theme.theme.colors.primary,
        textAlign: 'center',
        verticalAlign: 'middle'
      }),
      subtitleElement(theme, {
        position: { x: MARGIN + 100, y: 320 },
        size: { width: CANVAS_W - (MARGIN + 100) * 2, height: 60 },
        textAlign: 'center'
      }),
      accentBar(theme)
    ]
  }
}

function titleContentLayout(masterId: string, theme: SlideTheme): SlideLayout {
  return {
    id: 'title-content',
    name: 'Title and Content',
    description: 'Title bar with a content area for text or bullets',
    masterId,
    elements: [
      titleElement(theme),
      createShapeElement('rectangle', {
        id: uid('divider'),
        position: { x: MARGIN, y: MARGIN + TITLE_HEIGHT + 10 },
        size: { width: CANVAS_W - MARGIN * 2, height: 2 },
        fill: theme.theme.colors.secondary,
        strokeWidth: 0,
        strokeColor: 'transparent',
        zIndex: 0
      }),
      bodyTextElement(theme, '- First key point\n- Second key point\n- Third key point', {
        position: { x: MARGIN, y: CONTENT_TOP },
        size: { width: CANVAS_W - MARGIN * 2, height: CANVAS_H - CONTENT_TOP - MARGIN }
      }),
      accentBar(theme)
    ]
  }
}

function sectionHeaderLayout(masterId: string, theme: SlideTheme): SlideLayout {
  return {
    id: 'section-header',
    name: 'Section Header',
    description: 'Large section title with optional description',
    masterId,
    elements: [
      createTextElement({
        id: uid('section-title'),
        content: 'Section Title',
        position: { x: MARGIN + 40, y: 210 },
        size: { width: CANVAS_W - (MARGIN + 40) * 2, height: 90 },
        fontSize: 48,
        fontWeight: 'bold',
        fontFamily: theme.theme.fonts.header,
        color: theme.theme.colors.primary,
        textAlign: 'left',
        verticalAlign: 'bottom'
      }),
      createShapeElement('rectangle', {
        id: uid('divider'),
        position: { x: MARGIN + 40, y: 310 },
        size: { width: 120, height: 4 },
        fill: theme.theme.colors.secondary,
        strokeWidth: 0,
        strokeColor: 'transparent',
        zIndex: 0
      }),
      subtitleElement(theme, {
        position: { x: MARGIN + 40, y: 330 },
        size: { width: CANVAS_W - (MARGIN + 40) * 2, height: 60 },
        content: 'Description or context for this section'
      })
    ]
  }
}

function twoContentLayout(masterId: string, theme: SlideTheme): SlideLayout {
  const colWidth = (CANVAS_W - MARGIN * 2 - 40) / 2
  return {
    id: 'two-content',
    name: 'Two Content',
    description: 'Title with two side-by-side content columns',
    masterId,
    elements: [
      titleElement(theme),
      createShapeElement('rectangle', {
        id: uid('divider'),
        position: { x: MARGIN, y: MARGIN + TITLE_HEIGHT + 10 },
        size: { width: CANVAS_W - MARGIN * 2, height: 2 },
        fill: theme.theme.colors.secondary,
        strokeWidth: 0,
        strokeColor: 'transparent',
        zIndex: 0
      }),
      bodyTextElement(theme, '- Left column point 1\n- Left column point 2\n- Left column point 3', {
        position: { x: MARGIN, y: CONTENT_TOP },
        size: { width: colWidth, height: CANVAS_H - CONTENT_TOP - MARGIN }
      }),
      bodyTextElement(theme, '- Right column point 1\n- Right column point 2\n- Right column point 3', {
        position: { x: MARGIN + colWidth + 40, y: CONTENT_TOP },
        size: { width: colWidth, height: CANVAS_H - CONTENT_TOP - MARGIN }
      }),
      accentBar(theme)
    ]
  }
}

function comparisonLayout(masterId: string, theme: SlideTheme): SlideLayout {
  const colWidth = (CANVAS_W - MARGIN * 2 - 40) / 2
  const headerH = 50
  return {
    id: 'comparison',
    name: 'Comparison',
    description: 'Title with two labeled comparison columns',
    masterId,
    elements: [
      titleElement(theme),
      createShapeElement('rectangle', {
        id: uid('divider'),
        position: { x: MARGIN, y: MARGIN + TITLE_HEIGHT + 10 },
        size: { width: CANVAS_W - MARGIN * 2, height: 2 },
        fill: theme.theme.colors.secondary,
        strokeWidth: 0,
        strokeColor: 'transparent',
        zIndex: 0
      }),
      createTextElement({
        id: uid('col-header-l'),
        content: 'Option A',
        position: { x: MARGIN, y: CONTENT_TOP },
        size: { width: colWidth, height: headerH },
        fontSize: 22,
        fontWeight: 'bold',
        fontFamily: theme.theme.fonts.header,
        color: theme.theme.colors.secondary,
        textAlign: 'left',
        verticalAlign: 'middle'
      }),
      createTextElement({
        id: uid('col-header-r'),
        content: 'Option B',
        position: { x: MARGIN + colWidth + 40, y: CONTENT_TOP },
        size: { width: colWidth, height: headerH },
        fontSize: 22,
        fontWeight: 'bold',
        fontFamily: theme.theme.fonts.header,
        color: theme.theme.colors.secondary,
        textAlign: 'left',
        verticalAlign: 'middle'
      }),
      bodyTextElement(theme, '- Strength one\n- Strength two\n- Strength three', {
        position: { x: MARGIN, y: CONTENT_TOP + headerH + 10 },
        size: { width: colWidth, height: CANVAS_H - CONTENT_TOP - headerH - 10 - MARGIN }
      }),
      bodyTextElement(theme, '- Strength one\n- Strength two\n- Strength three', {
        position: { x: MARGIN + colWidth + 40, y: CONTENT_TOP + headerH + 10 },
        size: { width: colWidth, height: CANVAS_H - CONTENT_TOP - headerH - 10 - MARGIN }
      }),
      accentBar(theme)
    ]
  }
}

function titleOnlyLayout(masterId: string, theme: SlideTheme): SlideLayout {
  return {
    id: 'title-only',
    name: 'Title Only',
    description: 'Title bar with empty canvas below',
    masterId,
    elements: [
      titleElement(theme),
      createShapeElement('rectangle', {
        id: uid('divider'),
        position: { x: MARGIN, y: MARGIN + TITLE_HEIGHT + 10 },
        size: { width: CANVAS_W - MARGIN * 2, height: 2 },
        fill: theme.theme.colors.secondary,
        strokeWidth: 0,
        strokeColor: 'transparent',
        zIndex: 0
      }),
      accentBar(theme)
    ]
  }
}

function blankLayout(masterId: string): SlideLayout {
  return {
    id: 'blank',
    name: 'Blank',
    description: 'Empty slide',
    masterId,
    elements: [],
    background: { type: 'solid', color: '#ffffff' }
  }
}

function contentCaptionLayout(masterId: string, theme: SlideTheme): SlideLayout {
  const contentW = (CANVAS_W - MARGIN * 2 - 40) * 0.6
  const captionW = (CANVAS_W - MARGIN * 2 - 40) * 0.4
  return {
    id: 'content-caption',
    name: 'Content with Caption',
    description: 'Content area with a side caption column',
    masterId,
    elements: [
      titleElement(theme),
      createShapeElement('rectangle', {
        id: uid('divider'),
        position: { x: MARGIN, y: MARGIN + TITLE_HEIGHT + 10 },
        size: { width: CANVAS_W - MARGIN * 2, height: 2 },
        fill: theme.theme.colors.secondary,
        strokeWidth: 0,
        strokeColor: 'transparent',
        zIndex: 0
      }),
      bodyTextElement(theme, '- Main content point 1\n- Main content point 2\n- Main content point 3', {
        position: { x: MARGIN, y: CONTENT_TOP },
        size: { width: contentW, height: CANVAS_H - CONTENT_TOP - MARGIN }
      }),
      createShapeElement('rounded-rectangle', {
        id: uid('caption-bg'),
        position: { x: MARGIN + contentW + 40, y: CONTENT_TOP },
        size: { width: captionW, height: CANVAS_H - CONTENT_TOP - MARGIN },
        fill: '#f8fafc',
        strokeWidth: 1,
        strokeColor: '#e2e8f0',
        cornerRadius: 8,
        zIndex: 0
      }),
      bodyTextElement(theme, 'Add a caption or additional context for the main content.', {
        position: { x: MARGIN + contentW + 56, y: CONTENT_TOP + 16 },
        size: { width: captionW - 32, height: CANVAS_H - CONTENT_TOP - MARGIN - 32 },
        fontSize: 16,
        color: '#64748b'
      }),
      accentBar(theme)
    ]
  }
}

function pictureCaptionLayout(masterId: string, theme: SlideTheme): SlideLayout {
  const imgW = (CANVAS_W - MARGIN * 2 - 40) * 0.55
  const captionW = (CANVAS_W - MARGIN * 2 - 40) * 0.45
  return {
    id: 'picture-caption',
    name: 'Picture with Caption',
    description: 'Image placeholder with a side caption',
    masterId,
    elements: [
      titleElement(theme),
      createShapeElement('rectangle', {
        id: uid('divider'),
        position: { x: MARGIN, y: MARGIN + TITLE_HEIGHT + 10 },
        size: { width: CANVAS_W - MARGIN * 2, height: 2 },
        fill: theme.theme.colors.secondary,
        strokeWidth: 0,
        strokeColor: 'transparent',
        zIndex: 0
      }),
      imagePlaceholder({
        position: { x: MARGIN, y: CONTENT_TOP },
        size: { width: imgW, height: CANVAS_H - CONTENT_TOP - MARGIN }
      }),
      createTextElement({
        id: uid('caption-title'),
        content: 'Image Caption',
        position: { x: MARGIN + imgW + 40, y: CONTENT_TOP },
        size: { width: captionW, height: 50 },
        fontSize: 22,
        fontWeight: 'bold',
        fontFamily: theme.theme.fonts.header,
        color: theme.theme.colors.primary,
        textAlign: 'left',
        verticalAlign: 'top'
      }),
      bodyTextElement(theme, 'Add a description for the image shown on the left.', {
        position: { x: MARGIN + imgW + 40, y: CONTENT_TOP + 60 },
        size: { width: captionW, height: CANVAS_H - CONTENT_TOP - 60 - MARGIN },
        fontSize: 18,
        color: '#64748b'
      }),
      accentBar(theme)
    ]
  }
}

/**
 * Generate the built-in default SlideMaster for a given theme.
 * Each call produces fresh element IDs.
 */
export function createDefaultSlideMaster(theme: SlideTheme): SlideMaster {
  resetIds()

  const masterId = DEFAULT_MASTER_ID

  return {
    id: masterId,
    name: 'Default Theme',
    sharedElements: [],
    background: { type: 'solid', color: '#ffffff' },
    isDefault: true,
    layouts: [
      titleSlideLayout(masterId, theme),
      titleContentLayout(masterId, theme),
      sectionHeaderLayout(masterId, theme),
      twoContentLayout(masterId, theme),
      comparisonLayout(masterId, theme),
      titleOnlyLayout(masterId, theme),
      blankLayout(masterId),
      contentCaptionLayout(masterId, theme),
      pictureCaptionLayout(masterId, theme)
    ]
  }
}

/**
 * Get the effective layouts for a presentation.
 * Returns the presentation's custom masters if present, otherwise the default.
 */
export function getEffectiveMasters(masters: SlideMaster[] | undefined, theme: SlideTheme): SlideMaster[] {
  if (masters && masters.length > 0) return masters
  return [createDefaultSlideMaster(theme)]
}

/**
 * Find a layout by ID across all masters.
 */
export function findLayoutById(
  masters: SlideMaster[],
  layoutId: string
): { master: SlideMaster; layout: SlideLayout } | undefined {
  for (const master of masters) {
    const layout = master.layouts.find(l => l.id === layoutId)
    if (layout) return { master, layout }
  }
  return undefined
}

/**
 * Clone a layout's elements with fresh IDs to create a new slide.
 */
export function cloneLayoutToSlide(
  layout: SlideLayout,
  master: SlideMaster
): { elements: AnySlideElement[]; background: import('../components/slideElements').SlideBackground } {
  const now = Date.now()
  const elements = layout.elements.map((el, i) => ({
    ...el,
    id: `${el.type}-${now}-${i}-${Math.random().toString(36).slice(2, 9)}`
  }))

  const background = layout.background || master.background

  return { elements, background }
}

const AVG_CHAR_WIDTH_RATIO = 0.55

/**
 * Calculate minimum height needed for a text element to display its content
 * without clipping. Accounts for line breaks, word wrapping, and padding.
 */
export function calcMinTextHeight(el: AnySlideElement): number {
  if (el.type !== 'text') return el.size.height

  const text = ((el as any).content as string) || ''
  const fontSize = ((el as any).fontSize as number) || 20
  const lineHeight = ((el as any).lineHeight as number) || 1.4
  const padding = ((el as any).padding as number) || 8
  const availableWidth = el.size.width - padding * 2

  const avgCharPx = fontSize * AVG_CHAR_WIDTH_RATIO
  const charsPerLine = Math.max(1, Math.floor(availableWidth / avgCharPx))

  let totalLines = 0
  const paragraphs = text.split('\n')
  for (const para of paragraphs) {
    totalLines += Math.max(1, Math.ceil(para.length / charsPerLine))
  }

  return totalLines * fontSize * lineHeight + padding * 2
}

/**
 * Ensure a text element is tall enough to display its content.
 * Returns a new element with adjusted height if needed (capped at canvas height).
 */
export function ensureTextFits(el: AnySlideElement): AnySlideElement {
  if (el.type !== 'text') return el
  const minH = calcMinTextHeight(el)
  if (minH <= el.size.height) return el
  const cappedH = Math.min(minH, CANVAS_H - el.position.y - 10)
  return { ...el, size: { ...el.size, height: Math.max(cappedH, el.size.height) } }
}

// Theme re-coloring: maps old theme colors/fonts to new ones on existing slides

function normalizeHex(c: string): string {
  return c.toLowerCase().trim()
}

function buildColorMap(oldTheme: SlideTheme, newTheme: SlideTheme): Map<string, string> {
  const map = new Map<string, string>()
  const old = oldTheme.theme.colors
  const nw = newTheme.theme.colors
  const pairs: [string, string][] = [
    [old.primary, nw.primary],
    [old.secondary, nw.secondary],
    [old.tertiary, nw.tertiary],
    [old.quaternary, nw.quaternary]
  ]
  for (const [from, to] of pairs) {
    if (normalizeHex(from) !== normalizeHex(to)) {
      map.set(normalizeHex(from), to)
    }
  }
  return map
}

function buildFontMap(oldTheme: SlideTheme, newTheme: SlideTheme): Map<string, string> {
  const map = new Map<string, string>()
  const old = oldTheme.theme.fonts
  const nw = newTheme.theme.fonts
  if (old.header !== nw.header) map.set(old.header, nw.header)
  if (old.text !== nw.text) map.set(old.text, nw.text)
  if (old.monospace !== nw.monospace) map.set(old.monospace, nw.monospace)
  return map
}

function remapColor(color: string | undefined, colorMap: Map<string, string>): string | undefined {
  if (!color) return color
  const mapped = colorMap.get(normalizeHex(color))
  return mapped ?? color
}

function recolorElement(
  el: AnySlideElement,
  colorMap: Map<string, string>,
  fontMap: Map<string, string>
): AnySlideElement {
  const a = el as any
  const patched: any = { ...a }
  let changed = false

  if (a.color) {
    const nc = remapColor(a.color, colorMap)
    if (nc !== a.color) {
      patched.color = nc
      changed = true
    }
  }
  if (a.fill) {
    const nf = remapColor(a.fill, colorMap)
    if (nf !== a.fill) {
      patched.fill = nf
      changed = true
    }
  }
  if (a.stroke) {
    const ns = remapColor(a.stroke, colorMap)
    if (ns !== a.stroke) {
      patched.stroke = ns
      changed = true
    }
  }
  if (a.backgroundColor) {
    const nb = remapColor(a.backgroundColor, colorMap)
    if (nb !== a.backgroundColor) {
      patched.backgroundColor = nb
      changed = true
    }
  }
  if (a.fontFamily && fontMap.has(a.fontFamily)) {
    patched.fontFamily = fontMap.get(a.fontFamily)
    changed = true
  }

  return changed ? patched : el
}

function recolorBackground(bg: SlideData['background'], colorMap: Map<string, string>): SlideData['background'] {
  if (!bg) return bg
  if (bg.type === 'solid' && bg.color) {
    const nc = remapColor(bg.color, colorMap)
    if (nc !== bg.color) return { ...bg, color: nc }
  }
  if (bg.type === 'gradient' && bg.stops) {
    let changed = false
    const newStops = bg.stops.map(s => {
      const nc = remapColor(s.color, colorMap)
      if (nc !== s.color) {
        changed = true
        return { ...s, color: nc }
      }
      return s
    })
    if (changed) return { ...bg, stops: newStops }
  }
  return bg
}

/**
 * Re-color all slides when the theme changes.
 * Maps old theme colors (primary/secondary/tertiary/quaternary) and fonts
 * to the new theme's equivalents across all element properties and slide backgrounds.
 */
export function recolorSlidesForTheme(slides: SlideData[], oldTheme: SlideTheme, newTheme: SlideTheme): SlideData[] {
  if (oldTheme.id === newTheme.id) return slides

  const colorMap = buildColorMap(oldTheme, newTheme)
  const fontMap = buildFontMap(oldTheme, newTheme)

  if (colorMap.size === 0 && fontMap.size === 0) return slides

  return slides.map(slide => {
    const newElements = slide.elements.map(el => recolorElement(el, colorMap, fontMap))
    const newBg = recolorBackground(slide.background, colorMap)
    const elementsChanged = newElements.some((el, i) => el !== slide.elements[i])
    const bgChanged = newBg !== slide.background

    if (!elementsChanged && !bgChanged) return slide
    return { ...slide, elements: newElements, background: newBg }
  })
}
