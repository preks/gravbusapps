import { resolveCollaborationOverlayCellRect, resolveGridCanvasViewport } from '../univerGridOverlayCellRect'

function mockRect(element: Element, rect: Partial<DOMRect>): void {
  jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: rect.left ?? 0,
    y: rect.top ?? 0,
    top: rect.top ?? 0,
    left: rect.left ?? 0,
    right: rect.right ?? (rect.left ?? 0) + (rect.width ?? 0),
    bottom: rect.bottom ?? (rect.top ?? 0) + (rect.height ?? 0),
    width: rect.width ?? 0,
    height: rect.height ?? 0,
    toJSON: () => ({})
  } as DOMRect)
}

describe('univerGridOverlayCellRect', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('resolves the grid viewport from the largest canvas relative to the container', () => {
    const container = document.createElement('div')
    const smallCanvas = document.createElement('canvas')
    const largeCanvas = document.createElement('canvas')

    container.appendChild(smallCanvas)
    container.appendChild(largeCanvas)

    mockRect(container, { top: 100, left: 40, width: 800, height: 600 })
    mockRect(smallCanvas, { top: 120, left: 60, width: 140, height: 80 })
    mockRect(largeCanvas, { top: 180, left: 88, width: 620, height: 360 })

    const viewport = resolveGridCanvasViewport(container, {
      defaultColWidth: 73,
      defaultRowHeight: 23,
      columnData: {},
      rowData: {},
      rowHeaderWidth: 48,
      columnHeaderHeight: 28,
      zoomRatio: 1
    })

    expect(viewport).toEqual({
      top: 108,
      left: 96,
      width: 572,
      height: 332
    })
  })

  it('resolves cell rects relative to the selected grid canvas', () => {
    const container = document.createElement('div')
    const canvas = document.createElement('canvas')
    container.appendChild(canvas)

    mockRect(container, { top: 100, left: 20, width: 900, height: 700 })
    mockRect(canvas, { top: 180, left: 60, width: 700, height: 400 })

    const rect = resolveCollaborationOverlayCellRect({
      api: {
        getActiveWorkbook: () => ({
          getActiveSheet: () => ({
            getSheetId: () => 'sheet-1',
            getScrollState: () => ({
              sheetViewStartRow: 0,
              sheetViewStartColumn: 0,
              offsetX: 0,
              offsetY: 0
            })
          })
        })
      },
      container,
      props: { sheet: { id: 'sheet-1' } },
      cellDimensions: {
        defaultColWidth: 73,
        defaultRowHeight: 23,
        columnData: {},
        rowData: {},
        rowHeaderWidth: 48,
        columnHeaderHeight: 28,
        zoomRatio: 1
      },
      sheetScroll: { scrollLeft: 0, scrollTop: 0 },
      row: 2,
      col: 1
    })

    expect(rect).toEqual({
      top: 154,
      left: 161,
      width: 73,
      height: 23
    })
  })
})
