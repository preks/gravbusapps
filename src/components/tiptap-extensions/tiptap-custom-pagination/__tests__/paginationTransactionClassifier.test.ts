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
})
