import {
  resolveDeferredRepaginationOutcome,
  resolvePaginationSelectionBodyOverflow,
  resolveTablePaginationHeuristics
} from '../PaginationPlus'

describe('resolveDeferredRepaginationOutcome', () => {
  it('refreshes first and only prefers a split on the next stable pass after page growth', () => {
    const heuristics = resolveTablePaginationHeuristics(null, false)
    const refreshOutcome = resolveDeferredRepaginationOutcome({
      currentPageCount: 1,
      measuredPageCount: 2,
      allowMerge: heuristics.allowMerge,
      allowSplit: heuristics.allowSplit,
      preferSplitAfterRefresh: false,
      splitCandidate: {
        tablePos: 12,
        splitRowIndex: 3
      },
      mergeCandidate: null,
      rejectedSplitKey: null,
      rejectedMergeKey: null
    })

    expect(refreshOutcome).toEqual({
      type: 'refresh',
      nextPreferSplitAfterRefresh: true
    })

    if (refreshOutcome.type !== 'refresh') {
      throw new Error('Expected a refresh outcome after page growth')
    }

    expect(
      resolveDeferredRepaginationOutcome({
        currentPageCount: 2,
        measuredPageCount: 2,
        allowMerge: heuristics.allowMerge,
        allowSplit: heuristics.allowSplit,
        preferSplitAfterRefresh: refreshOutcome.nextPreferSplitAfterRefresh,
        splitCandidate: {
          tablePos: 12,
          splitRowIndex: 3
        },
        mergeCandidate: {
          paginationSplitId: 'pagination-split-1',
          firstTablePos: 12,
          secondTablePos: 48
        },
        rejectedSplitKey: null,
        rejectedMergeKey: null
      })
    ).toMatchObject({
      type: 'split',
      candidateKey: 'split:12:3'
    })
  })

  it('merges immediately when page shrink makes adjacent fragments safe to reunify', () => {
    const heuristics = resolveTablePaginationHeuristics(null, false)

    expect(
      resolveDeferredRepaginationOutcome({
        currentPageCount: 2,
        measuredPageCount: 1,
        allowMerge: heuristics.allowMerge,
        allowSplit: heuristics.allowSplit,
        preferSplitAfterRefresh: false,
        splitCandidate: null,
        mergeCandidate: {
          paginationSplitId: 'pagination-split-2',
          firstTablePos: 20,
          secondTablePos: 56
        },
        rejectedSplitKey: null,
        rejectedMergeKey: null
      })
    ).toMatchObject({
      type: 'merge',
      candidateKey: 'pagination-split-2:20:56'
    })
  })

  it('still refreshes on page shrink when there is no safe merge candidate yet', () => {
    const heuristics = resolveTablePaginationHeuristics(null, false)

    expect(
      resolveDeferredRepaginationOutcome({
        currentPageCount: 2,
        measuredPageCount: 1,
        allowMerge: heuristics.allowMerge,
        allowSplit: heuristics.allowSplit,
        preferSplitAfterRefresh: false,
        splitCandidate: null,
        mergeCandidate: null,
        rejectedSplitKey: null,
        rejectedMergeKey: null
      })
    ).toEqual({
      type: 'refresh',
      nextPreferSplitAfterRefresh: false
    })
  })

  it('allows a row-return merge on the next stable pass when shrink refresh happened first', () => {
    const heuristics = resolveTablePaginationHeuristics(null, false)
    const refreshOutcome = resolveDeferredRepaginationOutcome({
      currentPageCount: 2,
      measuredPageCount: 1,
      allowMerge: heuristics.allowMerge,
      allowSplit: heuristics.allowSplit,
      preferSplitAfterRefresh: false,
      splitCandidate: null,
      mergeCandidate: null,
      rejectedSplitKey: null,
      rejectedMergeKey: null
    })

    expect(refreshOutcome).toEqual({
      type: 'refresh',
      nextPreferSplitAfterRefresh: false
    })

    if (refreshOutcome.type !== 'refresh') {
      throw new Error('Expected a refresh outcome before merge candidate appeared')
    }

    expect(
      resolveDeferredRepaginationOutcome({
        currentPageCount: 1,
        measuredPageCount: 1,
        allowMerge: heuristics.allowMerge,
        allowSplit: heuristics.allowSplit,
        preferSplitAfterRefresh: refreshOutcome.nextPreferSplitAfterRefresh,
        splitCandidate: null,
        mergeCandidate: {
          paginationSplitId: 'pagination-split-2',
          firstTablePos: 20,
          secondTablePos: 56
        },
        rejectedSplitKey: null,
        rejectedMergeKey: null
      })
    ).toMatchObject({
      type: 'merge',
      candidateKey: 'pagination-split-2:20:56'
    })
  })

  it('merges adjacent fragments after a border shrink once split pressure is gone', () => {
    const heuristics = resolveTablePaginationHeuristics(null, false)

    expect(
      resolveDeferredRepaginationOutcome({
        currentPageCount: 2,
        measuredPageCount: 2,
        allowMerge: heuristics.allowMerge,
        allowSplit: heuristics.allowSplit,
        preferSplitAfterRefresh: false,
        splitCandidate: null,
        mergeCandidate: {
          paginationSplitId: 'pagination-split-7',
          firstTablePos: 25,
          secondTablePos: 77
        },
        rejectedSplitKey: null,
        rejectedMergeKey: null
      })
    ).toMatchObject({
      type: 'merge',
      candidateKey: 'pagination-split-7:25:77'
    })
  })
})

describe('resolvePaginationSelectionBodyOverflow', () => {
  function setRect(element: HTMLElement, rect: { top: number; bottom: number; left?: number; right?: number }) {
    Object.defineProperty(element, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: rect.left ?? 0,
        y: rect.top,
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left ?? 0,
        right: rect.right ?? 100,
        width: (rect.right ?? 100) - (rect.left ?? 0),
        height: rect.bottom - rect.top,
        toJSON: () => ''
      })
    })
  }

  it('returns null when the caret already sits inside the page body', () => {
    const editorDom = document.createElement('div')
    const bodyBand = document.createElement('div')

    bodyBand.className = 'rm-page-body-layer'
    bodyBand.dataset.rmPageNumber = '1'
    editorDom.appendChild(bodyBand)
    document.body.appendChild(editorDom)

    setRect(bodyBand, { top: 100, bottom: 300, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true,
          head: 5
        }
      },
      coordsAtPos: () => ({
        top: 140,
        bottom: 160,
        left: 60,
        right: 60
      })
    } as never

    expect(resolvePaginationSelectionBodyOverflow(view)).toBeNull()
  })

  it('clamps an empty-paragraph caret back into the nearest valid body band', () => {
    const editorDom = document.createElement('div')
    const bodyBand = document.createElement('div')

    bodyBand.className = 'rm-page-body-layer'
    bodyBand.dataset.rmPageNumber = '1'
    editorDom.appendChild(bodyBand)
    document.body.appendChild(editorDom)

    setRect(bodyBand, { top: 100, bottom: 300, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true,
          head: 5
        },
        doc: {
          resolve: (position: number) => ({
            parent: {
              type: {
                name: position === 8 ? 'doc' : 'paragraph'
              },
              content: {
                size: 0
              }
            },
            parentOffset: 0,
            nodeBefore: null,
            nodeAfter: null
          })
        }
      },
      coordsAtPos: (position: number) =>
        position === 8
          ? {
              top: 150,
              bottom: 170,
              left: 70,
              right: 70
            }
          : {
              top: 320,
              bottom: 338,
              left: 70,
              right: 70
            },
      posAtCoords: () => ({
        pos: 8
      })
    } as never

    expect(resolvePaginationSelectionBodyOverflow(view)).toEqual({ position: 8 })
  })

  it('routes footer-gap overflow to the next page body instead of snapping back to the previous page', () => {
    const editorDom = document.createElement('div')
    const firstBodyBand = document.createElement('div')
    const secondBodyBand = document.createElement('div')

    firstBodyBand.className = 'rm-page-body-layer'
    firstBodyBand.dataset.rmPageNumber = '1'
    secondBodyBand.className = 'rm-page-body-layer'
    secondBodyBand.dataset.rmPageNumber = '2'
    editorDom.append(firstBodyBand, secondBodyBand)
    document.body.appendChild(editorDom)

    setRect(firstBodyBand, { top: 100, bottom: 300, left: 20, right: 180 })
    setRect(secondBodyBand, { top: 380, bottom: 580, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true,
          head: 5
        },
        doc: {
          resolve: (position: number) => ({
            parent: {
              type: {
                name: position === 12 ? 'doc' : 'paragraph'
              },
              content: {
                size: 0
              }
            },
            parentOffset: 0,
            nodeBefore: null,
            nodeAfter: null
          })
        }
      },
      coordsAtPos: (position: number) =>
        position === 12
          ? {
              top: 430,
              bottom: 448,
              left: 70,
              right: 70
            }
          : {
              top: 330,
              bottom: 348,
              left: 70,
              right: 70
            },
      posAtCoords: ({ top }: { top: number }) => ({
        pos: top > 380 ? 12 : 7
      })
    } as never

    expect(resolvePaginationSelectionBodyOverflow(view, 'forward')).toEqual({ position: 12 })
  })

  it('routes footer-gap overflow back to the previous page body when navigating backward', () => {
    const editorDom = document.createElement('div')
    const firstBodyBand = document.createElement('div')
    const secondBodyBand = document.createElement('div')

    firstBodyBand.className = 'rm-page-body-layer'
    firstBodyBand.dataset.rmPageNumber = '1'
    secondBodyBand.className = 'rm-page-body-layer'
    secondBodyBand.dataset.rmPageNumber = '2'
    editorDom.append(firstBodyBand, secondBodyBand)
    document.body.appendChild(editorDom)

    setRect(firstBodyBand, { top: 100, bottom: 300, left: 20, right: 180 })
    setRect(secondBodyBand, { top: 380, bottom: 580, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true,
          head: 15
        },
        doc: {
          resolve: (position: number) => ({
            parent: {
              type: {
                name: position === 7 ? 'doc' : 'paragraph'
              },
              content: {
                size: 0
              }
            },
            parentOffset: 0,
            nodeBefore: null,
            nodeAfter: null
          })
        }
      },
      coordsAtPos: (position: number) =>
        position === 7
          ? {
              top: 250,
              bottom: 268,
              left: 70,
              right: 70
            }
          : {
              top: 330,
              bottom: 348,
              left: 70,
              right: 70
            },
      posAtCoords: ({ top }: { top: number }) => ({
        pos: top < 320 ? 7 : 12
      })
    } as never

    expect(resolvePaginationSelectionBodyOverflow(view, 'backward')).toEqual({ position: 7 })
  })
})
