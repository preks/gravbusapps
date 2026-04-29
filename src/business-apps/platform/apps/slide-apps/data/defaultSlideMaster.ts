// Built-in default Slide Master with 9 standard layouts (PowerPoint "Office Theme" parity).

import type { SlideMaster, SlideLayout } from '../types/slideMaster'
import type { SlideTheme } from '../components/slideThemes'
import type { AnySlideElement, RichTextParagraph, SlideData, TextElement } from '../components/slideElements'
import {
  createTextElement,
  createShapeElement,
  createImageElement,
  fontSizePixelsToPoints,
  fontSizePointsToPixels
} from '../components/slideElements'
import { getListGeometryForLevel } from '../utils/richTextLists'

export type TranslateFn = (key: string) => string

const CANVAS_W = 1280
const CANVAS_H = 720
const MARGIN = 60
const TITLE_HEIGHT = 80
const CONTENT_TOP = 170
const DEFAULT_BODY_TEXT_COLOR = '#334155'
const DEFAULT_MUTED_TEXT_COLOR = '#64748b'
const CAPTION_SURFACE_FILL = '#f8fafc'
const CAPTION_SURFACE_STROKE = '#e2e8f0'

export const DEFAULT_MASTER_ID = 'default-master'

let idCounter = 0
function uid(prefix: string): string {
  idCounter += 1
  return `${prefix}-default-${idCounter}`
}

function resetIds() {
  idCounter = 0
}

function parseThemeFontSizePixels(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseThemeFontSizePoints(value: string | undefined, fallback: number): number {
  const pixelValue = parseThemeFontSizePixels(value, fallback)
  return fontSizePixelsToPoints(pixelValue) ?? fallback
}

function pointsToPixels(points: number, fallback: number): number {
  return fontSizePointsToPixels(points) ?? fallback
}

function stripOuterQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, '')
}

function getPrimaryFontFamily(fontFamily: string | undefined, fallback: string): string {
  const primary = fontFamily?.split(',')[0]?.trim()
  if (!primary) return fallback
  const stripped = stripOuterQuotes(primary)
  return stripped || fallback
}

function getThemeHeaderFontFamily(theme: SlideTheme): string {
  return getPrimaryFontFamily(theme.theme.fonts.header, 'Inter')
}

function getThemeTextFontFamily(theme: SlideTheme): string {
  return getPrimaryFontFamily(theme.theme.fonts.text, 'Inter')
}

function getLayoutTitleFontSize(theme: SlideTheme): number {
  return pointsToPixels(parseThemeFontSizePoints(theme.theme.fontSizes.h3, 30), 40)
}

function getBodyPlaceholderFontSize(theme: SlideTheme): number {
  const themeBodySizePoints = parseThemeFontSizePoints(theme.theme.fontSizes.text, 24)
  return pointsToPixels(Math.max(16, Math.round(themeBodySizePoints * 0.7)), 21.3333)
}

function getCaptionPlaceholderFontSize(theme: SlideTheme): number {
  const bodyPlaceholderPoints = fontSizePixelsToPoints(getBodyPlaceholderFontSize(theme)) ?? 16
  return pointsToPixels(Math.max(14, bodyPlaceholderPoints - 2), 18.6667)
}

function getSubtitlePlaceholderFontSize(theme: SlideTheme): number {
  const bodyPlaceholderPoints = fontSizePixelsToPoints(getBodyPlaceholderFontSize(theme)) ?? 16
  return pointsToPixels(Math.max(18, bodyPlaceholderPoints + 2), 24)
}

function getComparisonHeaderFontSize(theme: SlideTheme): number {
  const bodyPlaceholderPoints = fontSizePixelsToPoints(getBodyPlaceholderFontSize(theme)) ?? 16
  return pointsToPixels(Math.max(17, Math.round(bodyPlaceholderPoints * 1.05)), 22.6667)
}

function splitSeedLines(content: string): string[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
}

function buildBulletParagraphs(element: Pick<TextElement, 'textAlign'>, lines: string[]): RichTextParagraph[] {
  const geometry = getListGeometryForLevel(0)
  const alignmentMap: Record<TextElement['textAlign'], RichTextParagraph['alignment']> = {
    left: 'left',
    center: 'center',
    right: 'right'
  }

  return lines.map(line => ({
    runs: [{ text: line }],
    alignment: alignmentMap[element.textAlign],
    bulletType: 'bullet',
    listLeftMargin: geometry.listLeftMargin,
    listIndent: geometry.listIndent
  }))
}

function titleElement(theme: SlideTheme, t: TranslateFn, overrides?: Record<string, unknown>): AnySlideElement {
  return createTextElement({
    id: uid('title'),
    content: t('editor-placeholder-title'),
    position: { x: MARGIN, y: MARGIN },
    size: { width: CANVAS_W - MARGIN * 2, height: TITLE_HEIGHT },
    fontSize: getLayoutTitleFontSize(theme),
    fontWeight: 'bold',
    fontFamily: getThemeHeaderFontFamily(theme),
    color: theme.theme.colors.primary,
    textAlign: 'left',
    verticalAlign: 'middle',
    ...overrides
  })
}

function subtitleElement(theme: SlideTheme, t: TranslateFn, overrides?: Record<string, unknown>): AnySlideElement {
  return createTextElement({
    id: uid('subtitle'),
    content: t('editor-placeholder-subtitle'),
    fontSize: getSubtitlePlaceholderFontSize(theme),
    fontWeight: 'normal',
    fontFamily: getThemeTextFontFamily(theme),
    color: DEFAULT_MUTED_TEXT_COLOR,
    textAlign: 'left',
    verticalAlign: 'top',
    ...overrides
  })
}

function bodyTextElement(theme: SlideTheme, content: string, overrides?: Record<string, unknown>): AnySlideElement {
  return createTextElement({
    id: uid('body'),
    content,
    fontSize: getBodyPlaceholderFontSize(theme),
    fontWeight: 'normal',
    fontFamily: getThemeTextFontFamily(theme),
    color: DEFAULT_BODY_TEXT_COLOR,
    textAlign: 'left',
    verticalAlign: 'top',
    lineHeight: 1.5,
    padding: 4,
    ...overrides
  })
}

function listTextElement(theme: SlideTheme, content: string, overrides?: Record<string, unknown>): AnySlideElement {
  const baseElement = bodyTextElement(theme, content, overrides) as TextElement
  const lines = splitSeedLines(content)

  return {
    ...baseElement,
    content: lines.join('\n'),
    paragraphs: buildBulletParagraphs(baseElement, lines)
  }
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

function imagePlaceholder(t: TranslateFn, overrides?: Record<string, unknown>): AnySlideElement {
  return createImageElement('', {
    id: uid('img'),
    alt: t('layout-image-alt'),
    objectFit: 'cover',
    borderRadius: 8,
    ...overrides
  })
}

// --- Layout generators ---

function titleSlideLayout(masterId: string, theme: SlideTheme, t: TranslateFn): SlideLayout {
  return {
    id: 'title-slide',
    name: t('layout-name-title-slide'),
    description: 'Centered title and subtitle for opening slides',
    masterId,
    elements: [
      createTextElement({
        id: uid('title'),
        content: t('layout-presentation-title'),
        position: { x: MARGIN + 40, y: 200 },
        size: { width: CANVAS_W - (MARGIN + 40) * 2, height: 100 },
        fontSize: 52,
        fontWeight: 'bold',
        fontFamily: getThemeHeaderFontFamily(theme),
        color: theme.theme.colors.primary,
        textAlign: 'center',
        verticalAlign: 'middle'
      }),
      subtitleElement(theme, t, {
        position: { x: MARGIN + 100, y: 320 },
        size: { width: CANVAS_W - (MARGIN + 100) * 2, height: 60 },
        textAlign: 'center'
      }),
      accentBar(theme)
    ]
  }
}

function titleContentLayout(masterId: string, theme: SlideTheme, t: TranslateFn): SlideLayout {
  return {
    id: 'title-content',
    name: t('layout-name-title-content'),
    description: 'Title bar with a content area for text or bullets',
    masterId,
    elements: [
      titleElement(theme, t),
      createShapeElement('rectangle', {
        id: uid('divider'),
        position: { x: MARGIN, y: MARGIN + TITLE_HEIGHT + 10 },
        size: { width: CANVAS_W - MARGIN * 2, height: 2 },
        fill: theme.theme.colors.secondary,
        strokeWidth: 0,
        strokeColor: 'transparent',
        zIndex: 0
      }),
      listTextElement(theme, t('layout-key-points'), {
        position: { x: MARGIN, y: CONTENT_TOP },
        size: { width: CANVAS_W - MARGIN * 2, height: CANVAS_H - CONTENT_TOP - MARGIN }
      }),
      accentBar(theme)
    ]
  }
}

function sectionHeaderLayout(masterId: string, theme: SlideTheme, t: TranslateFn): SlideLayout {
  return {
    id: 'section-header',
    name: t('layout-name-section-header'),
    description: 'Large section title with optional description',
    masterId,
    elements: [
      createTextElement({
        id: uid('section-title'),
        content: t('layout-section-title'),
        position: { x: MARGIN + 40, y: 210 },
        size: { width: CANVAS_W - (MARGIN + 40) * 2, height: 90 },
        fontSize: 48,
        fontWeight: 'bold',
        fontFamily: getThemeHeaderFontFamily(theme),
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
      subtitleElement(theme, t, {
        position: { x: MARGIN + 40, y: 330 },
        size: { width: CANVAS_W - (MARGIN + 40) * 2, height: 60 },
        content: t('layout-section-description')
      })
    ]
  }
}

function twoContentLayout(masterId: string, theme: SlideTheme, t: TranslateFn): SlideLayout {
  const colWidth = (CANVAS_W - MARGIN * 2 - 40) / 2
  return {
    id: 'two-content',
    name: t('layout-name-two-content'),
    description: 'Title with two side-by-side content columns',
    masterId,
    elements: [
      titleElement(theme, t),
      createShapeElement('rectangle', {
        id: uid('divider'),
        position: { x: MARGIN, y: MARGIN + TITLE_HEIGHT + 10 },
        size: { width: CANVAS_W - MARGIN * 2, height: 2 },
        fill: theme.theme.colors.secondary,
        strokeWidth: 0,
        strokeColor: 'transparent',
        zIndex: 0
      }),
      listTextElement(theme, t('layout-left-column-points'), {
        position: { x: MARGIN, y: CONTENT_TOP },
        size: { width: colWidth, height: CANVAS_H - CONTENT_TOP - MARGIN }
      }),
      listTextElement(theme, t('layout-right-column-points'), {
        position: { x: MARGIN + colWidth + 40, y: CONTENT_TOP },
        size: { width: colWidth, height: CANVAS_H - CONTENT_TOP - MARGIN }
      }),
      accentBar(theme)
    ]
  }
}

function comparisonLayout(masterId: string, theme: SlideTheme, t: TranslateFn): SlideLayout {
  const colWidth = (CANVAS_W - MARGIN * 2 - 40) / 2
  const headerH = 50
  return {
    id: 'comparison',
    name: t('layout-name-comparison'),
    description: 'Title with two labeled comparison columns',
    masterId,
    elements: [
      titleElement(theme, t),
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
        content: t('layout-option-a'),
        position: { x: MARGIN, y: CONTENT_TOP },
        size: { width: colWidth, height: headerH },
        fontSize: getComparisonHeaderFontSize(theme),
        fontWeight: 'bold',
        fontFamily: getThemeHeaderFontFamily(theme),
        color: theme.theme.colors.secondary,
        textAlign: 'left',
        verticalAlign: 'middle'
      }),
      createTextElement({
        id: uid('col-header-r'),
        content: t('layout-option-b'),
        position: { x: MARGIN + colWidth + 40, y: CONTENT_TOP },
        size: { width: colWidth, height: headerH },
        fontSize: getComparisonHeaderFontSize(theme),
        fontWeight: 'bold',
        fontFamily: getThemeHeaderFontFamily(theme),
        color: theme.theme.colors.secondary,
        textAlign: 'left',
        verticalAlign: 'middle'
      }),
      listTextElement(theme, t('layout-strengths'), {
        position: { x: MARGIN, y: CONTENT_TOP + headerH + 10 },
        size: { width: colWidth, height: CANVAS_H - CONTENT_TOP - headerH - 10 - MARGIN }
      }),
      listTextElement(theme, t('layout-strengths'), {
        position: { x: MARGIN + colWidth + 40, y: CONTENT_TOP + headerH + 10 },
        size: { width: colWidth, height: CANVAS_H - CONTENT_TOP - headerH - 10 - MARGIN }
      }),
      accentBar(theme)
    ]
  }
}

function titleOnlyLayout(masterId: string, theme: SlideTheme, t: TranslateFn): SlideLayout {
  return {
    id: 'title-only',
    name: t('layout-name-title-only'),
    description: 'Title bar with empty canvas below',
    masterId,
    elements: [
      titleElement(theme, t),
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

function blankLayout(masterId: string, t: TranslateFn): SlideLayout {
  return {
    id: 'blank',
    name: t('layout-name-blank'),
    description: 'Empty slide',
    masterId,
    elements: [],
    background: { type: 'solid', color: '#ffffff' }
  }
}

function contentCaptionLayout(masterId: string, theme: SlideTheme, t: TranslateFn): SlideLayout {
  const contentW = (CANVAS_W - MARGIN * 2 - 40) * 0.6
  const captionW = (CANVAS_W - MARGIN * 2 - 40) * 0.4
  return {
    id: 'content-caption',
    name: t('layout-name-content-caption'),
    description: 'Content area with a side caption column',
    masterId,
    elements: [
      titleElement(theme, t),
      createShapeElement('rectangle', {
        id: uid('divider'),
        position: { x: MARGIN, y: MARGIN + TITLE_HEIGHT + 10 },
        size: { width: CANVAS_W - MARGIN * 2, height: 2 },
        fill: theme.theme.colors.secondary,
        strokeWidth: 0,
        strokeColor: 'transparent',
        zIndex: 0
      }),
      listTextElement(theme, t('layout-main-content-points'), {
        position: { x: MARGIN, y: CONTENT_TOP },
        size: { width: contentW, height: CANVAS_H - CONTENT_TOP - MARGIN }
      }),
      createShapeElement('rounded-rectangle', {
        id: uid('caption-bg'),
        position: { x: MARGIN + contentW + 40, y: CONTENT_TOP },
        size: { width: captionW, height: CANVAS_H - CONTENT_TOP - MARGIN },
        fill: CAPTION_SURFACE_FILL,
        strokeWidth: 1,
        strokeColor: CAPTION_SURFACE_STROKE,
        cornerRadius: 8,
        zIndex: 0
      }),
      bodyTextElement(theme, t('layout-caption-text'), {
        position: { x: MARGIN + contentW + 56, y: CONTENT_TOP + 16 },
        size: { width: captionW - 32, height: CANVAS_H - CONTENT_TOP - MARGIN - 32 },
        fontSize: getCaptionPlaceholderFontSize(theme),
        color: DEFAULT_MUTED_TEXT_COLOR,
        lineHeight: 1.45
      }),
      accentBar(theme)
    ]
  }
}

function pictureCaptionLayout(masterId: string, theme: SlideTheme, t: TranslateFn): SlideLayout {
  const imgW = (CANVAS_W - MARGIN * 2 - 40) * 0.55
  const captionW = (CANVAS_W - MARGIN * 2 - 40) * 0.45
  return {
    id: 'picture-caption',
    name: t('layout-name-picture-caption'),
    description: 'Image placeholder with a side caption',
    masterId,
    elements: [
      titleElement(theme, t),
      createShapeElement('rectangle', {
        id: uid('divider'),
        position: { x: MARGIN, y: MARGIN + TITLE_HEIGHT + 10 },
        size: { width: CANVAS_W - MARGIN * 2, height: 2 },
        fill: theme.theme.colors.secondary,
        strokeWidth: 0,
        strokeColor: 'transparent',
        zIndex: 0
      }),
      imagePlaceholder(t, {
        position: { x: MARGIN, y: CONTENT_TOP },
        size: { width: imgW, height: CANVAS_H - CONTENT_TOP - MARGIN }
      }),
      createTextElement({
        id: uid('caption-title'),
        content: t('layout-image-caption'),
        position: { x: MARGIN + imgW + 40, y: CONTENT_TOP },
        size: { width: captionW, height: 50 },
        fontSize: getComparisonHeaderFontSize(theme),
        fontWeight: 'bold',
        fontFamily: getThemeHeaderFontFamily(theme),
        color: theme.theme.colors.primary,
        textAlign: 'left',
        verticalAlign: 'top'
      }),
      bodyTextElement(theme, t('layout-image-description'), {
        position: { x: MARGIN + imgW + 40, y: CONTENT_TOP + 60 },
        size: { width: captionW, height: CANVAS_H - CONTENT_TOP - 60 - MARGIN },
        fontSize: getCaptionPlaceholderFontSize(theme),
        color: DEFAULT_MUTED_TEXT_COLOR,
        lineHeight: 1.45
      }),
      accentBar(theme)
    ]
  }
}

/**
 * Generate the built-in default SlideMaster for a given theme.
 * Each call produces fresh element IDs.
 */
export function createDefaultSlideMaster(theme: SlideTheme, t?: TranslateFn): SlideMaster {
  resetIds()

  // FTL files don't support escape sequences, so \n is literal
  const translate: TranslateFn = t ? key => t(key).replace(/\\n/g, '\n') : key => key
  const masterId = DEFAULT_MASTER_ID

  return {
    id: masterId,
    name: translate('layout-name-default-theme'),
    sharedElements: [],
    background: { type: 'solid', color: '#ffffff' },
    isDefault: true,
    layouts: [
      titleSlideLayout(masterId, theme, translate),
      titleContentLayout(masterId, theme, translate),
      sectionHeaderLayout(masterId, theme, translate),
      twoContentLayout(masterId, theme, translate),
      comparisonLayout(masterId, theme, translate),
      titleOnlyLayout(masterId, theme, translate),
      blankLayout(masterId, translate),
      contentCaptionLayout(masterId, theme, translate),
      pictureCaptionLayout(masterId, theme, translate)
    ]
  }
}

/**
 * Get the effective layouts for a presentation.
 * Returns the presentation's custom masters if present, otherwise the default.
 */
export function getEffectiveMasters(
  masters: SlideMaster[] | undefined,
  theme: SlideTheme,
  t?: TranslateFn
): SlideMaster[] {
  if (masters && masters.length > 0) return masters
  return [createDefaultSlideMaster(theme, t)]
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

function isBuiltInDefaultMaster(master: SlideMaster): boolean {
  return master.id === DEFAULT_MASTER_ID || master.isDefault === true
}

export function resolveLayoutForNewSlide(
  masters: SlideMaster[] | undefined,
  theme: SlideTheme,
  layoutId: string,
  t?: TranslateFn
): { master: SlideMaster; layout: SlideLayout } | undefined {
  const effectiveMasters = getEffectiveMasters(masters, theme, t)
  const found = findLayoutById(effectiveMasters, layoutId)
  if (!found) return undefined
  if (!isBuiltInDefaultMaster(found.master)) return found

  const refreshedMaster = createDefaultSlideMaster(theme, t)
  const refreshedLayout = refreshedMaster.layouts.find(layout => layout.id === layoutId)
  if (!refreshedLayout) return found

  return {
    master: refreshedMaster,
    layout: refreshedLayout
  }
}

/**
 * Clone a layout's elements with fresh IDs to create a new slide.
 */
export function cloneLayoutToSlide(
  layout: SlideLayout,
  master: SlideMaster
): { elements: AnySlideElement[]; background: import('../components/slideElements').SlideBackground } {
  const now = Date.now()
  const elements = layout.elements.map((element, index) => {
    const clonedElement =
      typeof structuredClone === 'function'
        ? structuredClone(element)
        : (JSON.parse(JSON.stringify(element)) as AnySlideElement)

    return {
      ...clonedElement,
      id: `${element.type}-${now}-${index}-${Math.random().toString(36).slice(2, 9)}`
    }
  })

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
  const registerFontMapping = (fromRaw: string, toRaw: string, fallback: string) => {
    const fromPrimary = getPrimaryFontFamily(fromRaw, fallback)
    const toPrimary = getPrimaryFontFamily(toRaw, fallback)
    if (fromRaw !== toPrimary) map.set(fromRaw, toPrimary)
    if (fromPrimary !== toPrimary) map.set(fromPrimary, toPrimary)
  }

  if (old.header !== nw.header) registerFontMapping(old.header, nw.header, 'Inter')
  if (old.text !== nw.text) registerFontMapping(old.text, nw.text, 'Inter')
  if (old.monospace !== nw.monospace) registerFontMapping(old.monospace, nw.monospace, 'Fira Code')
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
