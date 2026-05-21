import React from 'react'

/** Placeholder shown when a markdown table cell has no renderable content. */
export const EmptyMarkdownTableCell = () => <span className="gba:text-xs">—</span>

/**
 * Extract plain text from table cell children, including nested React elements
 * (e.g. EntityLink chips rendered from `[Name](employee://uuid)` markdown links).
 */
export function getTableCellText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') {
    return ''
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(getTableCellText).join('')
  }
  if (React.isValidElement(node)) {
    const childrenProp = (node.props as { children?: React.ReactNode }).children
    return getTableCellText(childrenProp)
  }
  return ''
}

export interface MarkdownTableCellBodyOptions {
  children?: React.ReactNode
}

export function buildMarkdownTableCellBody({ children }: MarkdownTableCellBodyOptions): {
  cellContent: string
  isEmpty: boolean
  isLong: boolean
  cellBody: React.ReactNode
} {
  const cellContent = getTableCellText(children).trim()
  const isEmpty = cellContent.length === 0
  const isLong = cellContent.length > 200

  let cellBody: React.ReactNode
  if (isEmpty) {
    cellBody = <EmptyMarkdownTableCell />
  } else if (isLong) {
    cellBody = <div className="gba:max-h-32 gba:overflow-y-auto gba:wrap-break-word">{children}</div>
  } else {
    cellBody = <div className="gba:wrap-break-word">{children}</div>
  }

  return { cellContent, isEmpty, isLong, cellBody }
}
