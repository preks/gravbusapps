import type { Editor } from '@tiptap/core'
import {
  computeInitialImageDisplayDimensions,
  measureLocalContentWidthPx,
  resolveEffectiveAvailableWidthPx,
  resolvePageBodyContentWidthPx
} from './initialInsertedImageLayout'
import type { PageLayoutPaginationConfig } from './pageLayoutUtils'

function makePagination(width: number, ml: number, mr: number): PageLayoutPaginationConfig {
  return {
    pageFormat: {
      name: 'Test',
      width,
      height: 1000,
      margins: { top: 0, right: mr, bottom: 0, left: ml }
    },
    pageWidth: width,
    pageHeight: 1000,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: ml,
    marginRight: mr
  }
}

describe('initialInsertedImageLayout', () => {
  it('resolvePageBodyContentWidthPx subtracts horizontal margins', () => {
    const cfg = makePagination(800, 50, 50)
    expect(resolvePageBodyContentWidthPx(cfg)).toBe(700)
  })

  it('computeInitialImageDisplayDimensions uses DPI then clamps to available width', () => {
    const { width, height } = computeInitialImageDisplayDimensions({
      naturalWidthPx: 2400,
      naturalHeightPx: 1600,
      dpiX: 300,
      dpiY: 300,
      availableWidthPx: 400
    })
    expect(width).toBe(400)
    const unclampedH = (1600 * 96) / 300
    const unclampedW = (2400 * 96) / 300
    expect(height).toBe(Math.max(1, Math.round((unclampedH * 400) / unclampedW)))
  })

  it('computeInitialImageDisplayDimensions does not upscale when under available width', () => {
    const { width, height } = computeInitialImageDisplayDimensions({
      naturalWidthPx: 200,
      naturalHeightPx: 100,
      dpiX: null,
      dpiY: null,
      availableWidthPx: 400
    })
    expect(width).toBe(200)
    expect(height).toBe(100)
  })

  it('resolveEffectiveAvailableWidthPx uses the smaller of page body and local measurement', () => {
    const paragraph = document.createElement('p')
    paragraph.style.width = '300px'
    Object.defineProperty(paragraph, 'clientWidth', { configurable: true, value: 300 })

    const dom = document.createElement('div')
    dom.appendChild(paragraph)
    document.body.appendChild(dom)

    const text = document.createTextNode('hello')
    paragraph.appendChild(text)

    const editor = {
      view: {
        dom,
        domAtPos: () => ({ node: text, offset: 0 })
      }
    } as unknown as Editor

    const pageBody = resolvePageBodyContentWidthPx(makePagination(800, 50, 50))
    const local = measureLocalContentWidthPx(editor, 1)
    expect(local).toBe(300)

    const eff = resolveEffectiveAvailableWidthPx({
      paginationConfig: makePagination(800, 50, 50),
      editor,
      insertPos: 1
    })
    expect(eff).toBe(300)
    expect(eff).toBeLessThan(pageBody)

    dom.remove()
  })
})
