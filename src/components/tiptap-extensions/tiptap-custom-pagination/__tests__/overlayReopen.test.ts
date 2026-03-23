import {
  findPaginationOverlayTarget,
  retryPaginationOverlayOpen,
  schedulePaginationOverlayReopen,
  type ActivePaginationOverlayEditor
} from '../overlayReopen'

function createFrameSchedulerHarness() {
  const callbacks: FrameRequestCallback[] = []

  return {
    scheduleFrame: (callback: FrameRequestCallback) => {
      callbacks.push(callback)
      return callbacks.length
    },
    flushNext: () => {
      const callback = callbacks.shift()
      if (!callback) return
      callback(0)
    },
    flushAll: () => {
      while (callbacks.length > 0) {
        const callback = callbacks.shift()
        callback?.(0)
      }
    },
    getPendingCount: () => callbacks.length
  }
}

describe('findPaginationOverlayTarget', () => {
  it('returns the matching header/footer element', () => {
    document.body.innerHTML = `
      <div id="editor">
        <div data-rm-editor-type="header" data-rm-page-number="2"></div>
      </div>
    `

    const activeEditor: ActivePaginationOverlayEditor = { type: 'header', pageNumber: 2 }
    const editorDom = document.getElementById('editor') as HTMLElement

    expect(findPaginationOverlayTarget(editorDom, activeEditor)).toBe(editorDom.firstElementChild)
  })

  it('returns null when the target is missing', () => {
    const editorDom = document.createElement('div')

    expect(findPaginationOverlayTarget(editorDom, { type: 'footer', pageNumber: 3 })).toBeNull()
  })
})

describe('schedulePaginationOverlayReopen', () => {
  it('reopens on the next frame when the target exists', () => {
    const scheduler = createFrameSchedulerHarness()
    const reopen = jest.fn()
    const editorDom = document.createElement('div')
    const target = document.createElement('div')
    target.dataset.rmEditorType = 'header'
    target.dataset.rmPageNumber = '4'
    editorDom.append(target)

    schedulePaginationOverlayReopen({
      activeEditor: { type: 'header', pageNumber: 4 },
      resolveEditorDom: () => editorDom,
      reopen,
      scheduleFrame: scheduler.scheduleFrame
    })

    expect(reopen).not.toHaveBeenCalled()
    scheduler.flushNext()
    expect(reopen).toHaveBeenCalledWith(target)
  })

  it('skips reopen when the target cannot be resolved', () => {
    const scheduler = createFrameSchedulerHarness()
    const reopen = jest.fn()

    schedulePaginationOverlayReopen({
      activeEditor: { type: 'footer', pageNumber: 1 },
      resolveEditorDom: () => null,
      reopen,
      scheduleFrame: scheduler.scheduleFrame
    })

    scheduler.flushNext()
    expect(reopen).not.toHaveBeenCalled()
  })
})

describe('retryPaginationOverlayOpen', () => {
  it('retries on the next frame until open succeeds', () => {
    const scheduler = createFrameSchedulerHarness()
    const attemptOpen = jest
      .fn<() => boolean>()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)

    retryPaginationOverlayOpen({
      attemptOpen,
      attemptsLeft: 3,
      scheduleFrame: scheduler.scheduleFrame
    })

    expect(attemptOpen).toHaveBeenCalledTimes(1)
    expect(scheduler.getPendingCount()).toBe(1)

    scheduler.flushAll()

    expect(attemptOpen).toHaveBeenCalledTimes(3)
  })

  it('stops once attempts are exhausted', () => {
    const scheduler = createFrameSchedulerHarness()
    const attemptOpen = jest.fn<() => boolean>().mockReturnValue(false)

    retryPaginationOverlayOpen({
      attemptOpen,
      attemptsLeft: 1,
      scheduleFrame: scheduler.scheduleFrame
    })

    scheduler.flushAll()

    expect(attemptOpen).toHaveBeenCalledTimes(2)
    expect(scheduler.getPendingCount()).toBe(0)
  })
})
