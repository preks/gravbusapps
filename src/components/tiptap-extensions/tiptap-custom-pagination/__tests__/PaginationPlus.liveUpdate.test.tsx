import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TextSelection } from '@tiptap/pm/state'
import { Pages } from '../PaginationPlus'

interface Rect {
  top: number
  bottom: number
  left: number
  right: number
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

function appendBodyBand(root: HTMLElement, pageNumber: number, rect: Rect) {
  const element = document.createElement('div')
  element.className = 'rm-page-body-layer'
  element.dataset.rmPageNumber = String(pageNumber)
  setRect(element, rect)
  root.appendChild(element)
  return element
}

function mockPaginationDom(root: HTMLElement, bodyBands: HTMLElement[], pageCount = bodyBands.length) {
  const paginationRoot = document.createElement('div')
  paginationRoot.dataset.rmPagination = 'true'
  paginationRoot.dataset.rmTotalPages = String(pageCount)
  paginationRoot.dataset.rmMountedStartPage = '1'
  paginationRoot.dataset.rmMountedEndPage = String(pageCount)

  for (let index = 0; index < pageCount; index += 1) {
    const pageBreak = document.createElement('div')
    pageBreak.className = 'rm-page-break'
    pageBreak.dataset.rmPageNumber = String(index + 1)
    paginationRoot.appendChild(pageBreak)
  }

  root.querySelectorAll('[data-rm-pagination], [data-rm-pagination-chrome], .rm-first-page-header').forEach(element => {
    element.remove()
  })
  root.appendChild(paginationRoot)
}

function createEditor() {
  const element = document.createElement('div')
  document.body.appendChild(element)

  return new Editor({
    element,
    extensions: [
      StarterKit,
      Pages.configure({
        pageFormat: 'A4',
        header: '',
        footer: '',
        pageGap: 50,
        differentFirstPage: false,
        differentOddEven: false,
        headerHeight: 50,
        footerHeight: 50
      })
    ],
    content: '<p>alpha</p><p>beta</p><p>gamma</p>'
  })
}

describe('Pages live update routing', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('moves the live selection to the first line of page 2 on forward overflow', () => {
    const editor = createEditor()
    const firstBandRect = { top: 100, bottom: 300, left: 20, right: 180 }
    const secondBandRect = { top: 380, bottom: 580, left: 20, right: 180 }
    const firstBand = appendBodyBand(editor.view.dom, 1, firstBandRect)
    const secondBand = appendBodyBand(editor.view.dom, 2, secondBandRect)
    mockPaginationDom(editor.view.dom, [firstBand, secondBand])

    const currentRects: Record<number, Rect> = {
      2: { top: 140, bottom: 158, left: 70, right: 70 },
      6: { top: 330, bottom: 348, left: 70, right: 70 },
      8: { top: 384, bottom: 402, left: 70, right: 70 },
      9: { top: 414, bottom: 432, left: 70, right: 70 }
    }

    Object.defineProperty(editor.view, 'coordsAtPos', {
      configurable: true,
      value: (position: number) =>
        currentRects[position] ?? {
          top: 140,
          bottom: 158,
          left: 70,
          right: 70
        }
    })

    Object.defineProperty(editor.view, 'posAtCoords', {
      configurable: true,
      value: ({ top }: { top: number }) => {
        if (top < 408) return { pos: 8 }
        return { pos: 9 }
      }
    })

    editor.view.dispatch(editor.view.state.tr.setSelection(TextSelection.create(editor.state.doc, 2)))
    editor.view.dispatch(editor.view.state.tr.setSelection(TextSelection.create(editor.state.doc, 6)))

    expect(editor.view.state.selection.head).toBe(8)

    editor.destroy()
  })

  it('does not snap forward overflow back into page 1 while the next page body is still missing', () => {
    const editor = createEditor()
    const firstBandRect = { top: 100, bottom: 300, left: 20, right: 180 }
    const firstBand = appendBodyBand(editor.view.dom, 1, firstBandRect)
    mockPaginationDom(editor.view.dom, [firstBand], 2)

    const currentRects: Record<number, Rect> = {
      2: { top: 140, bottom: 158, left: 70, right: 70 },
      6: { top: 330, bottom: 348, left: 70, right: 70 },
      4: { top: 280, bottom: 298, left: 70, right: 70 }
    }

    Object.defineProperty(editor.view, 'coordsAtPos', {
      configurable: true,
      value: (position: number) =>
        currentRects[position] ?? {
          top: 140,
          bottom: 158,
          left: 70,
          right: 70
        }
    })

    Object.defineProperty(editor.view, 'posAtCoords', {
      configurable: true,
      value: () => ({ pos: 4 })
    })

    editor.view.dispatch(editor.view.state.tr.setSelection(TextSelection.create(editor.state.doc, 2)))
    editor.view.dispatch(editor.view.state.tr.setSelection(TextSelection.create(editor.state.doc, 6)))

    expect(editor.view.state.selection.head).toBe(6)

    editor.destroy()
  })

  it('moves the live selection to the last line of page 1 on backward overflow', () => {
    const editor = createEditor()
    const firstBandRect = { top: 100, bottom: 300, left: 20, right: 180 }
    const secondBandRect = { top: 380, bottom: 580, left: 20, right: 180 }
    const firstBand = appendBodyBand(editor.view.dom, 1, firstBandRect)
    const secondBand = appendBodyBand(editor.view.dom, 2, secondBandRect)
    mockPaginationDom(editor.view.dom, [firstBand, secondBand])

    const currentRects: Record<number, Rect> = {
      8: { top: 430, bottom: 448, left: 70, right: 70 },
      6: { top: 330, bottom: 348, left: 70, right: 70 },
      4: { top: 280, bottom: 298, left: 70, right: 70 },
      3: { top: 250, bottom: 268, left: 70, right: 70 }
    }

    Object.defineProperty(editor.view, 'coordsAtPos', {
      configurable: true,
      value: (position: number) =>
        currentRects[position] ?? {
          top: 430,
          bottom: 448,
          left: 70,
          right: 70
        }
    })

    Object.defineProperty(editor.view, 'posAtCoords', {
      configurable: true,
      value: ({ top }: { top: number }) => {
        if (top > 274) return { pos: 4 }
        return { pos: 3 }
      }
    })

    editor.view.dispatch(editor.view.state.tr.setSelection(TextSelection.create(editor.state.doc, 8)))
    editor.view.dispatch(editor.view.state.tr.setSelection(TextSelection.create(editor.state.doc, 6)))

    expect(editor.view.state.selection.head).toBe(4)

    editor.destroy()
  })
})
