export type ContextMenuIconVariant = 'comment' | 'merge' | 'unmerge'

const SVG_NS = 'http://www.w3.org/2000/svg'
const MENU_ICON_PATHS: Record<ContextMenuIconVariant, string[]> = {
  comment: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  merge: [
    'M9 5H7a2 2 0 0 0-2 2v2',
    'M15 5h2a2 2 0 0 1 2 2v2',
    'M9 19H7a2 2 0 0 1-2-2v-2',
    'M15 19h2a2 2 0 0 0 2-2v-2',
    'M10 8v8',
    'M14 8v8'
  ],
  unmerge: [
    'M9 5H7a2 2 0 0 0-2 2v2',
    'M15 5h2a2 2 0 0 1 2 2v2',
    'M9 19H7a2 2 0 0 1-2-2v-2',
    'M15 19h2a2 2 0 0 0 2-2v-2',
    'M8 8v8',
    'M16 8v8'
  ]
}

function createContextMenuIcon(iconVariant: ContextMenuIconVariant): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('xmlns', SVG_NS)
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')

  for (const pathDefinition of MENU_ICON_PATHS[iconVariant]) {
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', pathDefinition)
    svg.appendChild(path)
  }

  return svg
}

export const CONTEXT_MENU_ANCHOR_LABELS = [
  'Copy Special',
  'Paste Special',
  'Clear',
  'Insert',
  'Delete',
  'Freeze',
  'Protect'
]

/**
 * Univer renders worksheet tabs in the footer using stable `data-u-comp` markers (see @univerjs/sheets-ui).
 * When skipping cell-menu injection, treat the tab strip and add-sheet control as sheet-bar only — not the grid.
 */
const SHEET_TAB_BAR_SKIP_SELECTOR =
  '[data-u-comp="slide-tab-bar"], [data-u-comp="slide-tab-item"], [data-u-comp="sheet-bar-append-button"]'

/** True when context menu was requested from Univer's worksheet tab strip (not the cell grid). */
export function isUniverSheetTabBarContextMenuTarget(target: unknown): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest(SHEET_TAB_BAR_SKIP_SELECTOR))
}

/** True for inputs the browser should handle (copy/paste) outside the grid container. */
export function isDomTextEditingTarget(target: unknown): boolean {
  if (!(target instanceof Element)) return false
  const el = target
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if ((el as HTMLElement).isContentEditable) return true
  const role = el.getAttribute('role')
  if (role === 'textbox' || role === 'searchbox' || role === 'combobox') return true
  return Boolean(el.closest('[contenteditable="true"]'))
}

export function distanceToRect(x: number, y: number, rect: DOMRect): number {
  const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0
  const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0
  return Math.hypot(dx, dy)
}

export function createContextMenuItem(
  template: HTMLElement,
  markerAttr: string,
  className: string,
  label: string,
  onClick: () => void,
  iconVariant: ContextMenuIconVariant = 'comment'
): HTMLElement {
  const item = template.cloneNode(true) as HTMLElement
  item.setAttribute(markerAttr, 'true')
  item.classList.add(className)
  item.querySelectorAll('[aria-haspopup="true"]').forEach(node => node.removeAttribute('aria-haspopup'))
  item.replaceChildren()
  item.classList.remove('univer-justify-between')
  item.classList.add('univer-flex', 'univer-items-center', 'univer-gap-3', 'univer-justify-start', 'univer-text-sm')
  item.style.justifyContent = 'flex-start'
  const iconWrap = document.createElement('span')
  iconWrap.className =
    'univer-text-base univer-flex univer-flex-shrink-0 univer-items-center univer-justify-center univer-h-6 univer-min-w-6'
  iconWrap.style.color = 'var(--univer-primary-600, #2563eb)'
  iconWrap.appendChild(createContextMenuIcon(iconVariant))
  const labelEl = document.createElement('span')
  labelEl.className =
    'univer-flex-1 univer-min-w-0 univer-max-w-full univer-break-words univer-text-left univer-text-sm univer-leading-4'
  labelEl.textContent = label
  labelEl.style.whiteSpace = 'nowrap'
  labelEl.style.wordBreak = 'normal'
  labelEl.style.overflowWrap = 'normal'
  labelEl.style.fontFamily = 'inherit'
  labelEl.style.fontSize = 'inherit'
  labelEl.style.fontWeight = 'inherit'
  item.appendChild(iconWrap)
  item.appendChild(labelEl)
  item.style.whiteSpace = 'nowrap'
  item.style.wordBreak = 'normal'
  item.style.overflowWrap = 'normal'
  item.addEventListener('click', onClick)
  return item
}

export function tryInjectViaMenuGroupList(
  markerAttr: string,
  createItem: (template: HTMLElement) => HTMLElement
): boolean {
  const listSelectors = '.univer-menu-item-group-list, .rc-menu-item-group-list, [class*="menu-item-group-list"]'
  const univerLists = Array.from(document.querySelectorAll<HTMLElement>(listSelectors)).filter(
    list => !list.querySelector(`[${markerAttr}]`)
  )
  for (const list of univerLists) {
    const items = list.querySelectorAll<HTMLElement>('.univer-menu-item, li, [role="menuitem"]')
    const firstItem = items[0]
    if (!firstItem) continue
    const listText = (list.textContent || '').toLowerCase()
    if (!CONTEXT_MENU_ANCHOR_LABELS.some(lbl => listText.includes(lbl.toLowerCase()))) continue
    const item = createItem(firstItem)
    if (document.querySelector(`[${markerAttr}]`)) return true
    list.prepend(item)
    return true
  }
  return false
}

export function findGridInsertParent(grid: HTMLElement): HTMLElement {
  const firstChild = grid.firstElementChild as HTMLElement | null
  if (!firstChild) return grid
  const firstText = (firstChild.textContent || '').toLowerCase()
  const firstIsIconRow =
    firstText.includes('copy') && !firstText.includes('copy special') && !firstText.includes('insert')
  if (!firstIsIconRow) return grid
  for (let sib = firstChild.nextElementSibling; sib; sib = sib.nextElementSibling) {
    const sibText = ((sib as HTMLElement).textContent || '').toLowerCase()
    if (CONTEXT_MENU_ANCHOR_LABELS.some(lbl => sibText.includes(lbl.toLowerCase()))) {
      return sib as HTMLElement
    }
  }
  return grid
}

export function tryInjectViaGridContainer(
  markerAttr: string,
  createItem: (template: HTMLElement) => HTMLElement
): boolean {
  const gridContainers = Array.from(
    document.querySelectorAll<HTMLElement>('[class*="univer-grid"][class*="univer-gap-1"]')
  ).filter(el => {
    if (el.querySelector(`[${markerAttr}]`)) return false
    const gridText = (el.textContent || '').toLowerCase()
    if (!CONTEXT_MENU_ANCHOR_LABELS.some(lbl => gridText.includes(lbl.toLowerCase()))) return false
    if (gridText.includes('copy') && !gridText.includes('copy special') && !gridText.includes('insert')) return false
    const childGrids = el.querySelectorAll<HTMLElement>('[class*="univer-grid"][class*="univer-gap-1"]')
    for (const child of childGrids) {
      if (child === el) continue
      const childText = (child.textContent || '').toLowerCase()
      if (CONTEXT_MENU_ANCHOR_LABELS.some(lbl => childText.includes(lbl.toLowerCase()))) return false
    }
    return true
  })
  for (const grid of gridContainers) {
    const insertParent = findGridInsertParent(grid)
    const template = insertParent.querySelector<HTMLElement>(
      'button, [role="button"], .univer-menu-item, [class*="menu-item"]'
    )
    if (!template) continue
    if (document.querySelector(`[${markerAttr}]`)) return true
    const item = createItem(template)
    insertParent.prepend(item)
    return true
  }
  return false
}

export function findMenuItemCandidate(el: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = el
  for (let d = 0; d < 6 && current; d++) {
    const cls = (current.getAttribute('class') || '').toLowerCase()
    const role = current.getAttribute('role')
    const tag = current.tagName.toLowerCase()
    if (role === 'menuitem' || cls.includes('menu-item') || tag === 'li' || tag === 'button') {
      return current
    }
    current = current.parentElement
  }
  return null
}

export function tryInjectViaTextSearch(
  anchorX: number,
  anchorY: number,
  markerAttr: string,
  createItem: (template: HTMLElement) => HTMLElement
): boolean {
  const allElements = Array.from(document.querySelectorAll<HTMLElement>('body *'))
  const anchorCandidates: HTMLElement[] = []
  for (const el of allElements) {
    const text = (el.textContent || '').trim()
    if (!text) continue
    if (el.closest('[style*="display: none"]') || el.closest('.rc-menu-hidden')) continue
    if (!CONTEXT_MENU_ANCHOR_LABELS.some(lbl => text.includes(lbl))) continue
    const candidate = findMenuItemCandidate(el)
    if (candidate) anchorCandidates.push(candidate)
  }
  if (anchorCandidates.length === 0) return false
  const closest = anchorCandidates
    .map(el => ({ el, dist: distanceToRect(anchorX, anchorY, el.getBoundingClientRect()) }))
    .sort((a, b) => a.dist - b.dist)[0]?.el
  if (!closest) return false
  const parent = closest.parentElement
  if (!parent || parent.querySelector(`[${markerAttr}]`)) return true
  const item = createItem(closest)
  if (document.querySelector(`[${markerAttr}]`)) return true
  closest.before(item)
  return true
}

export function tryInjectContextMenuItem(
  anchorX: number,
  anchorY: number,
  markerAttr: string,
  createItem: (template: HTMLElement) => HTMLElement
): boolean {
  if (document.querySelector(`[${markerAttr}]`)) return true
  return (
    tryInjectViaMenuGroupList(markerAttr, createItem) ||
    tryInjectViaGridContainer(markerAttr, createItem) ||
    tryInjectViaTextSearch(anchorX, anchorY, markerAttr, createItem)
  )
}

export function removeInjectedContextMenuItem(markerAttr: string): void {
  document.querySelectorAll<HTMLElement>(`[${markerAttr}]`).forEach(item => item.remove())
}

/**
 * Hides the "Protect Rows And Columns" item from Univer's context menu.
 */
export function hideProtectContextMenuItem(): void {
  if (typeof document === 'undefined') return
  const candidates = document.querySelectorAll<HTMLElement>(
    'button, [role="button"], [role="menuitem"], .univer-menu-item, [class*="menu-item"], [class*="univer-h-8"]'
  )
  for (const el of candidates) {
    if (el.style.display === 'none') continue
    const spans = el.querySelectorAll('span')
    for (const span of spans) {
      if (span.children.length > 0) continue
      const text = (span.textContent || '').trim()
      if (/^protect/i.test(text)) {
        el.style.display = 'none'
        break
      }
    }
  }
}

export function scheduleContextMenuInjectionPoll(run: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      globalThis.setTimeout(run, 0)
    })
  })
}
