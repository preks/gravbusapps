/**
 * Inline expression chip inside the Tiptap editor (InputGroup control).
 */

import React, { useCallback } from 'react'
import { Chip } from '@newwork/nw-design-system'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'

export const ExpressionPillView: React.FC<NodeViewProps> = ({ node, editor, getPos, deleteNode }) => {
  const label = node.attrs.label || node.attrs.expression || node.attrs.id

  const removeChip = useCallback(() => {
    if (typeof deleteNode === 'function') {
      deleteNode()
      return
    }

    const pos = getPos()
    if (typeof pos !== 'number') return

    editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + node.nodeSize })
      .run()
  }, [deleteNode, editor, getPos, node.nodeSize])

  const handleRemovePointerDown = useCallback((event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('[aria-label^="Remove"]')) {
      event.preventDefault()
      event.stopPropagation()
    }
  }, [])

  return (
    <NodeViewWrapper as="span" onMouseDown={handleRemovePointerDown}>
      <Chip size="sm" variant="default" removable onRemove={removeChip} data-testid="expression-chip">
        {label}
      </Chip>
    </NodeViewWrapper>
  )
}

ExpressionPillView.displayName = 'ExpressionPillView'
