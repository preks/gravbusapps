import { useMemo, useState } from 'react'
import { DocumentColumn, DocumentItem, DocumentSortDirection } from '../types'

type SortableDocument = DocumentItem & { level: number; hasChildren: boolean; isExpanded: boolean }

interface UseDocumentSortingProps {
  documents: SortableDocument[]
  columns: DocumentColumn[]
  enabled?: boolean
  initialColumnId?: string | null
  initialDirection?: DocumentSortDirection
}

function compareSortValues(
  leftValue: string | number | null | undefined,
  rightValue: string | number | null | undefined,
  direction: DocumentSortDirection
) {
  const directionFactor = direction === 'asc' ? 1 : -1

  if (leftValue == null && rightValue == null) {
    return 0
  }

  if (leftValue == null) {
    return 1
  }

  if (rightValue == null) {
    return -1
  }

  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return (leftValue - rightValue) * directionFactor
  }

  return String(leftValue).localeCompare(String(rightValue)) * directionFactor
}

export function useDocumentSorting({
  documents,
  columns,
  enabled = false,
  initialColumnId = 'uploadDate',
  initialDirection = 'desc'
}: UseDocumentSortingProps) {
  const [sortColumnId, setSortColumnId] = useState<string | null>(initialColumnId)
  const [sortDirection, setSortDirection] = useState<DocumentSortDirection>(initialDirection)

  const handleSortChange = (columnId: string) => {
    if (sortColumnId === columnId) {
      setSortDirection(previousDirection => (previousDirection === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortColumnId(columnId)
    setSortDirection('asc')
  }

  const sortedDocuments = useMemo(() => {
    if (!enabled || !sortColumnId) {
      return documents
    }

    const column = columns.find(item => item.id === sortColumnId)
    if (!column?.getSortValue) {
      return documents
    }

    return documents
      .map((document, index) => ({ document, index }))
      .sort((left, right) => {
        const compareResult = compareSortValues(
          column.getSortValue?.(left.document),
          column.getSortValue?.(right.document),
          sortDirection
        )

        return compareResult || left.index - right.index
      })
      .map(item => item.document)
  }, [columns, documents, enabled, sortColumnId, sortDirection])

  return {
    sortedDocuments,
    sortColumnId,
    sortDirection,
    handleSortChange
  }
}
