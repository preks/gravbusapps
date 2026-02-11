/**
 * LinkedTaskItemView Component
 *
 * Custom TipTap NodeView for task items that may be linked to Kanban cards.
 * Displays status badge and assignee avatar when linked.
 */

import React, { useMemo, useState, useEffect } from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { Badge, Tooltip, TooltipContent, TooltipTrigger } from '@newwork/nw-design-system'
import type { KanbanData, KanbanParticipant } from '../../shared/extensions/Kanban'

interface LinkedTaskItemViewProps {
  node: {
    attrs: {
      checked: boolean
      kanbanCardId?: string | null
      kanbanId?: string | null
    }
  }
  updateAttributes: (attrs: Record<string, unknown>) => void
  getPos: () => number
  editor: {
    isEditable: boolean
    on: (event: string, handler: () => void) => void
    off: (event: string, handler: () => void) => void
    state: {
      doc: {
        descendants: (callback: (node: any, pos: number) => boolean | void) => void
      }
    }
    storage: {
      kanban?: {
        participants?: KanbanParticipant[]
      }
    }
  }
}

// Get badge variant based on column
const getStatusVariant = (columnId: string): 'default' | 'success' | 'warning' | 'info' | 'destructive' => {
  switch (columnId) {
    case 'done':
      return 'success'
    case 'in-progress':
      return 'warning'
    case 'todo':
      return 'info'
    default:
      return 'default'
  }
}

export const LinkedTaskItemView: React.FC<LinkedTaskItemViewProps> = ({ node, updateAttributes, getPos, editor }) => {
  const { checked, kanbanCardId, kanbanId } = node.attrs
  const isLinked = Boolean(kanbanCardId && kanbanId)

  // Get current position for context menu
  const nodePos = typeof getPos === 'function' ? getPos() : -1

  // Force re-render on editor updates to pick up Kanban changes
  const [updateCounter, setUpdateCounter] = useState(0)
  useEffect(() => {
    if (!editor || !isLinked) return

    const handleUpdate = () => setUpdateCounter(c => c + 1)
    editor.on('update', handleUpdate)

    return () => {
      editor.off('update', handleUpdate)
    }
  }, [editor, isLinked])

  // Find the linked Kanban card data
  const linkedCardInfo = useMemo(() => {
    if (!isLinked || !kanbanId || !kanbanCardId) return null

    let kanbanData: KanbanData | null = null

    // Find the Kanban node in the document
    editor.state.doc.descendants(docNode => {
      if (docNode.type.name === 'kanban' && docNode.attrs.id === kanbanId) {
        try {
          kanbanData = JSON.parse(docNode.attrs.dataJson || '{}')
        } catch {
          // Invalid JSON
        }
        return false
      }
    })

    if (!kanbanData) return null

    // Find the card in the Kanban
    for (const column of kanbanData.columns) {
      const card = column.cards.find(c => c.id === kanbanCardId)
      if (card) {
        return {
          card,
          column,
          kanbanData
        }
      }
    }

    return null
    // updateCounter triggers re-computation on editor updates
  }, [isLinked, kanbanId, kanbanCardId, updateCounter])

  // Get participant info for assignee - with proper avatar URL formatting
  const assigneeInfo = useMemo(() => {
    if (!linkedCardInfo?.card.assigneeId) return null

    const participants = editor.storage?.kanban?.participants || []
    const participant = participants.find(p => p.userId === linkedCardInfo.card.assigneeId)

    if (participant) {
      // Ensure avatar URL is properly formatted
      let avatarUrl = participant.userAvatar
      if (avatarUrl && !avatarUrl.startsWith('data:') && !avatarUrl.startsWith('http')) {
        avatarUrl = `data:image/png;base64,${avatarUrl}`
      }
      return {
        ...participant,
        userAvatar: avatarUrl
      }
    }

    // Fallback to card snapshot
    if (linkedCardInfo.card.assigneeName) {
      let avatarUrl = linkedCardInfo.card.assigneeAvatar
      if (avatarUrl && !avatarUrl.startsWith('data:') && !avatarUrl.startsWith('http')) {
        avatarUrl = `data:image/png;base64,${avatarUrl}`
      }
      return {
        userId: linkedCardInfo.card.assigneeId,
        userName: linkedCardInfo.card.assigneeName,
        userAvatar: avatarUrl
      }
    }

    return null
    // updateCounter triggers re-computation on editor updates
  }, [linkedCardInfo, updateCounter])

  const handleCheckboxChange = () => {
    if (!editor.isEditable) return
    updateAttributes({ checked: !checked })
  }

  return (
    <NodeViewWrapper
      as="li"
      className="gba:flex gba:items-baseline gba:gap-1.5"
      data-type="taskItem"
      data-checked={checked}
      data-node-pos={nodePos >= 0 ? nodePos : undefined}
      data-kanban-card-id={kanbanCardId || undefined}
      data-kanban-id={kanbanId || undefined}
    >
      {/* Checkbox */}
      <label className="gba:flex gba:items-center gba:select-none gba:flex-shrink-0" contentEditable={false}>
        <input
          type="checkbox"
          checked={checked}
          onChange={handleCheckboxChange}
          disabled={!editor.isEditable}
          className="gba:w-4 gba:h-4 gba:cursor-pointer gba:accent-primary"
        />
      </label>

      {/* Content wrapper - keeps text and badges on same line */}
      <div
        className={`gba:flex gba:items-baseline gba:gap-1.5 gba:flex-wrap ${checked ? 'gba:line-through gba:opacity-60' : ''}`}
      >
        <NodeViewContent as="span" className="gba:inline" />

        {/* Status Badge & Assignee Avatar (right after text) */}
        {isLinked && linkedCardInfo && (
          <span className="gba:inline-flex gba:items-center gba:gap-1 gba:flex-shrink-0" contentEditable={false}>
            {/* Status Badge */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Badge
                    variant={getStatusVariant(linkedCardInfo.column.id)}
                    className="gba:text-[8px] gba:px-1.5 gba:py-0 gba:h-4 gba:font-medium gba:cursor-default"
                  >
                    {linkedCardInfo.column.title}
                  </Badge>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="gba:text-xs">
                Status: {linkedCardInfo.column.title}
              </TooltipContent>
            </Tooltip>

            {/* Assignee Avatar */}
            {assigneeInfo && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="gba:inline-flex gba:h-4 gba:w-4 gba:rounded-full gba:items-center gba:justify-center gba:overflow-hidden gba:cursor-default"
                    style={{ backgroundColor: assigneeInfo.userColor || '#6366f1' }}
                  >
                    {assigneeInfo.userAvatar ? (
                      <img
                        src={assigneeInfo.userAvatar}
                        alt={assigneeInfo.userName || ''}
                        className="gba:w-full gba:h-full gba:object-cover"
                      />
                    ) : (
                      <span className="gba:text-[8px] gba:font-bold gba:text-primary-foreground">
                        {assigneeInfo.userName?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="gba:text-xs">
                  {assigneeInfo.userName}
                </TooltipContent>
              </Tooltip>
            )}
          </span>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export default LinkedTaskItemView
