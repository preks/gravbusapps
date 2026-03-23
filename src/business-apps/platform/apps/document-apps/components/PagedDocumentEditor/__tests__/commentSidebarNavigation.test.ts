import {
  hydrateInlineCommentSelectionPages,
  requestEditorSelectionAnchorPosition,
  resolveInlineCommentSelectionPageNumbers,
  scrollEditorSelectionNodeIntoView,
  scrollInlineCommentRangeIntoView
} from '../commentSidebarNavigation'

describe('commentSidebarNavigation', () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame

  afterEach(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame
    jest.restoreAllMocks()
  })

  it('resolves unique page numbers for the selection endpoints', () => {
    const pageTwo = document.createElement('div')
    pageTwo.className = 'rm-page-body-layer'
    pageTwo.dataset.rmPageNumber = '2'
    const pageThree = document.createElement('div')
    pageThree.className = 'rm-page-body-layer'
    pageThree.dataset.rmPageNumber = '3'
    const startNode = document.createElement('span')
    const endNode = document.createElement('span')
    pageTwo.appendChild(startNode)
    pageThree.appendChild(endNode)

    const pageNumbers = resolveInlineCommentSelectionPageNumbers(
      {
        view: {
          dom: document.createElement('div'),
          nodeDOM: (pos: number) => (pos === 15 ? startNode : pos === 29 ? endNode : null),
          domAtPos: () => ({ node: startNode }),
          coordsAtPos: () => ({ top: 0, bottom: 0 })
        }
      },
      15,
      30
    )

    expect(pageNumbers).toEqual([2, 3])
  })

  it('resolves selection page numbers from layout hints when target DOM is unavailable', () => {
    const pageNumbers = resolveInlineCommentSelectionPageNumbers(
      {
        layoutHints: {
          pagePositionRanges: [
            { pageNumber: 2, startPos: 15, endPos: 19 },
            { pageNumber: 3, startPos: 29, endPos: 35 }
          ],
          mountedPageBodyBounds: [
            { pageNumber: 2, top: 100, bottom: 200, left: 20, right: 120 },
            { pageNumber: 3, top: 240, bottom: 340, left: 20, right: 120 }
          ]
        },
        view: {
          dom: document.createElement('div'),
          nodeDOM: () => null,
          domAtPos: () => {
            throw new Error('not mounted')
          },
          coordsAtPos: (pos: number) =>
            pos === 15
              ? {
                  top: 140,
                  bottom: 160
                }
              : {
                  top: 260,
                  bottom: 280
                }
        }
      },
      15,
      30
    )

    expect(pageNumbers).toEqual([2, 3])
  })

  it('hydrates selection pages from stored position ranges when coords and DOM are unavailable', () => {
    const hydratePageBreakShells = jest.fn(() => true)

    expect(
      hydrateInlineCommentSelectionPages(
        {
          commands: {
            hydratePageBreakShells
          },
          layoutHints: {
            pagePositionRanges: [
              { pageNumber: 7, startPos: 70, endPos: 74 },
              { pageNumber: 8, startPos: 75, endPos: 82 }
            ],
            mountedPageBodyBounds: []
          },
          view: {
            dom: document.createElement('div'),
            nodeDOM: () => null,
            domAtPos: () => {
              throw new Error('not mounted')
            },
            coordsAtPos: () => {
              throw new Error('not mounted')
            }
          }
        },
        70,
        83
      )
    ).toBe(true)

    expect(hydratePageBreakShells).toHaveBeenCalledWith([7, 8])
  })

  it('scrolls immediately without hydrating when the selection is already measurable', () => {
    const frameCallbacks: FrameRequestCallback[] = []
    global.requestAnimationFrame = callback => {
      frameCallbacks.push(callback)
      return frameCallbacks.length
    }

    const viewport = document.createElement('div')
    viewport.className = 'document-editor-viewport'
    viewport.scrollTop = 0
    Object.defineProperty(viewport, 'clientHeight', { value: 200, configurable: true })
    viewport.getBoundingClientRect = () =>
      ({
        top: 100,
        bottom: 300
      }) as DOMRect

    const pageTwo = document.createElement('div')
    pageTwo.className = 'rm-page-body-layer'
    pageTwo.dataset.rmPageNumber = '2'
    const startNode = document.createElement('span')
    pageTwo.appendChild(startNode)
    viewport.appendChild(pageTwo)

    const hydratePageBreakShells = jest.fn(() => true)
    const coordsAtPos = jest.fn((pos: number) =>
      pos === 10
        ? {
            top: 340,
            bottom: 360
          }
        : {
            top: 380,
            bottom: 400
          }
    )

    scrollInlineCommentRangeIntoView(
      {
        commands: {
          hydratePageBreakShells
        },
        view: {
          dom: pageTwo,
          nodeDOM: () => startNode,
          domAtPos: () => ({ node: startNode }),
          coordsAtPos
        }
      },
      10,
      20,
      'comment-1'
    )

    expect(frameCallbacks).toHaveLength(1)

    frameCallbacks.shift()?.(0)

    expect(hydratePageBreakShells).not.toHaveBeenCalled()
    expect(coordsAtPos).toHaveBeenCalledWith(10)
    expect(coordsAtPos).toHaveBeenCalledWith(19)
    expect(viewport.scrollTop).toBe(124)
  })

  it('hydrates the selection pages when scrolling cannot be resolved from the current window', () => {
    const frameCallbacks: FrameRequestCallback[] = []
    global.requestAnimationFrame = callback => {
      frameCallbacks.push(callback)
      return frameCallbacks.length
    }

    const viewport = document.createElement('div')
    viewport.className = 'document-editor-viewport'
    viewport.scrollTop = 0
    Object.defineProperty(viewport, 'clientHeight', { value: 200, configurable: true })
    viewport.getBoundingClientRect = () =>
      ({
        top: 100,
        bottom: 300
      }) as DOMRect

    const pageTwo = document.createElement('div')
    pageTwo.className = 'rm-page-body-layer'
    pageTwo.dataset.rmPageNumber = '2'
    const startNode = document.createElement('span')
    viewport.appendChild(pageTwo)

    let hydrated = false
    const hydratePageBreakShells = jest.fn(() => {
      hydrated = true
      pageTwo.appendChild(startNode)
      return true
    })
    const coordsAtPos = jest.fn(() => {
      if (!hydrated) {
        throw new Error('not mounted')
      }

      return {
        top: 340,
        bottom: 360
      }
    })

    scrollInlineCommentRangeIntoView(
      {
        commands: {
          hydratePageBreakShells
        },
        layoutHints: {
          pagePositionRanges: [{ pageNumber: 2, startPos: 10, endPos: 25 }],
          mountedPageBodyBounds: []
        },
        view: {
          dom: pageTwo,
          nodeDOM: () => (hydrated ? startNode : null),
          domAtPos: () => {
            if (!hydrated) {
              throw new Error('not mounted')
            }

            return { node: startNode }
          },
          coordsAtPos
        }
      },
      10,
      20,
      'comment-1'
    )

    expect(frameCallbacks).toHaveLength(1)
    frameCallbacks.shift()?.(0)

    expect(hydratePageBreakShells).toHaveBeenCalledWith([2])
    expect(frameCallbacks).toHaveLength(1)

    frameCallbacks.shift()?.(16)

    expect(coordsAtPos).toHaveBeenCalled()
    expect(viewport.scrollTop).toBe(84)
  })

  it('calls the DOM fallback when coords cannot be resolved', () => {
    global.requestAnimationFrame = callback => {
      callback(0)
      return 1
    }

    const commentElement = document.createElement('div')
    commentElement.dataset.commentId = 'comment-1'
    const scrollIntoView = jest.fn()
    commentElement.scrollIntoView = scrollIntoView
    document.body.appendChild(commentElement)

    scrollInlineCommentRangeIntoView(
      {
        view: {
          dom: document.createElement('div'),
          domAtPos: () => {
            throw new Error('not mounted')
          },
          coordsAtPos: () => {
            throw new Error('not mounted')
          }
        }
      },
      10,
      20,
      'comment-1'
    )

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    commentElement.remove()
  })

  it('uses published layout body bounds to scroll when editor coords are unavailable', () => {
    global.requestAnimationFrame = callback => {
      callback(0)
      return 1
    }

    const viewport = document.createElement('div')
    viewport.className = 'document-editor-viewport'
    viewport.scrollTop = 0
    Object.defineProperty(viewport, 'clientHeight', { value: 200, configurable: true })
    viewport.getBoundingClientRect = () =>
      ({
        top: 100,
        bottom: 300
      }) as DOMRect

    const pageSix = document.createElement('div')
    pageSix.className = 'rm-page-body-layer'
    pageSix.dataset.rmPageNumber = '6'
    pageSix.dataset.layoutBodyTop = '420'
    pageSix.dataset.layoutBodyBottom = '520'
    pageSix.dataset.layoutBodyLeft = '30'
    pageSix.dataset.layoutBodyRight = '130'
    const targetNode = document.createElement('span')
    pageSix.appendChild(targetNode)
    viewport.appendChild(pageSix)

    scrollInlineCommentRangeIntoView(
      {
        view: {
          dom: pageSix,
          nodeDOM: () => targetNode,
          domAtPos: () => ({ node: targetNode }),
          coordsAtPos: () => {
            throw new Error('not mounted')
          }
        }
      },
      60,
      68,
      'comment-1'
    )

    expect(viewport.scrollTop).toBe(244)
  })

  it('hydrates before scrolling a selection node into view when the target is still unresolved', () => {
    const frameCallbacks: FrameRequestCallback[] = []
    global.requestAnimationFrame = callback => {
      frameCallbacks.push(callback)
      return frameCallbacks.length
    }

    const pageFour = document.createElement('div')
    pageFour.className = 'rm-page-body-layer'
    pageFour.dataset.rmPageNumber = '4'
    const targetNode = document.createElement('span')
    const scrollIntoView = jest.fn()
    targetNode.scrollIntoView = scrollIntoView
    let hydrated = false
    const hydratePageBreakShells = jest.fn(() => {
      hydrated = true
      pageFour.appendChild(targetNode)
      return true
    })

    scrollEditorSelectionNodeIntoView(
      {
        commands: {
          hydratePageBreakShells
        },
        layoutHints: {
          pagePositionRanges: [{ pageNumber: 4, startPos: 40, endPos: 48 }],
          mountedPageBodyBounds: []
        },
        view: {
          dom: pageFour,
          nodeDOM: () => (hydrated ? targetNode : null),
          domAtPos: () => {
            if (!hydrated) {
              throw new Error('not mounted')
            }

            return { node: targetNode }
          },
          coordsAtPos: () => {
            throw new Error('not mounted')
          }
        }
      },
      40,
      48,
      'center'
    )

    expect(frameCallbacks).toHaveLength(1)
    frameCallbacks.shift()?.(0)

    expect(hydratePageBreakShells).toHaveBeenCalledWith([4])
    expect(scrollIntoView).not.toHaveBeenCalled()
    expect(frameCallbacks).toHaveLength(1)

    frameCallbacks.shift()?.(16)

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })

  it('scrolls using layout hints when the selection target is not mounted', () => {
    global.requestAnimationFrame = callback => {
      callback(0)
      return 1
    }

    const viewport = document.createElement('div')
    viewport.className = 'document-editor-viewport'
    viewport.scrollTop = 0
    viewport.getBoundingClientRect = () =>
      ({
        top: 100,
        bottom: 300
      }) as DOMRect

    const editorRoot = document.createElement('div')
    viewport.appendChild(editorRoot)

    scrollEditorSelectionNodeIntoView(
      {
        layoutHints: {
          mountedPageBodyBounds: [{ pageNumber: 6, top: 410, bottom: 510, left: 28, right: 128 }]
        },
        view: {
          dom: editorRoot,
          nodeDOM: () => null,
          domAtPos: () => {
            throw new Error('not mounted')
          },
          coordsAtPos: () => ({
            top: 430,
            bottom: 450
          })
        }
      },
      60,
      68,
      'center'
    )

    expect(viewport.scrollTop).toBe(260)
  })

  it('requests viewport page focus before hydrating a selection node into view', () => {
    const frameCallbacks: FrameRequestCallback[] = []
    global.requestAnimationFrame = callback => {
      frameCallbacks.push(callback)
      return frameCallbacks.length
    }

    const editorRoot = document.createElement('div')
    const targetNode = document.createElement('span')
    const scrollIntoView = jest.fn()
    targetNode.scrollIntoView = scrollIntoView

    let viewportFocused = false
    const requestViewportPageFocus = jest.fn(() => {
      viewportFocused = true
      return true
    })
    const hydratePageBreakShells = jest.fn(() => true)

    scrollEditorSelectionNodeIntoView(
      {
        commands: {
          hydratePageBreakShells,
          requestViewportPageFocus
        },
        layoutHints: {
          pagePositionRanges: [{ pageNumber: 6, startPos: 60, endPos: 68 }],
          mountedPageBodyBounds: []
        },
        view: {
          dom: editorRoot,
          nodeDOM: () => (viewportFocused ? targetNode : null),
          domAtPos: () => {
            if (!viewportFocused) {
              throw new Error('not mounted')
            }

            return { node: targetNode }
          },
          coordsAtPos: () => {
            throw new Error('not mounted')
          }
        }
      },
      60,
      68,
      'center'
    )

    expect(frameCallbacks).toHaveLength(1)
    frameCallbacks.shift()?.(0)

    expect(requestViewportPageFocus).toHaveBeenCalledWith(6)
    expect(hydratePageBreakShells).not.toHaveBeenCalled()
    expect(frameCallbacks).toHaveLength(1)

    frameCallbacks.shift()?.(16)

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    expect(hydratePageBreakShells).not.toHaveBeenCalled()
  })

  it('waits for the viewport layout to settle before retrying page-focus recovery', () => {
    const frameCallbacks: FrameRequestCallback[] = []
    global.requestAnimationFrame = callback => {
      frameCallbacks.push(callback)
      return frameCallbacks.length
    }

    const viewport = document.createElement('div')
    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowKey = 'window-1'
    viewport.dataset.layoutMountedStart = '1'
    viewport.dataset.layoutMountedEnd = '3'
    viewport.dataset.layoutRuntimeGeneration = '1'
    viewport.dataset.layoutRuntimeStatus = 'idle'

    const editorRoot = document.createElement('div')
    viewport.appendChild(editorRoot)
    const targetNode = document.createElement('span')
    const scrollIntoView = jest.fn()
    targetNode.scrollIntoView = scrollIntoView

    let viewportFocused = false
    const requestViewportPageFocus = jest.fn(() => {
      viewportFocused = true
      viewport.scrollTop = 320
      viewport.dataset.layoutRuntimeStatus = 'scheduled'
      return true
    })
    const hydratePageBreakShells = jest.fn(() => true)

    scrollEditorSelectionNodeIntoView(
      {
        commands: {
          hydratePageBreakShells,
          requestViewportPageFocus
        },
        layoutHints: {
          pagePositionRanges: [{ pageNumber: 6, startPos: 60, endPos: 68 }],
          mountedPageBodyBounds: []
        },
        view: {
          dom: editorRoot,
          nodeDOM: () => (viewportFocused ? targetNode : null),
          domAtPos: () => {
            if (!viewportFocused) {
              throw new Error('not mounted')
            }

            return { node: targetNode }
          },
          coordsAtPos: () => {
            throw new Error('not mounted')
          }
        }
      },
      60,
      68,
      'center'
    )

    expect(frameCallbacks).toHaveLength(1)
    frameCallbacks.shift()?.(0)

    expect(requestViewportPageFocus).toHaveBeenCalledWith(6)
    expect(scrollIntoView).not.toHaveBeenCalled()
    expect(hydratePageBreakShells).not.toHaveBeenCalled()
    expect(frameCallbacks).toHaveLength(1)

    frameCallbacks.shift()?.(16)

    expect(scrollIntoView).not.toHaveBeenCalled()
    expect(hydratePageBreakShells).not.toHaveBeenCalled()
    expect(frameCallbacks).toHaveLength(1)

    viewport.dataset.layoutRuntimeStatus = 'idle'
    viewport.dataset.layoutRuntimeGeneration = '2'
    frameCallbacks.shift()?.(32)

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    expect(hydratePageBreakShells).not.toHaveBeenCalled()
  })

  it('hydrates before resolving a selection anchor position when the target remains unresolved', () => {
    const frameCallbacks: FrameRequestCallback[] = []
    global.requestAnimationFrame = callback => {
      frameCallbacks.push(callback)
      return frameCallbacks.length
    }

    const pageFive = document.createElement('div')
    pageFive.className = 'rm-page-body-layer'
    pageFive.dataset.rmPageNumber = '5'
    const targetNode = document.createElement('span')
    let hydrated = false
    const hydratePageBreakShells = jest.fn(() => {
      hydrated = true
      pageFive.appendChild(targetNode)
      return true
    })
    const onResolved = jest.fn()

    requestEditorSelectionAnchorPosition(
      {
        commands: {
          hydratePageBreakShells
        },
        layoutHints: {
          pagePositionRanges: [{ pageNumber: 5, startPos: 50, endPos: 60 }],
          mountedPageBodyBounds: []
        },
        view: {
          dom: pageFive,
          nodeDOM: () => (hydrated ? targetNode : null),
          domAtPos: () => {
            if (!hydrated) {
              throw new Error('not mounted')
            }

            return { node: targetNode }
          },
          coordsAtPos: () => {
            if (!hydrated) {
              throw new Error('not mounted')
            }

            return {
              top: 220,
              bottom: 240
            }
          }
        }
      },
      50,
      60,
      onResolved
    )

    expect(frameCallbacks).toHaveLength(1)
    frameCallbacks.shift()?.(0)

    expect(hydratePageBreakShells).toHaveBeenCalledWith([5])
    expect(onResolved).not.toHaveBeenCalled()
    expect(frameCallbacks).toHaveLength(1)

    frameCallbacks.shift()?.(16)

    expect(onResolved).toHaveBeenCalledWith({
      top: 220,
      left: 0
    })
  })

  it('requests viewport page focus before hydrating anchor recovery', () => {
    const frameCallbacks: FrameRequestCallback[] = []
    global.requestAnimationFrame = callback => {
      frameCallbacks.push(callback)
      return frameCallbacks.length
    }

    let viewportFocused = false
    const requestViewportPageFocus = jest.fn(() => {
      viewportFocused = true
      return true
    })
    const hydratePageBreakShells = jest.fn(() => true)
    const onResolved = jest.fn()

    requestEditorSelectionAnchorPosition(
      {
        commands: {
          hydratePageBreakShells,
          requestViewportPageFocus
        },
        layoutHints: {
          pagePositionRanges: [{ pageNumber: 5, startPos: 50, endPos: 60 }],
          mountedPageBodyBounds: []
        },
        view: {
          dom: document.createElement('div'),
          nodeDOM: () => (viewportFocused ? document.createElement('span') : null),
          domAtPos: () => {
            if (!viewportFocused) {
              throw new Error('not mounted')
            }

            return { node: document.createElement('span') }
          },
          coordsAtPos: () => {
            if (!viewportFocused) {
              throw new Error('not mounted')
            }

            return {
              top: 220,
              bottom: 240
            }
          }
        }
      },
      50,
      60,
      onResolved
    )

    expect(frameCallbacks).toHaveLength(1)
    frameCallbacks.shift()?.(0)

    expect(requestViewportPageFocus).toHaveBeenCalledWith(5)
    expect(hydratePageBreakShells).not.toHaveBeenCalled()
    expect(frameCallbacks).toHaveLength(1)

    frameCallbacks.shift()?.(16)

    expect(onResolved).toHaveBeenCalledWith({
      top: 220,
      left: 0
    })
    expect(hydratePageBreakShells).not.toHaveBeenCalled()
  })

  it('uses layout hints to resolve anchor position when the target DOM is unavailable', () => {
    global.requestAnimationFrame = callback => {
      callback(0)
      return 1
    }

    const onResolved = jest.fn()

    requestEditorSelectionAnchorPosition(
      {
        layoutHints: {
          mountedPageBodyBounds: [{ pageNumber: 5, top: 200, bottom: 280, left: 32, right: 132 }]
        },
        view: {
          dom: document.createElement('div'),
          nodeDOM: () => null,
          domAtPos: () => {
            throw new Error('not mounted')
          },
          coordsAtPos: () => ({
            top: 220,
            bottom: 240
          })
        }
      },
      50,
      60,
      onResolved
    )

    expect(onResolved).toHaveBeenCalledWith({
      top: 220,
      left: 32
    })
  })

  it('uses published layout body bounds to resolve anchor position when coords are unavailable', () => {
    global.requestAnimationFrame = callback => {
      callback(0)
      return 1
    }

    const pageSeven = document.createElement('div')
    pageSeven.className = 'rm-page-body-layer'
    pageSeven.dataset.rmPageNumber = '7'
    pageSeven.dataset.layoutBodyTop = '510'
    pageSeven.dataset.layoutBodyBottom = '610'
    pageSeven.dataset.layoutBodyLeft = '40'
    pageSeven.dataset.layoutBodyRight = '140'
    const targetNode = document.createElement('span')
    pageSeven.appendChild(targetNode)
    const onResolved = jest.fn()

    requestEditorSelectionAnchorPosition(
      {
        view: {
          dom: pageSeven,
          nodeDOM: () => targetNode,
          domAtPos: () => ({ node: targetNode }),
          coordsAtPos: () => {
            throw new Error('not mounted')
          }
        }
      },
      70,
      78,
      onResolved
    )

    expect(onResolved).toHaveBeenCalledWith({
      top: 510,
      left: 40
    })
  })

  it('returns false when no mounted page metadata is available', () => {
    expect(
      hydrateInlineCommentSelectionPages(
        {
          commands: {
            hydratePageBreakShells: jest.fn(() => true)
          },
          view: {
            dom: document.createElement('div'),
            nodeDOM: () => null,
            domAtPos: () => {
              throw new Error('no dom')
            },
            coordsAtPos: () => ({ top: 0, bottom: 0 })
          }
        },
        10,
        20
      )
    ).toBe(false)
  })
})
