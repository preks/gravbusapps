import { Schema } from '@tiptap/pm/model'
import { applyForcedPageBoundaryFloor, collectForcedPageBoundarySummary } from '../paginationForcedBoundaries'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
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
    table: {
      group: 'block',
      content: 'paragraph+',
      toDOM: () => ['table', 0]
    },
    text: { group: 'inline' }
  },
  marks: {}
})

function makeParagraph(text = ''): ReturnType<typeof schema.node> {
  return text.length > 0 ? schema.node('paragraph', null, [schema.text(text)]) : schema.node('paragraph', null, [])
}

function makePageBreak() {
  return schema.node('pageBreak')
}

function makeTable(text: string) {
  return schema.node('table', null, [makeParagraph(text)])
}

function buildDoc(children: Array<ReturnType<typeof schema.node>>) {
  return schema.node('doc', null, children)
}

describe('collectForcedPageBoundarySummary', () => {
  it('returns the minimum of 1 page for an empty doc', () => {
    const doc = buildDoc([makeParagraph('')])
    const summary = collectForcedPageBoundarySummary(doc)

    expect(summary.breaks).toHaveLength(0)
    expect(summary.forcedBoundaryCount).toBe(0)
    expect(summary.minimumPageCount).toBe(1)
  })

  it('reports a single forced boundary for one manual page break', () => {
    const doc = buildDoc([makeParagraph('first'), makePageBreak(), makeParagraph('second')])
    const summary = collectForcedPageBoundarySummary(doc)

    expect(summary.breaks).toHaveLength(1)
    expect(summary.breaks[0]?.followedByAnotherBreak).toBe(false)
    expect(summary.forcedBoundaryCount).toBe(1)
    expect(summary.minimumPageCount).toBe(2)
  })

  it('produces a blank page between content for two adjacent page breaks', () => {
    const doc = buildDoc([makeParagraph('before'), makePageBreak(), makePageBreak(), makeParagraph('after')])
    const summary = collectForcedPageBoundarySummary(doc)

    expect(summary.breaks).toHaveLength(2)
    expect(summary.breaks[0]?.followedByAnotherBreak).toBe(true)
    expect(summary.breaks[1]?.followedByAnotherBreak).toBe(false)
    // Two breaks -> 3 pages total: [before][blank][after]
    expect(summary.forcedBoundaryCount).toBe(2)
    expect(summary.minimumPageCount).toBe(3)
  })

  it('still counts two breaks when they are separated only by empty paragraphs', () => {
    const doc = buildDoc([
      makeParagraph('before'),
      makePageBreak(),
      makeParagraph(''),
      makePageBreak(),
      makeParagraph('after')
    ])
    const summary = collectForcedPageBoundarySummary(doc)

    expect(summary.breaks[0]?.followedByAnotherBreak).toBe(true)
    expect(summary.breaks[1]?.followedByAnotherBreak).toBe(false)
    expect(summary.forcedBoundaryCount).toBe(2)
    expect(summary.minimumPageCount).toBe(3)
  })

  it('counts multiple independent breaks', () => {
    const doc = buildDoc([
      makeParagraph('p1'),
      makePageBreak(),
      makeParagraph('p2'),
      makePageBreak(),
      makeParagraph('p3'),
      makePageBreak(),
      makeParagraph('p4')
    ])
    const summary = collectForcedPageBoundarySummary(doc)

    expect(summary.forcedBoundaryCount).toBe(3)
    expect(summary.minimumPageCount).toBe(4)
  })

  it('is stable across documents that include block-level tables between breaks', () => {
    const doc = buildDoc([
      makeParagraph('intro'),
      makeTable('cell 1'),
      makePageBreak(),
      makeTable('cell 2'),
      makeParagraph('outro')
    ])
    const summary = collectForcedPageBoundarySummary(doc)

    expect(summary.forcedBoundaryCount).toBe(1)
    expect(summary.minimumPageCount).toBe(2)
  })
})

describe('applyForcedPageBoundaryFloor', () => {
  it('passes through candidate counts that already meet the floor', () => {
    const doc = buildDoc([makeParagraph('only')])
    const summary = collectForcedPageBoundarySummary(doc)

    expect(applyForcedPageBoundaryFloor(5, summary)).toBe(5)
  })

  it('raises candidate counts below the floor', () => {
    const doc = buildDoc([
      makeParagraph('p1'),
      makePageBreak(),
      makeParagraph('p2'),
      makePageBreak(),
      makeParagraph('p3')
    ])
    const summary = collectForcedPageBoundarySummary(doc)

    // 2 breaks -> minimum 3 pages
    expect(summary.minimumPageCount).toBe(3)
    expect(applyForcedPageBoundaryFloor(1, summary)).toBe(3)
  })

  it('falls back to the floor when candidate is not finite', () => {
    const doc = buildDoc([makeParagraph('p1'), makePageBreak(), makeParagraph('p2')])
    const summary = collectForcedPageBoundarySummary(doc)

    expect(applyForcedPageBoundaryFloor(Number.NaN, summary)).toBe(2)
    expect(applyForcedPageBoundaryFloor(Number.POSITIVE_INFINITY, summary)).toBe(2)
  })
})
