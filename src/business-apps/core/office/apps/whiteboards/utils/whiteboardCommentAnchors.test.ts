import {
  createWhiteboardCommentAnchorFromElements,
  createWhiteboardCommentAnchorFromViewportPoint,
  getWhiteboardCommentViewportRect,
  normalizeWhiteboardCommentAnchor,
  resolveWhiteboardCommentAnchor
} from './whiteboardCommentAnchors'

describe('whiteboardCommentAnchors', () => {
  it('normalizes negative dimensions into a stable anchor rectangle', () => {
    expect(
      normalizeWhiteboardCommentAnchor({
        x: 200,
        y: 100,
        width: -40,
        height: -20
      })
    ).toEqual({
      x: 160,
      y: 80,
      width: 40,
      height: 20
    })
  })

  it('creates anchors from viewport points using the current zoom and scroll', () => {
    expect(
      createWhiteboardCommentAnchorFromViewportPoint(300, 180, {
        scrollX: 20,
        scrollY: -10,
        zoom: 2
      })
    ).toEqual({
      x: 10,
      y: 30,
      width: 240,
      height: 140
    })
  })

  it('builds viewport rectangles from board coordinates', () => {
    expect(
      getWhiteboardCommentViewportRect(
        {
          x: 40,
          y: 20,
          width: 100,
          height: 50
        },
        {
          scrollX: 10,
          scrollY: 5,
          zoom: 2
        }
      )
    ).toEqual({
      left: 100,
      top: 50,
      width: 200,
      height: 100
    })
  })

  it('uses selected element bounds when available', () => {
    expect(
      createWhiteboardCommentAnchorFromElements([
        {
          id: 'shape-1',
          x: 10,
          y: 20,
          width: 30,
          height: 40,
          isDeleted: false
        },
        {
          id: 'shape-2',
          x: 80,
          y: 60,
          width: 20,
          height: 30,
          isDeleted: false
        }
      ] as never)
    ).toEqual({
      x: 10,
      y: 20,
      width: 90,
      height: 70,
      elementIds: ['shape-1', 'shape-2']
    })
  })

  it('resolves element-anchored comments from current element positions', () => {
    expect(
      resolveWhiteboardCommentAnchor(
        {
          x: 10,
          y: 20,
          width: 30,
          height: 40,
          elementIds: ['shape-1']
        },
        [
          {
            id: 'shape-1',
            x: 100,
            y: 120,
            width: 50,
            height: 60,
            isDeleted: false
          }
        ]
      )
    ).toEqual({
      x: 100,
      y: 120,
      width: 50,
      height: 60,
      elementIds: ['shape-1']
    })
  })
})
