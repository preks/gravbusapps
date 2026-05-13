import { CONTEXT_MENU_ANCHOR_LABELS } from './univerGridContextMenuDom'
import { findNumfmtFormatMenuGrids, normalizeMenuText, NUMFMT_MENU_ITEM_ROW_SELECTOR } from './univerGridLocaleChrome'

/** Excel-style accounting presets for the ribbon currency split-button menu. */
export type RibbonAccountingCurrencyPreset = {
  /** Primary line shown in the menu (matches Excel Home → Number → Accounting currency list, English). */
  label: string
  /** Second-column sample (Excel US-style grouping: comma thousands, period decimals). Same for every app locale. */
  preview: string
  /** Excel-style accounting pattern (quoted symbol + `#,##0.00` + `_` alignment + red negative clause). */
  pattern: string
}

/**
 * Same entries and sample display as Excel’s English ribbon, regardless of Gravity `appLocale`.
 * EUR is listed first (product default); patterns follow Excel accounting currency semantics.
 */
export const RIBBON_ACCOUNTING_CURRENCY_PRESETS: readonly RibbonAccountingCurrencyPreset[] = [
  {
    label: '€ Euro (€ 1,220)',
    preview: '€1,220.00',
    pattern: '"€"#,##0.00_);[Red]"€"#,##0.00'
  },
  {
    label: '$ English (United States)',
    preview: '$1,220.00',
    pattern: '"$"#,##0.00_);[Red]"$"#,##0.00'
  },
  {
    label: '£ English (United Kingdom)',
    preview: '£1,220.00',
    pattern: '"£"#,##0.00_);[Red]"£"#,##0.00'
  },
  {
    label: 'CHF French (Switzerland)',
    preview: 'CHF 1,220.00',
    pattern: '"CHF"#,##0.00_);[Red]"CHF"#,##0.00'
  },
  {
    label: '¥ Chinese (Simplified, Mainland China)',
    preview: '¥1,220.00',
    pattern: '"¥"#,##0.00_);[Red]"¥"#,##0.00'
  }
] as const

const RIBBON_CURRENCY_ROW_ATTR = 'data-gravity-currency-row'
const RIBBON_CURRENCY_PATTERN_ATTR = 'data-gravity-currency-pattern'
const RIBBON_CURRENCY_MENU_ATTR = 'data-gravity-currency-preset-menu'

/**
 * Univer `UniverIcon` sets `class="univerjs-icon univerjs-icon-<glyph-id>"` on the root `<svg>`.
 * The SVG element does **not** reliably expose `id="euro-icon"` in the live DOM (internal defs use a random suffix).
 */
const RIBBON_NUMFMT_CURRENCY_ICON_SELECTOR = [
  'svg.univerjs-icon-euro-icon',
  'svg.univerjs-icon-dollar-icon',
  'svg.univerjs-icon-rouble-icon',
  'svg.univerjs-icon-rmb-icon',
  // Older / alternate builds
  'svg#euro-icon',
  'svg#dollar-icon',
  'svg#rouble-icon',
  'svg#rmb-icon'
].join(', ')

const HIDDEN_NUMFMT_CURRENCY_SPLIT_ATTR = 'data-gravity-hidden-numfmt-currency-split'

/** Neighbouring Start-tab number controls; if these appear inside a candidate parent, it is not the currency split-only host. */
const RIBBON_NUMFMT_SIBLING_GLYPH_SELECTORS =
  'svg.univerjs-icon-percent-icon, svg.univerjs-icon-add-digits-icon, svg.univerjs-icon-reduce-digits-icon' as const

/**
 * A real currency split wrapper is only the €/$ control + chevron (no % / decimal icons in the same host).
 * Without this check, a 2-column ribbon chunk (e.g. “number group” | “styles”) matches `children.length === 2`
 * and hides the entire toolbar column.
 */
function parentLooksLikeCurrencySplitOnly(parent: HTMLElement): boolean {
  if (parent.querySelector(RIBBON_NUMFMT_SIBLING_GLYPH_SELECTORS)) return false
  const interactive = parent.querySelectorAll('button, [role="button"]')
  if (interactive.length > 4) return false
  return true
}

function findRibbonNumfmtCurrencySplitHost(svg: SVGSVGElement): HTMLElement | null {
  const btn = svg.closest('button, [role="button"]') as HTMLElement | null
  if (!btn) return null

  let walk: HTMLElement | null = btn
  for (let depth = 0; depth < 10 && walk; depth += 1) {
    const parent = walk.parentElement as HTMLElement | null
    if (!parent) break

    const icons = parent.querySelectorAll(RIBBON_NUMFMT_CURRENCY_ICON_SELECTOR)
    if (icons.length !== 1 || icons[0] !== svg) {
      walk = parent
      continue
    }

    const childCount = parent.children.length
    if (
      (childCount === 2 || childCount === 3) &&
      [...parent.children].some(ch => ch.contains(svg)) &&
      parentLooksLikeCurrencySplitOnly(parent)
    ) {
      return parent
    }

    walk = parent
  }

  return btn
}

/**
 * Hides the Start ribbon **Currency** split control (€ / $ / etc. + dropdown chevron), not % or decimal buttons.
 * Idempotent; safe on every rAF / mutation tick (Univer may re-mount toolbar nodes).
 */
export function hideRibbonNumfmtCurrencyQuickSplit(options?: { root?: ParentNode | null }): void {
  if (typeof document === 'undefined') return
  const root = options?.root ?? document.body
  for (const svg of root.querySelectorAll<SVGSVGElement>(RIBBON_NUMFMT_CURRENCY_ICON_SELECTOR)) {
    const host = findRibbonNumfmtCurrencySplitHost(svg)
    if (!host || host.hasAttribute(HIDDEN_NUMFMT_CURRENCY_SPLIT_ATTR)) continue
    host.setAttribute(HIDDEN_NUMFMT_CURRENCY_SPLIT_ATTR, '1')
    host.style.setProperty('display', 'none', 'important')
  }
}

const MAIN_NUMFMT_PANEL_SUBSTRING_EN = 'General'
const MAIN_NUMFMT_PANEL_SUBSTRING_EN2 = 'Date and time'
const MAIN_NUMFMT_PANEL_SUBSTRING_DE = 'Allgemein'
const MAIN_NUMFMT_PANEL_SUBSTRING_DE2 = 'Datum und Uhrzeit'

function isElementVisible(el: HTMLElement): boolean {
  if (!document.body.contains(el)) return false
  if (typeof el.checkVisibility === 'function') {
    try {
      return el.checkVisibility()
    } catch {
      /* JSDOM / partial implementations may throw; fall through */
    }
  }
  if (el.offsetParent) return true
  if (el.getClientRects().length > 0) return true
  if (typeof globalThis.getComputedStyle === 'function') {
    const display = globalThis.getComputedStyle(el).display
    if (display === 'none' || display === 'contents') return false
  }
  /** JSDOM often has no layout boxes; treat in-document menus as visible unless explicitly `display:none`. */
  return true
}

function menuLooksLikeMainNumberFormatPanel(menu: HTMLElement): boolean {
  const t = (menu.textContent || '').trim()
  if (t.includes(MAIN_NUMFMT_PANEL_SUBSTRING_EN) && t.includes(MAIN_NUMFMT_PANEL_SUBSTRING_EN2)) return true
  if (t.includes(MAIN_NUMFMT_PANEL_SUBSTRING_DE) && t.includes(MAIN_NUMFMT_PANEL_SUBSTRING_DE2)) return true
  return findNumfmtFormatMenuGrids().some(g => g.contains(menu))
}

function menuTextMatchesContextMenu(menu: HTMLElement): boolean {
  const lower = (menu.textContent || '').toLowerCase()
  return CONTEXT_MENU_ANCHOR_LABELS.some(lbl => lower.includes(lbl.toLowerCase()))
}

function rowLooksLikeAccountingCurrencySample(row: HTMLElement): boolean {
  const text = normalizeMenuText(row.textContent || '')
  if (text.length < 4) return false
  if (/general|allgemein|percentage|prozent|scientific|wissenschaft|accounting|buchhaltung/i.test(text)) return false
  return /[€$£¥]|chf|eur|usd|gbp|cny/.test(text) && /\d/.test(text)
}

/**
 * The Start ribbon **Currency** split often opens a Radix popper (`[data-radix-popper-content-wrapper]`)
 * whose list has no `role="menu"`. We scan both menus and poppers, then attach rows to the inner
 * flex column that actually owns the `univer-h-7` rows (same host the user sees under the € control).
 */
function collectRibbonCurrencyCandidateRoots(): HTMLElement[] {
  if (typeof document === 'undefined') return []
  const seen = new Set<HTMLElement>()
  const ordered: HTMLElement[] = []
  const push = (el: HTMLElement) => {
    if (seen.has(el)) return
    seen.add(el)
    ordered.push(el)
  }
  for (const el of document.querySelectorAll<HTMLElement>('[role="menu"]')) {
    push(el)
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-radix-popper-content-wrapper]')) {
    const rowCount = el.querySelectorAll(NUMFMT_MENU_ITEM_ROW_SELECTOR).length
    if (rowCount >= 4 && rowCount <= 12) push(el)
  }
  return ordered
}

function resolveCurrencyMenuRowHost(root: HTMLElement, rows: HTMLElement[]): HTMLElement {
  if (root.getAttribute('role') === 'menu') return root
  const firstParent = rows[0]?.parentElement as HTMLElement | null
  if (firstParent && rows.every(r => r.parentElement === firstParent)) {
    return firstParent
  }
  return root
}

function isRibbonAccountingCurrencyMenuHost(root: HTMLElement): root is HTMLElement {
  if (!isElementVisible(root)) return false
  if (menuLooksLikeMainNumberFormatPanel(root)) return false
  if (menuTextMatchesContextMenu(root)) return false
  const rows = Array.from(root.querySelectorAll<HTMLElement>(NUMFMT_MENU_ITEM_ROW_SELECTOR))
  if (rows.length < 4 || rows.length > 10) return false
  const accountingLike = rows.filter(rowLooksLikeAccountingCurrencySample)
  return accountingLike.length >= 4
}

/**
 * Locates row containers for the ribbon **Currency** accounting list (built-in `CURRENCYFORMAT` rows),
 * including Radix popovers from the Start toolbar split, not only `[role="menu"]`.
 */
export function findRibbonAccountingCurrencyMenus(): HTMLElement[] {
  if (typeof document === 'undefined') return []
  const hosts = new Set<HTMLElement>()
  for (const root of collectRibbonCurrencyCandidateRoots()) {
    if (!isRibbonAccountingCurrencyMenuHost(root)) continue
    const rows = Array.from(root.querySelectorAll<HTMLElement>(NUMFMT_MENU_ITEM_ROW_SELECTOR))
    const host = resolveCurrencyMenuRowHost(root, rows)
    hosts.add(host)
  }
  return [...hosts]
}

function clearGravityCurrencyRows(menu: HTMLElement): void {
  for (const row of menu.querySelectorAll<HTMLElement>(`[${RIBBON_CURRENCY_ROW_ATTR}]`)) {
    row.remove()
  }
}

function hideBuiltInCurrencyMenuRows(menu: HTMLElement): void {
  for (const row of menu.querySelectorAll<HTMLElement>(NUMFMT_MENU_ITEM_ROW_SELECTOR)) {
    if (row.hasAttribute(RIBBON_CURRENCY_ROW_ATTR)) continue
    if (row.style.display !== 'none') row.style.display = 'none'
  }
}

function appendPresetRows(menu: HTMLElement): void {
  const templateRow = menu.querySelector<HTMLElement>(NUMFMT_MENU_ITEM_ROW_SELECTOR)
  if (!templateRow) return
  for (const preset of RIBBON_ACCOUNTING_CURRENCY_PRESETS) {
    const row = templateRow.cloneNode(true) as HTMLElement
    row.setAttribute(RIBBON_CURRENCY_ROW_ATTR, '1')
    row.setAttribute(RIBBON_CURRENCY_PATTERN_ATTR, preset.pattern)
    row.style.display = ''
    const spans = row.querySelectorAll<HTMLElement>(':scope > span')
    if (spans[0]) spans[0].textContent = preset.label
    if (spans[1]) spans[1].textContent = preset.preview
    menu.appendChild(row)
  }
}

/**
 * Replaces the built-in ribbon accounting-currency submenu rows with {@link RIBBON_ACCOUNTING_CURRENCY_PRESETS}.
 * Safe to call on every animation frame / mutation tick; idempotent per open menu.
 */
export function patchRibbonAccountingCurrencyMenus(): void {
  if (typeof document === 'undefined') return
  for (const menu of findRibbonAccountingCurrencyMenus()) {
    menu.setAttribute(RIBBON_CURRENCY_MENU_ATTR, '1')
    hideBuiltInCurrencyMenuRows(menu)
    const existing = menu.querySelectorAll(`[${RIBBON_CURRENCY_ROW_ATTR}]`).length
    if (existing !== RIBBON_ACCOUNTING_CURRENCY_PRESETS.length) {
      clearGravityCurrencyRows(menu)
      appendPresetRows(menu)
    }
  }
}

export function getRibbonAccountingCurrencyPatternFromRowElement(row: HTMLElement | null): string | undefined {
  if (!row) return undefined
  const raw = row.getAttribute(RIBBON_CURRENCY_PATTERN_ATTR) ?? row.dataset.gravityCurrencyPattern
  const trimmed = raw?.trim()
  return trimmed || undefined
}
