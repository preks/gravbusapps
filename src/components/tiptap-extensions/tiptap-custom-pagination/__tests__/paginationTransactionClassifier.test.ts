import { Schema } from '@tiptap/pm/model'
import { EditorState } from '@tiptap/pm/state'
import { classifyPaginationTransaction } from '../paginationTransactionClassifier'

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
    section: {
      group: 'block',
      content: 'block+',
      toDOM: () => ['section', 0]
    },
    pageBreak: {
      group: 'block',
      atom: true,
      toDOM: () => ['div', { 'data-page-break': '' }]
    },
    table: {
      group: 'block',
      content: 'tableRow+',
      toDOM: () => ['table', ['tbody', 0]]
    },
    tableRow: {
      content: 'tableCell+',
      toDOM: () => ['tr', 0]
    },
    tableCell: {
      content: 'paragraph+',
      toDOM: () => ['td', 0]
    },
    text: {
      group: 'inline'
    }
  },
  marks: {
    strong: {
      toDOM: () => ['strong', 0]
    }
  }
})

function createState(doc: Parameters<typeof EditorState.create>[0]['doc']) {
  return EditorState.create({
    schema,
    doc
  })
}

function createTableNode(cellText: string) {
  return schema.node('table', null, [
    schema.node('tableRow', null, [
      schema.node('tableCell', null, [schema.node('paragraph', null, [schema.text(cellText)])])
    ])
  ])
}

function createWrappedTableNode(cellText: string) {
  return schema.node('section', null, [createTableNode(cellText)])
}

function createWrappedParagraphNode(text: string) {
  return schema.node('section', null, [schema.node('paragraph', null, [schema.text(text)])])
}

describe('classifyPaginationTransaction', () => {
  it('classifies plain paragraph typing as a local text change', () => {
    const previousState = createState(
      schema.node('doc', null, [schema.node('paragraph', null, [schema.text('hello')])])
    )
    const transaction = previousState.tr.insertText('!', 6)
    const classification = classifyPaginationTransaction({
      transaction,
      previousDoc: previousState.doc,
      nextDoc: transaction.doc
    })

    expect(classification.kind).toBe('local-text')
    expect(classification.touchesTableRegion).toBe(false)
    expect(classification.shouldScheduleSettledRefresh).toBe(false)
  })

  it('treats mark-only changes as layout-neutral when no tables are nearby', () => {
    const previousState = createState(
      schema.node('doc', null, [schema.node('paragraph', null, [schema.text('hello')])])
    )
    const transaction = previousState.tr.addMark(1, 3, schema.mark('strong'))
    const classification = classifyPaginationTransaction({
      transaction,
      previousDoc: previousState.doc,
      nextDoc: transaction.doc
    })

    expect(classification.kind).toBe('mark')
    expect(classification.isLayoutNeutral).toBe(true)
  })

  it('flags paragraph typing next to a table as table-adjacent', () => {
    const previousState = createState(
      schema.node('doc', null, [schema.node('paragraph', null, [schema.text('hello')]), createTableNode('cell')])
    )
    const transaction = previousState.tr.insertText('!', 6)
    const classification = classifyPaginationTransaction({
      transaction,
      previousDoc: previousState.doc,
      nextDoc: transaction.doc
    })

    expect(classification.kind).toBe('local-text')
    expect(classification.touchesTableAdjacentContent).toBe(true)
    expect(classification.touchesTableRegion).toBe(true)
    expect(classification.shouldScheduleSettledRefresh).toBe(true)
  })

  it('flags edits inside table cells as table touches', () => {
    const previousState = createState(schema.node('doc', null, [createTableNode('cell')]))
    const transaction = previousState.tr.insertText('!', 4)
    const classification = classifyPaginationTransaction({
      transaction,
      previousDoc: previousState.doc,
      nextDoc: transaction.doc
    })

    expect(classification.touchesTable).toBe(true)
    expect(classification.touchesTableRegion).toBe(true)
  })

  it('flags block splits immediately before a wrapped table as table-adjacent', () => {
    const previousState = createState(
      schema.node('doc', null, [schema.node('paragraph', null, [schema.text('hello')]), createWrappedTableNode('cell')])
    )
    const transaction = previousState.tr.split(6)
    const classification = classifyPaginationTransaction({
      transaction,
      previousDoc: previousState.doc,
      nextDoc: transaction.doc
    })

    expect(classification.kind).toBe('structure')
    expect(classification.touchesTableAdjacentContent).toBe(true)
    expect(classification.touchesTableRegion).toBe(true)
    expect(classification.shouldScheduleSettledRefresh).toBe(true)
  })

  it('flags typing one textblock before a wrapped table region as table-adjacent', () => {
    const previousState = createState(
      schema.node('doc', null, [
        schema.node('paragraph', null, [schema.text('hello')]),
        schema.node('paragraph', null, [schema.text('world')]),
        createWrappedTableNode('cell')
      ])
    )
    const transaction = previousState.tr.insertText('!', 6)
    const classification = classifyPaginationTransaction({
      transaction,
      previousDoc: previousState.doc,
      nextDoc: transaction.doc
    })

    expect(classification.kind).toBe('local-text')
    expect(classification.touchesTableAdjacentContent).toBe(true)
    expect(classification.touchesTableRegion).toBe(true)
    expect(classification.shouldScheduleSettledRefresh).toBe(true)
  })

  it('flags block splits across a wrapped paragraph before a wrapped table region as table-adjacent', () => {
    const previousState = createState(
      schema.node('doc', null, [
        schema.node('paragraph', null, [schema.text('hello')]),
        createWrappedParagraphNode('world'),
        createWrappedTableNode('cell')
      ])
    )
    const transaction = previousState.tr.split(6)
    const classification = classifyPaginationTransaction({
      transaction,
      previousDoc: previousState.doc,
      nextDoc: transaction.doc
    })

    expect(classification.kind).toBe('structure')
    expect(classification.touchesTableAdjacentContent).toBe(true)
    expect(classification.touchesTableRegion).toBe(true)
    expect(classification.shouldScheduleSettledRefresh).toBe(true)
  })

  it('flags block-boundary splits one paragraph before a table region as table-adjacent', () => {
    const previousState = createState(
      schema.node('doc', null, [
        schema.node('paragraph', null, [schema.text('hello')]),
        schema.node('paragraph', null, [schema.text('world')]),
        createWrappedTableNode('cell')
      ])
    )
    const transaction = previousState.tr.insert(7, schema.node('paragraph'))
    const classification = classifyPaginationTransaction({
      transaction,
      previousDoc: previousState.doc,
      nextDoc: transaction.doc
    })

    expect(classification.kind).toBe('structure')
    expect(classification.touchesTableAdjacentContent).toBe(true)
    expect(classification.touchesTableRegion).toBe(true)
    expect(classification.shouldScheduleSettledRefresh).toBe(true)
  })

  it('flags typing across a wrapped paragraph before a wrapped table region as table-adjacent', () => {
    const previousState = createState(
      schema.node('doc', null, [
        schema.node('paragraph', null, [schema.text('hello')]),
        createWrappedParagraphNode('world'),
        createWrappedTableNode('cell')
      ])
    )
    const transaction = previousState.tr.insertText('!', 6)
    const classification = classifyPaginationTransaction({
      transaction,
      previousDoc: previousState.doc,
      nextDoc: transaction.doc
    })

    expect(classification.kind).toBe('local-text')
    expect(classification.touchesTableAdjacentContent).toBe(true)
    expect(classification.touchesTableRegion).toBe(true)
    expect(classification.shouldScheduleSettledRefresh).toBe(true)
  })

  it('flags typing two textblocks before a wrapped table region in the current local window', () => {
    const previousState = createState(
      schema.node('doc', null, [
        schema.node('paragraph', null, [schema.text('hello')]),
        schema.node('paragraph', null, [schema.text('world')]),
        schema.node('paragraph', null, [schema.text('again')]),
        createWrappedTableNode('cell')
      ])
    )
    const transaction = previousState.tr.insertText('!', 6)
    const classification = classifyPaginationTransaction({
      transaction,
      previousDoc: previousState.doc,
      nextDoc: transaction.doc
    })

    expect(classification.kind).toBe('local-text')
    expect(classification.touchesTableAdjacentContent).toBe(true)
    expect(classification.touchesTableRegion).toBe(true)
    expect(classification.shouldScheduleSettledRefresh).toBe(true)
  })

  it('does not bridge through block atoms before a wrapped table region', () => {
    const previousState = createState(
      schema.node('doc', null, [
        schema.node('paragraph', null, [schema.text('hello')]),
        schema.node('pageBreak'),
        createWrappedTableNode('cell')
      ])
    )
    const transaction = previousState.tr.insertText('!', 6)
    const classification = classifyPaginationTransaction({
      transaction,
      previousDoc: previousState.doc,
      nextDoc: transaction.doc
    })

    expect(classification.kind).toBe('local-text')
    expect(classification.touchesTableAdjacentContent).toBe(false)
    expect(classification.touchesTableRegion).toBe(false)
    expect(classification.shouldScheduleSettledRefresh).toBe(false)
  })
})
