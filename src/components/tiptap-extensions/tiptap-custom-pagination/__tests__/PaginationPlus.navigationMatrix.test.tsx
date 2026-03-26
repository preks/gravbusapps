import { resolvePaginationSelectionBodyOverflow } from '../PaginationPlus'

type Direction = 'forward' | 'backward'
type LayoutVariant = 'no-header-footer' | 'header-only' | 'footer-only' | 'header-and-footer'
type ColumnVariant = 'far-left' | 'left' | 'center' | 'right'
type ShapeVariant = 'paragraph' | 'empty-paragraph' | 'table-row' | 'image-block'

interface Rect {
  top: number
  bottom: number
  left: number
  right: number
}

interface PositionedRect {
  pos: number
  rect: Rect
}

const BODY_LEFT = 20
const BODY_RIGHT = 180

const layoutRects: Record<LayoutVariant, { first: Rect; second: Rect }> = {
  'no-header-footer': {
    first: { top: 100, bottom: 300, left: BODY_LEFT, right: BODY_RIGHT },
    second: { top: 380, bottom: 580, left: BODY_LEFT, right: BODY_RIGHT }
  },
  'header-only': {
    first: { top: 100, bottom: 300, left: BODY_LEFT, right: BODY_RIGHT },
    second: { top: 430, bottom: 630, left: BODY_LEFT, right: BODY_RIGHT }
  },
  'footer-only': {
    first: { top: 100, bottom: 250, left: BODY_LEFT, right: BODY_RIGHT },
    second: { top: 380, bottom: 580, left: BODY_LEFT, right: BODY_RIGHT }
  },
  'header-and-footer': {
    first: { top: 100, bottom: 250, left: BODY_LEFT, right: BODY_RIGHT },
    second: { top: 430, bottom: 630, left: BODY_LEFT, right: BODY_RIGHT }
  }
}

const columnCenters: Record<ColumnVariant, number> = {
  'far-left': 28,
  left: 52,
  center: 100,
  right: 160
}

const columnOffsets: Record<ColumnVariant, { left: number; right: number }> = {
  'far-left': { left: 24, right: 42 },
  left: { left: 44, right: 68 },
  center: { left: 84, right: 116 },
  right: { left: 140, right: 170 }
}

const shapeLineHeights: Record<ShapeVariant, { first: number; second: number; gap: number }> = {
  paragraph: { first: 18, second: 18, gap: 12 },
  'empty-paragraph': { first: 18, second: 18, gap: 2 },
  'table-row': { first: 32, second: 32, gap: 4 },
  'image-block': { first: 52, second: 52, gap: 10 }
}

function setRect(element: HTMLElement, rect: Rect) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: rect.left,
      y: rect.top,
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
      toJSON: () => ''
    })
  })
}

function createBodyBand(pageNumber: number, rect: Rect) {
  const band = document.createElement('div')
  band.className = 'rm-page-body-layer'
  band.dataset.rmPageNumber = String(pageNumber)
  setRect(band, rect)
  return band
}

function buildTargetPositions(
  basePos: number,
  band: Rect,
  shape: ShapeVariant,
  direction: Direction
): Record<ColumnVariant, { primary: PositionedRect; secondary: PositionedRect }> {
  const lines = shapeLineHeights[shape]
  const primaryTop = direction === 'forward' ? band.top + 6 : band.bottom - lines.second - 6
  const secondaryTop =
    direction === 'forward' ? primaryTop + lines.first + lines.gap : primaryTop - lines.first - lines.gap
  const primaryHeight = direction === 'forward' ? lines.first : lines.second
  const secondaryHeight = direction === 'forward' ? lines.second : lines.first

  return {
    'far-left': {
      primary: {
        pos: basePos + 1,
        rect: {
          top: primaryTop,
          bottom: primaryTop + primaryHeight,
          left: columnOffsets['far-left'].left,
          right: columnOffsets['far-left'].right
        }
      },
      secondary: {
        pos: basePos + 11,
        rect: {
          top: secondaryTop,
          bottom: secondaryTop + secondaryHeight,
          left: columnOffsets['far-left'].left,
          right: columnOffsets['far-left'].right
        }
      }
    },
    left: {
      primary: {
        pos: basePos + 2,
        rect: {
          top: primaryTop,
          bottom: primaryTop + primaryHeight,
          left: columnOffsets.left.left,
          right: columnOffsets.left.right
        }
      },
      secondary: {
        pos: basePos + 12,
        rect: {
          top: secondaryTop,
          bottom: secondaryTop + secondaryHeight,
          left: columnOffsets.left.left,
          right: columnOffsets.left.right
        }
      }
    },
    center: {
      primary: {
        pos: basePos + 3,
        rect: {
          top: primaryTop,
          bottom: primaryTop + primaryHeight,
          left: columnOffsets.center.left,
          right: columnOffsets.center.right
        }
      },
      secondary: {
        pos: basePos + 13,
        rect: {
          top: secondaryTop,
          bottom: secondaryTop + secondaryHeight,
          left: columnOffsets.center.left,
          right: columnOffsets.center.right
        }
      }
    },
    right: {
      primary: {
        pos: basePos + 4,
        rect: {
          top: primaryTop,
          bottom: primaryTop + primaryHeight,
          left: columnOffsets.right.left,
          right: columnOffsets.right.right
        }
      },
      secondary: {
        pos: basePos + 14,
        rect: {
          top: secondaryTop,
          bottom: secondaryTop + secondaryHeight,
          left: columnOffsets.right.left,
          right: columnOffsets.right.right
        }
      }
    }
  }
}

function scoreCoords(rect: Rect, left: number, top: number) {
  const centerX = (rect.left + rect.right) / 2
  const centerY = (rect.top + rect.bottom) / 2

  return Math.abs(centerY - top) * 1000 + Math.abs(centerX - left)
}

function resolvePositionFromRects(positions: PositionedRect[], left: number, top: number) {
  return positions.reduce(
    (best, candidate) => {
      const score = scoreCoords(candidate.rect, left, top)
      if (!best || score < best.score) {
        return { pos: candidate.pos, score }
      }
      return best
    },
    null as { pos: number; score: number } | null
  )?.pos
}

function buildOverflowView(params: {
  layout: LayoutVariant
  column: ColumnVariant
  shape: ShapeVariant
  direction: Direction
}) {
  const { layout, column, shape, direction } = params
  const editorDom = document.createElement('div')
  const layoutSpec = layoutRects[layout]
  const firstBand = createBodyBand(1, layoutSpec.first)
  const secondBand = createBodyBand(2, layoutSpec.second)
  editorDom.append(firstBand, secondBand)
  document.body.appendChild(editorDom)

  const firstPagePositions = buildTargetPositions(100, layoutSpec.first, shape, 'backward')
  const secondPagePositions = buildTargetPositions(200, layoutSpec.second, shape, 'forward')

  const positionedRects = [
    ...Object.values(firstPagePositions).flatMap(positions => [positions.primary, positions.secondary]),
    ...Object.values(secondPagePositions).flatMap(positions => [positions.primary, positions.secondary])
  ]

  const gapTop =
    direction === 'forward'
      ? layoutSpec.first.bottom + 18
      : Math.max(layoutSpec.first.bottom + 8, layoutSpec.second.top - 42)
  const gapBottom =
    direction === 'forward'
      ? Math.min(layoutSpec.first.bottom + 36, layoutSpec.second.top - 8)
      : layoutSpec.second.top - 18
  const selectionHead = direction === 'forward' ? 10 : 20
  const overflowRect: Rect = {
    top: gapTop,
    bottom: gapBottom,
    left: columnCenters[column] - 1,
    right: columnCenters[column] + 1
  }

  const expectedPosition =
    direction === 'forward' ? secondPagePositions[column].primary.pos : firstPagePositions[column].primary.pos

  const view = {
    dom: editorDom,
    state: {
      selection: {
        empty: true,
        head: selectionHead
      }
    },
    coordsAtPos: (position: number) => {
      if (position === selectionHead) {
        return overflowRect
      }

      const rect = positionedRects.find(candidate => candidate.pos === position)?.rect
      if (!rect) {
        return overflowRect
      }

      return rect
    },
    posAtCoords: ({ left, top }: { left: number; top: number }) => {
      const position = resolvePositionFromRects(positionedRects, left, top)
      return position == null ? null : { pos: position }
    }
  } as never

  return { editorDom, expectedPosition, view }
}

const overflowCases = (Object.keys(layoutRects) as LayoutVariant[]).flatMap(layout =>
  (Object.keys(columnCenters) as ColumnVariant[]).flatMap(column =>
    (Object.keys(shapeLineHeights) as ShapeVariant[]).flatMap(shape =>
      (['forward', 'backward'] as Direction[]).map(direction => ({
        name: `${direction} from ${layout} using ${shape} at ${column}`,
        layout,
        column,
        shape,
        direction
      }))
    )
  )
)

describe('resolvePaginationSelectionBodyOverflow matrix', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it.each(overflowCases)('routes %s', scenario => {
    const { view, expectedPosition } = buildOverflowView(scenario)

    expect(resolvePaginationSelectionBodyOverflow(view, scenario.direction)).toEqual({
      position: expectedPosition
    })
  })
})
