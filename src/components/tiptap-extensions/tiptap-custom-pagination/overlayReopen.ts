export interface ActivePaginationOverlayEditor {
  type: 'header' | 'footer'
  pageNumber: number
}

type FrameScheduler = (callback: FrameRequestCallback) => number

export function findPaginationOverlayTarget(
  editorDom: ParentNode,
  activeEditor: ActivePaginationOverlayEditor
): HTMLElement | null {
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
