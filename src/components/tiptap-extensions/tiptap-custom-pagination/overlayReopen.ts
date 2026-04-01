import { findPaginationPageBreakElement } from './dom'

export interface ActivePaginationOverlayEditor {
  type: 'header' | 'footer'
  pageNumber: number
}

type FrameScheduler = (callback: FrameRequestCallback) => number

function resolveOverlayTargetWithinMountedShell(
  editorDom: HTMLElement,
  activeEditor: ActivePaginationOverlayEditor
): HTMLElement | null {
  if (activeEditor.type === 'header') {
    if (activeEditor.pageNumber === 1) {
      const firstPageHeader = editorDom.querySelector(
        '.rm-first-page-header[data-rm-page-number="1"][data-rm-editor-type="header"]'
      )
      if (firstPageHeader instanceof HTMLElement) {
        return firstPageHeader
      }
      const fallback = editorDom.querySelector('[data-rm-editor-type="header"][data-rm-page-number="1"]')
      return fallback instanceof HTMLElement ? fallback : null
    }

    const previousPageBreak = findPaginationPageBreakElement(editorDom, activeEditor.pageNumber - 1)
    const headerTarget = previousPageBreak?.querySelector(
      `.rm-page-header-region[data-rm-page-number="${activeEditor.pageNumber}"][data-rm-editor-type="header"]`
    )
    return headerTarget instanceof HTMLElement ? headerTarget : null
  }

  const currentPageBreak = findPaginationPageBreakElement(editorDom, activeEditor.pageNumber)
  const footerTarget = currentPageBreak?.querySelector(
    `.rm-page-footer-region[data-rm-page-number="${activeEditor.pageNumber}"][data-rm-editor-type="footer"]`
  )
  return footerTarget instanceof HTMLElement ? footerTarget : null
}

export function findPaginationOverlayTarget(
  editorDom: ParentNode,
  activeEditor: ActivePaginationOverlayEditor
): HTMLElement | null {
  if (editorDom instanceof HTMLElement) {
    const mountedShellTarget = resolveOverlayTargetWithinMountedShell(editorDom, activeEditor)
    if (mountedShellTarget) {
      return mountedShellTarget
    }
  }

  const selector = `[data-rm-editor-type="${activeEditor.type}"][data-rm-page-number="${activeEditor.pageNumber}"]`
  const target = editorDom.querySelector(selector)
  return target instanceof HTMLElement ? target : null
}

export function schedulePaginationOverlayReopen(options: {
  activeEditor: ActivePaginationOverlayEditor
  resolveEditorDom: () => HTMLElement | null
  reopen: (target: HTMLElement) => void
  scheduleFrame?: FrameScheduler
}) {
  const scheduleFrame = options.scheduleFrame ?? requestAnimationFrame

  scheduleFrame(() => {
    const editorDom = options.resolveEditorDom()
    if (!editorDom) return

    const target = findPaginationOverlayTarget(editorDom, options.activeEditor)
    if (!target) return

    options.reopen(target)
  })
}

export function retryPaginationOverlayOpen(options: {
  attemptOpen: () => boolean
  attemptsLeft?: number
  scheduleFrame?: FrameScheduler
}) {
  const scheduleFrame = options.scheduleFrame ?? requestAnimationFrame
  const attemptsLeft = options.attemptsLeft ?? 2

  if (options.attemptOpen() || attemptsLeft <= 0) {
    return
  }

  scheduleFrame(() => {
    retryPaginationOverlayOpen({
      attemptOpen: options.attemptOpen,
      attemptsLeft: attemptsLeft - 1,
      scheduleFrame
    })
  })
}
