// Inherit text-run defaults from layout + master placeholders and master
// <p:txStyles>.
//
// Problem this solves: PowerPoint almost never repeats the title font size on
// every slide. The slide stores `<a:r>` with no `sz` attribute, and the 84pt
// the user sees comes from the master's
//   <p:txStyles>
//     <p:titleStyle><a:lvl1pPr><a:defRPr sz="8400"/></a:lvl1pPr></p:titleStyle>
// (optionally overridden by the layout/master placeholder's `<a:lstStyle>`).
//
// Without inheriting these defaults we clamp to the renderer's 32px default,
// which is exactly what imported decks looked like before this module existed.

import { getChild, resolveTextFillColor } from './ooxmlUtils'
import type { OoxmlTextRun, OoxmlTheme, OoxmlCap } from './types'

// Copy of extractText.resolveTypeface — inlined here to avoid an import cycle
// between extractText.ts and this module. The behavior must stay in sync;
// please update both when changing typeface scheme handling.
function resolveTypeface(raw: string | null | undefined, theme: OoxmlTheme | undefined): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('+mj')) return theme?.majorFont || undefined
  if (trimmed.startsWith('+mn')) return theme?.minorFont || undefined
  if (trimmed.startsWith('+')) return undefined
  return trimmed
}

/** A resolved per-level default that `extractText` can drop-in as run fallback. */
export type InheritedLevelDefaults = Omit<OoxmlTextRun, 'text'>

/**
 * Per-level defaults keyed by `a:lvl{N}pPr` level index (0-based).
 * Level 0 = lvl1pPr, level 1 = lvl2pPr, etc.
 */
export type InheritedLevelMap = Map<number, InheritedLevelDefaults>

/** OOXML `<p:txStyles>` partitions run defaults by target placeholder family. */
export interface InheritedMasterTextStyles {
  title: InheritedLevelMap
  body: InheritedLevelMap
  other: InheritedLevelMap
}

/** Placeholder `<a:lstStyle>` overrides keyed by the placeholder's identity. */
export interface InheritedPlaceholderStyles {
  // Keyed by "ph-type|ph-idx". Empty values are represented as 'body'|'0'
  // to match `resolvePlaceholders.getPlaceholderKey` semantics.
  byKey: Map<string, InheritedLevelMap>
  // Keyed by ph type only — fallback when the idx match fails.
  byType: Map<string, InheritedLevelMap>
  // Keyed by ph idx only — fallback when the type match fails.
  byIdx: Map<string, InheritedLevelMap>
}

export interface InheritedTextDefaultsResolver {
  /**
   * Resolve inherited defaults for a slide shape identified by its
   * placeholder (phType/phIdx). Returns merged defaults with priority:
   *   layout placeholder `<a:lstStyle>`
   *   > master placeholder `<a:lstStyle>`
   *   > master <p:txStyles> for title/body/other
   */
  resolve: (phType: string | undefined, phIdx: string | undefined) => InheritedLevelMap
}

const TITLE_PH_TYPES = new Set(['title', 'ctrTitle'])
const SUB_TITLE_PH_TYPES = new Set(['subTitle'])
const BODY_PH_TYPES = new Set(['body', 'obj'])

function parseDefRPr(defRPr: Element | undefined, theme: OoxmlTheme | undefined): InheritedLevelDefaults {
  if (!defRPr) return {}
  const out: InheritedLevelDefaults = {}

  const sz = defRPr.getAttribute('sz')
  if (sz) {
    const parsed = parseInt(sz)
    if (Number.isFinite(parsed)) out.fontSize = parsed
  }

  if (defRPr.getAttribute('b') === '1') out.bold = true
  if (defRPr.getAttribute('i') === '1') out.italic = true
  if (defRPr.getAttribute('u') === 'sng' || defRPr.getAttribute('u') === 'dbl') out.underline = true

  const capAttr = defRPr.getAttribute('cap')
  if (capAttr) {
    const lower = capAttr.toLowerCase()
    if (lower === 'all' || lower === 'small' || lower === 'none') {
      out.cap = lower as OoxmlCap
    }
  }

  const latin = getChild(defRPr, 'a:latin')
  if (latin) {
    const typeface = resolveTypeface(latin.getAttribute('typeface'), theme)
    if (typeface) out.fontFamily = typeface
  }

  // Honor both `<a:solidFill>` and `<a:gradFill>` on inherited text defaults.
  // Layout 6 of the Enterprise AI deck paints its idx=11 placeholder defRPr
  // with a gradFill (white fades at the edges); before this, the inherited
  // color was undefined and callers defaulted to `dk1` (= black), which hid
  // the slide-1 title on a dark background.
  const fillColor = resolveTextFillColor(defRPr, theme)
  if (fillColor) out.color = fillColor

  return out
}

/** Merge `low` under `high`: fields already set on `high` win. */
function mergeDefaults(high: InheritedLevelDefaults, low: InheritedLevelDefaults): InheritedLevelDefaults {
  return {
    fontSize: high.fontSize ?? low.fontSize,
    fontFamily: high.fontFamily ?? low.fontFamily,
    color: high.color ?? low.color,
    bold: high.bold ?? low.bold,
    italic: high.italic ?? low.italic,
    underline: high.underline ?? low.underline,
    strikethrough: high.strikethrough ?? low.strikethrough,
    cap: high.cap ?? low.cap
  }
}

function mergeLevelMaps(high: InheritedLevelMap, low: InheritedLevelMap): InheritedLevelMap {
  const out: InheritedLevelMap = new Map(low)
  for (const [lvl, defaults] of high) {
    out.set(lvl, mergeDefaults(defaults, low.get(lvl) ?? {}))
  }
  return out
}

function parseStyleElement(styleEl: Element | undefined, theme: OoxmlTheme | undefined): InheritedLevelMap {
  const result: InheritedLevelMap = new Map()
  if (!styleEl) return result

  for (let i = 0; i < styleEl.childNodes.length; i++) {
    const child = styleEl.childNodes[i] as Element
    if (!child.tagName) continue
    const match = /^a:lvl([1-9])pPr$/.exec(child.tagName)
    if (!match) continue
    const level = parseInt(match[1]) - 1
    const defRPr = getChild(child, 'a:defRPr')
    const defaults = parseDefRPr(defRPr, theme)
    if (Object.keys(defaults).length > 0) {
      const existing = result.get(level)
      result.set(level, existing ? mergeDefaults(defaults, existing) : defaults)
    }
  }

  return result
}

/** Parse master's `<p:txStyles>` into per-bucket (title/body/other) level maps. */
export function extractMasterTextStylesAdvanced(
  masterXml: Document,
  theme: OoxmlTheme | undefined
): InheritedMasterTextStyles {
  const result: InheritedMasterTextStyles = {
    title: new Map(),
    body: new Map(),
    other: new Map()
  }

  const txStyles = masterXml.getElementsByTagName('p:txStyles')[0]
  if (!txStyles) return result

  for (let i = 0; i < txStyles.childNodes.length; i++) {
    const node = txStyles.childNodes[i] as Element
    if (!node.tagName) continue
    if (node.tagName === 'p:titleStyle') {
      result.title = parseStyleElement(node, theme)
    } else if (node.tagName === 'p:bodyStyle') {
      result.body = parseStyleElement(node, theme)
    } else if (node.tagName === 'p:otherStyle') {
      result.other = parseStyleElement(node, theme)
    }
  }

  return result
}

/** Build placeholder-specific lstStyle maps for either a layout or master XML. */
export function extractPlaceholderStyles(xml: Document, theme: OoxmlTheme | undefined): InheritedPlaceholderStyles {
  const byKey = new Map<string, InheritedLevelMap>()
  const byType = new Map<string, InheritedLevelMap>()
  const byIdx = new Map<string, InheritedLevelMap>()

  const spTree = xml.getElementsByTagName('p:spTree')[0]
  if (!spTree) return { byKey, byType, byIdx }

  const shapes = spTree.getElementsByTagName('p:sp')
  for (let i = 0; i < shapes.length; i++) {
    const sp = shapes[i]
    const nvSpPr = getChild(sp, 'p:nvSpPr')
    const nvPr = nvSpPr ? getChild(nvSpPr, 'p:nvPr') : undefined
    const ph = nvPr ? getChild(nvPr, 'p:ph') : undefined
    if (!ph) continue

    const txBody = getChild(sp, 'p:txBody')
    if (!txBody) continue
    const lstStyle = getChild(txBody, 'a:lstStyle')
    const levels = parseStyleElement(lstStyle, theme)
    if (levels.size === 0) continue

    const type = ph.getAttribute('type') || 'body'
    const idx = ph.getAttribute('idx') || '0'
    const key = `${type}|${idx}`

    if (!byKey.has(key)) byKey.set(key, levels)
    if (!byType.has(type)) byType.set(type, levels)
    if (!byIdx.has(idx)) byIdx.set(idx, levels)
  }

  return { byKey, byType, byIdx }
}

/**
 * Compose a resolver that walks layout placeholder → master placeholder →
 * master txStyles for the given placeholder identity.
 */
export function buildInheritedTextDefaultsResolver(
  layoutStyles: InheritedPlaceholderStyles | undefined,
  masterStyles: InheritedPlaceholderStyles | undefined,
  masterTxStyles: InheritedMasterTextStyles | undefined
): InheritedTextDefaultsResolver {
  return {
    resolve(phType, phIdx) {
      const resolvedType = phType || 'body'
      const resolvedIdx = phIdx || '0'
      const key = `${resolvedType}|${resolvedIdx}`

      const layoutLevels =
        layoutStyles?.byKey.get(key) || layoutStyles?.byIdx.get(resolvedIdx) || layoutStyles?.byType.get(resolvedType)

      const masterLevels =
        masterStyles?.byKey.get(key) || masterStyles?.byIdx.get(resolvedIdx) || masterStyles?.byType.get(resolvedType)

      let txStylesLevels: InheritedLevelMap | undefined
      if (masterTxStyles) {
        if (TITLE_PH_TYPES.has(resolvedType) || SUB_TITLE_PH_TYPES.has(resolvedType)) {
          txStylesLevels = masterTxStyles.title
        } else if (BODY_PH_TYPES.has(resolvedType) || !phType) {
          txStylesLevels = masterTxStyles.body
        } else {
          txStylesLevels = masterTxStyles.other.size > 0 ? masterTxStyles.other : masterTxStyles.body
        }
      }

      let merged: InheritedLevelMap = new Map()
      if (txStylesLevels) merged = new Map(txStylesLevels)
      if (masterLevels) merged = mergeLevelMaps(masterLevels, merged)
      if (layoutLevels) merged = mergeLevelMaps(layoutLevels, merged)

      return merged
    }
  }
}

/** Expose the single-level getter callers actually need. */
export function getLevelDefaults(levels: InheritedLevelMap, level: number | undefined): InheritedLevelDefaults {
  const lvl = level ?? 0
  return levels.get(lvl) || levels.get(0) || {}
}
