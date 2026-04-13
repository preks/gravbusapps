import {
  buildDocumentTocSnapshotFromDoc,
  isDocumentTocStructurallyStale,
  parseDocumentTocSnapshot,
  stringifyDocumentTocSnapshot,
  updateDocumentTocSnapshotPageNumbers
} from './documentTocSnapshot'

function createDocWithHeading(options: { text: string; level?: number; blockStart?: number }) {
  return {
    descendants: (
      visit: (node: { type: { name: string }; attrs: { level: number }; textContent: string }, pos: number) => void
    ) => {
      visit(
        {
          type: { name: 'heading' },
          attrs: { level: options.level ?? 1 },
          textContent: options.text
        },
        options.blockStart ?? 10
      )
    }
  } as never
}

describe('documentTocSnapshot', () => {
  it('builds a stored snapshot with page numbers', () => {
    const snapshot = buildDocumentTocSnapshotFromDoc({
      doc: createDocWithHeading({ text: 'Overview', blockStart: 10 }),
      afterPos: 0,
      maxHeadingLevel: 3,
      spans: [{ pageNumber: 4, startPos: 0, endPos: 100 }],
      layoutVersion: 9
    })

    expect(snapshot.entries).toEqual([
      {
        level: 1,
        text: 'Overview',
        pos: 11,
        blockStart: 10,
        pageNumber: '4'
      }
    ])
    expect(snapshot.layoutVersion).toBe(9)
  })

  it('updates page numbers without changing the stored structure', () => {
    const original = parseDocumentTocSnapshot(
      stringifyDocumentTocSnapshot(
        buildDocumentTocSnapshotFromDoc({
          doc: createDocWithHeading({ text: 'Overview', blockStart: 10 }),
          afterPos: 0,
          maxHeadingLevel: 3,
          spans: [{ pageNumber: 1, startPos: 0, endPos: 100 }],
          layoutVersion: 1
        })
      )
    )

    const updated = updateDocumentTocSnapshotPageNumbers({
      snapshot: original,
      doc: createDocWithHeading({ text: 'Overview', blockStart: 10 }),
      spans: [{ pageNumber: 7, startPos: 0, endPos: 100 }],
      layoutVersion: 2
    })

    expect(updated.entries[0]?.text).toBe('Overview')
    expect(updated.entries[0]?.pageNumber).toBe('7')
    expect(updated.updateMode).toBe('pageNumbers')
    expect(updated.layoutVersion).toBe(2)
  })

  it('detects structural drift from stored entries', () => {
    const snapshot = parseDocumentTocSnapshot(
      JSON.stringify({
        version: 2,
        entries: [
          {
            level: 1,
            text: 'Overview',
            pos: 11,
            blockStart: 10,
            pageNumber: '1'
          }
        ],
        updatedAt: '2026-04-14T10:00:00.000Z',
        updateMode: 'entire',
        layoutVersion: 1
      })
    )

    expect(
      isDocumentTocStructurallyStale({
        snapshot,
        doc: createDocWithHeading({ text: 'Overview', blockStart: 10 }),
        afterPos: 0,
        maxHeadingLevel: 3
      })
    ).toBe(false)
    expect(
      isDocumentTocStructurallyStale({
        snapshot,
        doc: createDocWithHeading({ text: 'Changed title', blockStart: 10 }),
        afterPos: 0,
        maxHeadingLevel: 3
      })
    ).toBe(true)
  })
})
