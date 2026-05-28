import type { SpreadsheetBatchOperation } from '../../services/SpreadsheetApiService'
import {
  classifyLocalPersistKindFromChunk,
  splitUnifiedOperationsByPersistKind
} from '../spreadsheetLocalPersistChunks'

const op = (
  type: SpreadsheetBatchOperation['type'],
  data: Record<string, unknown> = {}
): SpreadsheetBatchOperation => ({
  operationId: `${type}-${Math.random()}`,
  type,
  data
})

describe('spreadsheetLocalPersistChunks', () => {
  it('classifies pure value chunks onto fast-path kinds', () => {
    expect(classifyLocalPersistKindFromChunk([op('set_cell')])).toBe('cellValue')
    expect(classifyLocalPersistKindFromChunk([op('set_range')])).toBe('rangeValue')
    expect(classifyLocalPersistKindFromChunk([op('clear_cell')])).toBe('clear')
  })

  it('splits mixed add_rows, range and style operations into ordered persist chunks', () => {
    const chunks = splitUnifiedOperationsByPersistKind([op('add_rows'), op('set_range'), op('set_style')], 100_000)

    expect(chunks).toHaveLength(3)
    expect(chunks.map(chunk => chunk.kind)).toEqual(['structural', 'rangeValue', 'style'])
    expect(chunks.map(chunk => chunk.operations.map(operation => operation.type))).toEqual([
      ['add_rows'],
      ['set_range'],
      ['set_style']
    ])
  })

  it('classifies merge_ranges as workbookFeature', () => {
    expect(classifyLocalPersistKindFromChunk([op('merge_ranges')])).toBe('workbookFeature')
  })

  it('groups contiguous workbook feature operations into one chunk', () => {
    const chunks = splitUnifiedOperationsByPersistKind([op('merge_ranges'), op('unmerge_ranges')], 100_000)

    expect(chunks).toHaveLength(1)
    expect(chunks[0]?.kind).toBe('workbookFeature')
    expect(chunks[0]?.operations.map(operation => operation.type)).toEqual(['merge_ranges', 'unmerge_ranges'])
  })

  it('keeps contiguous value operations together while isolating style writes', () => {
    const chunks = splitUnifiedOperationsByPersistKind(
      [op('set_range'), op('set_range'), op('set_style'), op('set_cell')],
      100_000
    )

    expect(chunks.map(chunk => chunk.kind)).toEqual(['rangeValue', 'style', 'cellValue'])
    expect(chunks[0]?.operations).toHaveLength(2)
    expect(chunks[1]?.operations).toHaveLength(1)
    expect(chunks[2]?.operations).toHaveLength(1)
  })
})
