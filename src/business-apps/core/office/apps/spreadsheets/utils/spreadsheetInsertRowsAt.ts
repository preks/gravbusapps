import { getViewerRowIdentityCandidates, rowMatchesRemoteId, type ViewerRow } from './spreadsheetRowIdentity'

const getRowIdentityCandidates = (row: ViewerRow): string[] =>
  Array.from(
    new Set(
      [...getViewerRowIdentityCandidates(row), typeof row._clientRowId === 'string' ? row._clientRowId : ''].filter(
        Boolean
      )
    )
  )

export function mergeInsertedRowsAtIndex(
  existingRows: ViewerRow[],
  createdRows: ViewerRow[],
  insertAt: number
): ViewerRow[] {
  if (createdRows.length === 0) {
    return [...existingRows]
  }

  const createdByIdentity = new Map<string, ViewerRow>()
  for (const row of createdRows) {
    for (const identity of getRowIdentityCandidates(row)) {
      createdByIdentity.set(identity, row)
    }
  }

  const nextRows = existingRows.map(row => {
    const replacement = getRowIdentityCandidates(row)
      .map(identity => createdByIdentity.get(identity))
      .find(Boolean)
    return replacement ?? row
  })

  const remainingRows = nextRows.filter(existing => {
    const existingIdentities = getRowIdentityCandidates(existing)
    return !createdRows.some(row =>
      existingIdentities.some(identity => {
        if (rowMatchesRemoteId(row, identity)) return true
        return typeof row._clientRowId === 'string' && row._clientRowId === identity
      })
    )
  })

  const rowsToInsert = createdRows.filter(row => {
    const identities = getRowIdentityCandidates(row)
    return !remainingRows.some(existing =>
      identities.some(identity => {
        if (rowMatchesRemoteId(existing, identity)) return true
        return typeof existing._clientRowId === 'string' && existing._clientRowId === identity
      })
    )
  })

  const safeInsertAt = Math.min(Math.max(0, Math.trunc(insertAt)), remainingRows.length)
  remainingRows.splice(safeInsertAt, 0, ...rowsToInsert)

  return remainingRows
}
