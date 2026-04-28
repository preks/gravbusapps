import { Schema } from '@tiptap/pm/model'
import type { Decoration } from '@tiptap/pm/view'
import { AddMarkStep, AttrStep, ReplaceAroundStep, ReplaceStep } from '@tiptap/pm/transform'
import {
  buildPageBreakSpacerDecorations,
  collectPageBreakEntries,
  createPageBreakSpacerElement,
  isFollowedByAnotherPageBreak,
  PAGE_BREAK_SPACER_CLASS,
  resolvePageBreakAnchorInEditor,
  shouldRebuildPageBreakSpacerDecorations
} from '../paginationPageBreakDecorationController'
import type { PageBodyMeasurementBand } from '../utils'

function resolveDecorationKey(decoration: Decoration): string | null {
  const key = (decoration.spec as { key?: unknown }).key
  return typeof key === 'string' ? key : null
}

function parseSpacerHeightsFromKeys(decorations: readonly Decoration[]): number[] {
  return decorations
    .map(decoration => resolveDecorationKey(decoration))
    .map(key => (key ? Number(key.split(':')[2] ?? '') : Number.NaN))
    .filter((height): height is number => Number.isFinite(height))
}

const schema = new Schema({
  nodes: {
    doc: {
      content: 'block+'
    },
    paragraph: {
      group: 'block',
      content: 'inline*',
      toDOM: () => ['p', 0]
    },
    pageBreak: {
      group: 'block',
      atom: true,
      selectable: false,
      toDOM: () => ['div', { 'data-page-break': '' }]
    },
    text: {
      group: 'inline'
    }
  },
  marks: {}
})

function makeParagraph(text = ''): ReturnType<typeof schema.node> {
  return text.length > 0 ? schema.node('paragraph', null, [schema.text(text)]) : schema.node('paragraph', null, [])
}

function makePageBreak() {
  return schema.node('pageBreak')
}

function buildDoc(children: Array<ReturnType<typeof schema.node>>) {
  return schema.node('doc', null, children)
}

function bandFor(pageNumber: number, top: number, bottom: number): PageBodyMeasurementBand {
  return {
    pageNumber,
    left: 0,
    right: 500,
    top,
    bottom,
    pageLeft: 0,
    pageRight: 500
  }
}

describe('createPageBreakSpacerElement', () => {
  it('renders a non-interactive block span with the expected height', () => {
    const element = createPageBreakSpacerElement(120)

    expect(element.tagName).toBe('SPAN')
    expect(element.classList.contains(PAGE_BREAK_SPACER_CLASS)).toBe(true)
    expect(element.style.display).toBe('block')
    expect(element.style.height).toBe('120px')
    expect(element.style.pointerEvents).toBe('none')
    expect(element.getAttribute('aria-hidden')).toBe('true')
    expect(element.getAttribute('contenteditable')).toBe('false')
    expect(element.dataset.rmPageBreakSpacer).toBe('true')
  })
})

describe('shouldRebuildPageBreakSpacerDecorations', () => {
  it('returns false when the document did not change', () => {
    expect(
      shouldRebuildPageBreakSpacerDecorations({
        docChanged: false,
        steps: []
      })
    ).toBe(false)
  })

  it('returns true when the document changed without explicit steps', () => {
    expect(
      shouldRebuildPageBreakSpacerDecorations({
        docChanged: true,
        steps: []
      })
    ).toBe(true)
  })

  it.each([
    ['replace', Object.create(ReplaceStep.prototype)],
    ['replace-around', Object.create(ReplaceAroundStep.prototype)]
  ])('returns true for structural %s steps', (_label, step) => {
    expect(
      shouldRebuildPageBreakSpacerDecorations({
        docChanged: true,
        steps: [step]
      })
    ).toBe(true)
  })

  it.each([
    ['add-mark', Object.create(AddMarkStep.prototype)],
    ['attr', Object.create(AttrStep.prototype)]
  ])('returns false for non-structural %s steps', (_label, step) => {
    expect(
      shouldRebuildPageBreakSpacerDecorations({
        docChanged: true,
        steps: [step]
      })
    ).toBe(false)
  })
})

describe('collectPageBreakEntries', () => {
  it('collects every top-level pageBreak node with its parent index', () => {
    const doc = buildDoc([makeParagraph('first'), makePageBreak(), makeParagraph('second'), makePageBreak()])

    const entries = collectPageBreakEntries(doc)

    expect(entries).toHaveLength(2)
    expect(entries[0]?.indexInParent).toBe(1)
    expect(entries[1]?.indexInParent).toBe(3)
  })

  it('returns an empty list when no pageBreaks exist', () => {
    const doc = buildDoc([makeParagraph('only text')])
    expect(collectPageBreakEntries(doc)).toHaveLength(0)
  })
})

describe('isFollowedByAnotherPageBreak', () => {
  it('treats a directly adjacent pageBreak as consecutive', () => {
    const doc = buildDoc([makePageBreak(), makePageBreak(), makeParagraph('tail')])
    const [first, second] = collectPageBreakEntries(doc)

    expect(first && isFollowedByAnotherPageBreak(first)).toBe(true)
    expect(second && isFollowedByAnotherPageBreak(second)).toBe(false)
  })

  it('ignores empty paragraphs between consecutive pageBreaks', () => {
    const doc = buildDoc([makePageBreak(), makeParagraph(''), makePageBreak(), makeParagraph('tail')])
    const [first, second] = collectPageBreakEntries(doc)

    expect(first && isFollowedByAnotherPageBreak(first)).toBe(true)
    expect(second && isFollowedByAnotherPageBreak(second)).toBe(false)
  })

  it('stops collapsing once meaningful content appears between the breaks', () => {
    const doc = buildDoc([makePageBreak(), makeParagraph('content'), makePageBreak()])
    const [first, second] = collectPageBreakEntries(doc)

    expect(first && isFollowedByAnotherPageBreak(first)).toBe(false)
    expect(second && isFollowedByAnotherPageBreak(second)).toBe(false)
  })
})

describe('buildPageBreakSpacerDecorations', () => {
  it('returns an empty decoration set when the doc has no page breaks', () => {
    const doc = buildDoc([makeParagraph('plain')])
    const decorations = buildPageBreakSpacerDecorations(doc, {
      view: null,
      bandsOverride: [bandFor(1, 0, 800)],
      resolveNodeBottomOverride: () => null
    })

    expect(decorations.find()).toHaveLength(0)
  })

  it('returns an empty decoration set when there are no measured bands', () => {
    const doc = buildDoc([makeParagraph('before'), makePageBreak()])
    const decorations = buildPageBreakSpacerDecorations(doc, {
      view: null,
      bandsOverride: [],
      resolveNodeBottomOverride: () => 200
    })

    expect(decorations.find()).toHaveLength(0)
  })

  it('creates a spacer whose height equals the remaining body space on the current page', () => {
    const doc = buildDoc([makeParagraph('before'), makePageBreak(), makeParagraph('after')])
    const decorations = buildPageBreakSpacerDecorations(doc, {
      view: null,
      bandsOverride: [bandFor(1, 0, 800), bandFor(2, 900, 1700)],
      resolveNodeBottomOverride: () => 200
    })

    const found = decorations.find()
    expect(found).toHaveLength(1)
    expect(parseSpacerHeightsFromKeys(found)).toEqual([600])
  })

  it('fills the whole first-page body when the page break is the very first node', () => {
    const doc = buildDoc([makePageBreak(), makeParagraph('after')])
    const decorations = buildPageBreakSpacerDecorations(doc, {
      view: null,
      bandsOverride: [bandFor(1, 0, 800)],
      resolveNodeBottomOverride: () => 20
    })

    expect(parseSpacerHeightsFromKeys(decorations.find())).toEqual([780])
  })

  it('omits the spacer when the break is already at the bottom of the body', () => {
    const doc = buildDoc([makeParagraph('before'), makePageBreak()])
    const decorations = buildPageBreakSpacerDecorations(doc, {
      view: null,
      bandsOverride: [bandFor(1, 0, 800)],
      resolveNodeBottomOverride: () => 800
    })

    expect(decorations.find()).toHaveLength(0)
  })

  it('emits a spacer per break using measured page targeting', () => {
    const doc = buildDoc([
      makeParagraph('p1'),
      makePageBreak(),
      makeParagraph('p2'),
      makePageBreak(),
      makeParagraph('p3')
    ])
    const entries = collectPageBreakEntries(doc)
    const bottomByPos: Record<number, number> = {
      [entries[0]!.pos]: 400,
      [entries[1]!.pos]: 1200
    }

    const decorations = buildPageBreakSpacerDecorations(doc, {
      view: null,
      bandsOverride: [bandFor(1, 0, 800), bandFor(2, 900, 1700)],
      resolveNodeBottomOverride: entry => bottomByPos[entry.pos] ?? null
    })

    const found = decorations.find()
    expect(found).toHaveLength(2)
    expect(parseSpacerHeightsFromKeys(found)).toEqual([400, 100])
  })

  it('emits two spacers for consecutive page breaks so content lands after a blank page', () => {
    const doc = buildDoc([makeParagraph('before'), makePageBreak(), makePageBreak(), makeParagraph('after')])
    const entries = collectPageBreakEntries(doc)
    const bottomByPos: Record<number, number> = {
      [entries[0]!.pos]: 200,
      [entries[1]!.pos]: 210
    }

    const decorations = buildPageBreakSpacerDecorations(doc, {
      view: null,
      bandsOverride: [bandFor(1, 0, 800), bandFor(2, 900, 1700)],
      resolveNodeBottomOverride: entry => bottomByPos[entry.pos] ?? null
    })

    const found = decorations.find()
    expect(found).toHaveLength(2)
    // First spacer fills page 1 remaining; the second break is measured after
    // that planned spacer, so it fills the next page instead of reusing page 1.
    expect(parseSpacerHeightsFromKeys(found)).toEqual([600, 890])
  })

  it('targets later breaks after the spacer height planned for earlier breaks', () => {
    // Simulate initial render where breaks are clustered near the top before
    // any spacers have been applied. Each later break should be measured from
    // where it will land after the earlier spacer widgets are inserted.
    const doc = buildDoc([
      makeParagraph('p1'),
      makePageBreak(),
      makeParagraph('p2'),
      makePageBreak(),
      makeParagraph('p3'),
      makePageBreak(),
      makeParagraph('p4')
    ])
    const entries = collectPageBreakEntries(doc)
    const bottomByPos: Record<number, number> = {
      [entries[0]!.pos]: 100,
      [entries[1]!.pos]: 200,
      [entries[2]!.pos]: 300
    }

    const decorations = buildPageBreakSpacerDecorations(doc, {
      view: null,
      bandsOverride: [bandFor(1, 0, 800), bandFor(2, 900, 1700), bandFor(3, 1800, 2600)],
      resolveNodeBottomOverride: entry => bottomByPos[entry.pos] ?? null
    })

    const found = decorations.find()
    expect(found).toHaveLength(3)
    expect(parseSpacerHeightsFromKeys(found)).toEqual([700, 800, 800])
  })

  it('uses the measured current page when content before the break already spans pages', () => {
    // The first manual break can be physically on a later page when preceding
    // content is long. It should fill that measured page, not the first page.
    const doc = buildDoc([makeParagraph('tall'), makePageBreak(), makeParagraph('after')])
    const entries = collectPageBreakEntries(doc)

    const decorations = buildPageBreakSpacerDecorations(doc, {
      view: null,
      bandsOverride: [bandFor(1, 0, 800), bandFor(2, 900, 1700)],
      resolveNodeBottomOverride: entry => (entry.pos === entries[0]!.pos ? 850 : null)
    })

    const found = decorations.find()
    expect(found).toHaveLength(1)
    // 1700 (page 2 bottom) - 850 = 850
    expect(parseSpacerHeightsFromKeys(found)).toEqual([850])
  })

  it('keeps sequential breaks correct when both start after several pages of content', () => {
    const doc = buildDoc([makeParagraph('tall'), makePageBreak(), makePageBreak(), makeParagraph('after')])
    const entries = collectPageBreakEntries(doc)
    const bottomByPos: Record<number, number> = {
      [entries[0]!.pos]: 1900,
      [entries[1]!.pos]: 1910
    }

    const decorations = buildPageBreakSpacerDecorations(doc, {
      view: null,
      bandsOverride: [bandFor(1, 0, 800), bandFor(2, 900, 1700), bandFor(3, 1800, 2600), bandFor(4, 2700, 3500)],
      resolveNodeBottomOverride: entry => bottomByPos[entry.pos] ?? null
    })

    const found = decorations.find()
    expect(found).toHaveLength(2)
    expect(parseSpacerHeightsFromKeys(found)).toEqual([700, 890])
  })

  it('skips a spacer when no band is available for the break (e.g. outside the windowed range)', () => {
    const doc = buildDoc([makeParagraph('p1'), makePageBreak(), makeParagraph('p2')])

    const decorations = buildPageBreakSpacerDecorations(doc, {
      view: null,
      // Only page 5 is mounted; break[0] targets page 1 and has no fallback
      // band beyond its current (tiny) position.
      bandsOverride: [bandFor(5, 4000, 4800)],
      resolveNodeBottomOverride: () => 100
    })

    // Drift correction falls forward to the first band whose bottom > 100
    // (page 5's band), which is valid - spacer is 4700.
    const found = decorations.find()
    expect(found).toHaveLength(1)
    expect(parseSpacerHeightsFromKeys(found)).toEqual([4700])
  })
})

describe('resolvePageBreakAnchorInEditor', () => {
  function setRect(
    element: HTMLElement,
    rect: { top: number; bottom: number; left?: number; right?: number; width?: number; height?: number }
  ) {
    Object.defineProperty(element, 'getBoundingClientRect', {
      value: () =>
        ({
          x: rect.left ?? 0,
          y: rect.top,
          left: rect.left ?? 0,
          top: rect.top,
          right: rect.right ?? rect.left ?? 0,
          bottom: rect.bottom,
          width: rect.width ?? Math.max(0, (rect.right ?? 0) - (rect.left ?? 0)),
          height: rect.height ?? Math.max(0, rect.bottom - rect.top),
          toJSON: () => ({})
        }) as DOMRect
    })
  }

  it('anchors to the page-break DOM top when the node is rendered in place', () => {
    const doc = buildDoc([makeParagraph('before'), makePageBreak(), makeParagraph('after')])
    const entry = collectPageBreakEntries(doc)[0]
    const editorDom = document.createElement('div')
    const pageBreakDom = document.createElement('div')
    setRect(editorDom, { top: 100, bottom: 900, left: 0, right: 600, width: 600, height: 800 })
    setRect(pageBreakDom, { top: 520, bottom: 540, left: 0, right: 400, width: 400, height: 20 })

    const view = {
      dom: editorDom,
      nodeDOM: () => pageBreakDom,
      coordsAtPos: jest.fn((position: number) => (position === entry?.pos ? { bottom: 530 } : { bottom: 540 }))
    } as unknown as import('@tiptap/pm/view').EditorView

    expect(resolvePageBreakAnchorInEditor(view, entry!)).toBe(420)
  })

  it('prefers the earlier pre-break coordinate when the page-break block drifts onto the next page', () => {
    const doc = buildDoc([makeParagraph('before'), makePageBreak(), makeParagraph('after')])
    const entry = collectPageBreakEntries(doc)[0]
    const editorDom = document.createElement('div')
    const collapsedPageBreakDom = document.createElement('div')
    setRect(editorDom, { top: 0, bottom: 1600, left: 0, right: 600, width: 600, height: 1600 })
    setRect(collapsedPageBreakDom, { top: 900, bottom: 900, left: 0, right: 0, width: 0, height: 0 })

    const view = {
      dom: editorDom,
      nodeDOM: () => collapsedPageBreakDom,
      coordsAtPos: jest.fn((position: number) => (position === entry?.pos ? { bottom: 800 } : { bottom: 920 }))
    } as unknown as import('@tiptap/pm/view').EditorView

    expect(resolvePageBreakAnchorInEditor(view, entry!)).toBe(800)
  })
})
