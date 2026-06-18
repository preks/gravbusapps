/**
 * NodeContextMenu - Right-click context menu on canvas nodes.
 * Options: Edit, Duplicate, Delete, Test Node.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Copy, Trash2, Settings2, Play } from 'lucide-react'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'

interface ContextMenuPosition {
  x: number
  y: number
  nodeId: string
}

interface NodeContextMenuProps {
  'data-testid'?: string
}

export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
  'data-testid': testId = 'flow-studio-context-menu'
}) => {
  const [position, setPosition] = useState<ContextMenuPosition | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const selectNode = useFlowStudioStore(s => s.selectNode)
  const requestDeleteNode = useFlowStudioStore(s => s.requestDeleteNode)
  const duplicateNode = useFlowStudioStore(s => s.duplicateNode)

  useEffect(() => {
    const handleContextMenu = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail?.nodeId) {
        setPosition({ x: detail.x, y: detail.y, nodeId: detail.nodeId })
      }
    }

    document.addEventListener('flow-studio-node-context', handleContextMenu)
    return () => document.removeEventListener('flow-studio-node-context', handleContextMenu)
  }, [])

  useEffect(() => {
    if (!position) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setPosition(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [position])

  useEffect(() => {
    if (!position) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPosition(null)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [position])

  const handleAction = useCallback(
    (action: string) => {
      if (!position) return

      switch (action) {
        case 'edit':
          selectNode(position.nodeId)
          break
        case 'duplicate':
          duplicateNode(position.nodeId)
          break
        case 'delete':
          requestDeleteNode(position.nodeId)
          break
        case 'test':
          selectNode(position.nodeId)
          break
      }

      setPosition(null)
    },
    [position, selectNode, duplicateNode, requestDeleteNode]
  )

  if (!position) return null

  const items = [
    { action: 'edit', label: 'Edit', icon: Settings2 },
    { action: 'duplicate', label: 'Duplicate', icon: Copy },
    { action: 'test', label: 'Test Node', icon: Play },
    { action: 'delete', label: 'Delete', icon: Trash2, destructive: true }
  ]

  return (
    <div
      ref={menuRef}
      className="gba:fixed gba:z-50 gba:bg-popover gba:border gba:border-border gba:rounded-lg gba:shadow-xl gba:overflow-hidden gba:min-w-[160px] gba:py-1"
      style={{ left: position.x, top: position.y }}
      data-testid={testId}
    >
      {items.map(item => {
        const Icon = item.icon
        return (
          <Button
            key={item.action}
            type="button"
            variant="ghost"
            onClick={() => handleAction(item.action)}
            data-testid={`${testId}-${item.action}`}
            className={`gba:w-full gba:h-auto gba:justify-start gba:gap-2 gba:rounded-none gba:px-3 gba:py-2 gba:text-sm gba:font-normal ${
              item.destructive ? 'gba:text-destructive hover:gba:text-destructive' : ''
            }`}
          >
            <Icon className="gba:h-3.5 gba:w-3.5" />
            {item.label}
          </Button>
        )
      })}
    </div>
  )
}
