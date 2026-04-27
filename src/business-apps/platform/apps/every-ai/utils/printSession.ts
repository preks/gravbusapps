/**
 * printSession - Print the current Every AI conversation as a PDF.
 *
 * Strategy: print the LIVE document, not a clone in a popup. Cloning into
 * a new window loses CSS variables, web fonts, design-system tokens,
 * CSS-in-JS, and Recharts' computed sizes -- which is why the popup
 * approach kept producing PDFs that drifted from the on-screen UI.
 *
 * Instead we:
 *   1. Tag the conversation root with `data-print-target` and every
 *      ancestor up to <body> with `data-print-ancestor`.
 *   2. Inject an `@media print` stylesheet that:
 *        - hides every element on the page,
 *        - re-shows the print target and the ancestor chain,
 *        - neutralises `overflow`, `max-height`, `flex`, `position`,
 *          `transform` on the ancestors so the print target can grow
 *          to its full natural height,
 *        - lifts the print target into the document's initial
 *          containing block via `position: absolute; top: 0; left: 0`,
 *        - asks the browser to keep individual turns / chart cards
 *          together across page breaks,
 *        - forces colour-accurate printing for backgrounds & gradients.
 *   3. Calls `window.print()` and tears everything down on `afterprint`.
 *
 * The browser then renders the existing DOM with the original design
 * tokens, fonts, and chart layouts -- and paginates as many pages as the
 * conversation needs.
 */

const STYLE_ID = 'every-ai-print-style'
const TARGET_ATTR = 'data-print-target'
const ANCESTOR_ATTR = 'data-print-ancestor'

interface PrintSessionOptions {
  /** Live element to print -- typically the conversation scroller. */
  element: HTMLElement | null
  /** Optional title shown in the print dialog and PDF header. */
  title?: string
  /** Optional session id (used to build the default document title). */
  sessionId?: string | null
  /** Optional display name of the current user (kept for API parity). */
  userDisplayName?: string
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/**
 * CSS injected into the live document for the duration of the print
 * dialog. Everything is scoped to `@media print` so the on-screen UI is
 * unaffected.
 */
const PRINT_STYLE = `
@media print {
  /* Force the browser to honour our background colours/gradients. */
  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Reset the page itself. */
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: auto !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
    background: white !important;
  }

  /* Hide every element by default. We use visibility (not display) so
     we don't reflow flex/grid children and break their internal
     layout. We then re-show only the print target subtree. */
  body * {
    visibility: hidden !important;
  }

  /* The ancestor chain must remain laid out (so the print target can
     compute its width), but we strip every constraint that would clip
     content or trap it inside a viewport-sized scroll container. */
  body [${ANCESTOR_ATTR}] {
    visibility: hidden !important;
    position: static !important;
    overflow: visible !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    flex: initial !important;
    transform: none !important;
    box-shadow: none !important;
    background: transparent !important;
    width: auto !important;
  }

  /* Show the print target and every descendant. */
  body [${TARGET_ATTR}],
  body [${TARGET_ATTR}] * {
    visibility: visible !important;
  }

  /* Lift the print target out of any positioned ancestor and pin it to
     the top-left of the page so the print engine starts pagination
     from there. */
  body [${TARGET_ATTR}] {
    position: absolute !important;
    inset: 0 auto auto 0 !important;
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
    flex: initial !important;
    transform: none !important;
    margin: 0 !important;
    padding: 4mm 0 !important;
    background: white !important;
  }

  /* Unconstrain any nested scroller / max-height utility inside the
     print target -- otherwise long messages, code blocks, tables and
     chat-history wrappers would clip after one viewport. */
  body [${TARGET_ATTR}] [class*="overflow-y-auto"],
  body [${TARGET_ATTR}] [class*="overflow-y-scroll"],
  body [${TARGET_ATTR}] [class*="overflow-auto"],
  body [${TARGET_ATTR}] [class*="overflow-scroll"],
  body [${TARGET_ATTR}] [class*="max-h-"] {
    max-height: none !important;
    overflow: visible !important;
  }

  /* Strip interactive controls that make no sense on paper. */
  body [${TARGET_ATTR}] [data-testid="every-ai-load-more-history"],
  body [${TARGET_ATTR}] [data-testid="message-actions"] {
    display: none !important;
  }

  /* Try to keep individual turns / chart cards together. */
  body [${TARGET_ATTR}] [data-testid^="conversation-turn"],
  body [${TARGET_ATTR}] [data-print-card],
  body [${TARGET_ATTR}] .recharts-wrapper,
  body [${TARGET_ATTR}] section,
  body [${TARGET_ATTR}] article {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  @page {
    margin: 12mm;
  }
}
`

interface CleanupRefs {
  ancestors: Element[]
  target: HTMLElement
  styleEl: HTMLStyleElement
  previousTitle: string
  onAfterPrint: () => void
}

function cleanup({ ancestors, target, styleEl, previousTitle, onAfterPrint }: CleanupRefs): void {
  target.removeAttribute(TARGET_ATTR)
  ancestors.forEach(node => node.removeAttribute(ANCESTOR_ATTR))
  styleEl.remove()
  document.title = previousTitle
  window.removeEventListener('afterprint', onAfterPrint)
}

/**
 * Print the live conversation DOM. Returns true if a print was
 * triggered, false otherwise (e.g. no element provided).
 */
export function printSessionAsPdf({ element, title, sessionId }: PrintSessionOptions): boolean {
  if (typeof window === 'undefined') return false
  if (!element) {
    console.warn('printSessionAsPdf: no element to print')
    return false
  }

  // Remove any leftover state from a previous print that may have been
  // interrupted (browser closed, dialog dismissed before afterprint fired).
  document.querySelectorAll(`[${TARGET_ATTR}]`).forEach(n => n.removeAttribute(TARGET_ATTR))
  document.querySelectorAll(`[${ANCESTOR_ATTR}]`).forEach(n => n.removeAttribute(ANCESTOR_ATTR))
  document.getElementById(STYLE_ID)?.remove()

  const docTitle = title || `Every AI session${sessionId ? ` ${sessionId.slice(0, 8)}` : ''}`

  // Mark the print target and its ancestor chain.
  element.setAttribute(TARGET_ATTR, '')
  const ancestors: Element[] = []
  let cursor: HTMLElement | null = element.parentElement
  while (cursor && cursor !== document.body && cursor !== document.documentElement) {
    cursor.setAttribute(ANCESTOR_ATTR, '')
    ancestors.push(cursor)
    cursor = cursor.parentElement
  }

  const styleEl = document.createElement('style')
  styleEl.id = STYLE_ID
  styleEl.textContent = PRINT_STYLE
  document.head.appendChild(styleEl)

  const previousTitle = document.title
  // The browser uses document.title as the default PDF filename.
  document.title = escapeHtml(docTitle)

  const refs: CleanupRefs = {
    ancestors,
    target: element,
    styleEl,
    previousTitle,
    onAfterPrint: () => cleanup(refs)
  }
  window.addEventListener('afterprint', refs.onAfterPrint)

  // Defer one frame so the browser has applied the new <style> before
  // the print dialog opens. Without this, Chrome occasionally captures
  // the page state from before the @media print rules took effect.
  requestAnimationFrame(() => {
    try {
      window.print()
    } catch (err) {
      console.error('printSessionAsPdf: window.print() threw', err)
      cleanup(refs)
    }
  })

  return true
}

export default printSessionAsPdf
