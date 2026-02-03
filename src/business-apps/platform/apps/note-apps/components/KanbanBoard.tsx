/**
 * KanbanBoard Component
 *
 * A beautiful, interactive kanban board component for notes
 * with drag-and-drop functionality, assignees, colors, and persistence
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import {
  Button,
  Input,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@newwork/nw-design-system'
import { Plus, GripVertical, X, User, Palette, Link2 } from 'lucide-react'
import type { KanbanData, KanbanCardColor, KanbanParticipant } from '../../shared/extensions/Kanban'
import { KanbanAssigneeFilter } from './kanban/KanbanAssigneeFilter'

// Card color definitions with design system tokens
const CARD_COLORS: { id: KanbanCardColor; bg: string; border: string; label: string }[] = [
  { id: 'default', bg: 'gba:bg-card', border: 'gba:border-border/50', label: 'Default' },
  { id: 'red', bg: 'gba:bg-destructive-secondary', border: 'gba:border-destructive/30', label: 'Red' },
  { id: 'orange', bg: 'gba:bg-warning-secondary', border: 'gba:border-warning/30', label: 'Orange' },
  { id: 'yellow', bg: 'gba:bg-warning-secondary/60', border: 'gba:border-warning/20', label: 'Yellow' },
  { id: 'green', bg: 'gba:bg-success-secondary', border: 'gba:border-success/30', label: 'Green' },
  { id: 'blue', bg: 'gba:bg-info-secondary', border: 'gba:border-info/30', label: 'Blue' },
  { id: 'purple', bg: 'gba:bg-primary/10', border: 'gba:border-primary/30', label: 'Purple' },
  { id: 'pink', bg: 'gba:bg-destructive-secondary/60', border: 'gba:border-destructive/20', label: 'Pink' }
]

const getCardColorClasses = (color?: KanbanCardColor) => {
  const colorDef = CARD_COLORS.find(c => c.id === color) || CARD_COLORS[0]
  return `${colorDef.bg} ${colorDef.border}`
}

interface KanbanBoardProps {
  node: {
    attrs: {
      id: string
      dataJson?: string | null
    }
  }
  updateAttributes: (attrs: Record<string, unknown>) => void
  editor: any
  extension: {
    storage: {
      participants: KanbanParticipant[]
    }
  }
  selected: boolean
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ node, updateAttributes, extension, editor }) => {
  const kanbanId = node.attrs.id as string
  const [availableParticipants, setAvailableParticipants] = useState<KanbanParticipant[]>(
    () => extension?.storage?.participants || []
  )
  const participantsDebug = (extension?.storage as any)?.participantsDebug as
    | {
        status?: string
        sharedUsersCount?: number
        collaborationParticipantsCount?: number
        finalCount?: number
        hasOwnerId?: boolean
        hasCurrentUserId?: boolean
        updatedAt?: string
        lastError?: string
      }
    | undefined

  const isDebugEnabled = (() => {
    try {
      return (
        typeof window !== 'undefined' &&
        (window.localStorage.getItem('debug:note-apps') === '1' || window.localStorage.getItem('debug:kanban') === '1')
      )
    } catch {
      return false
    }
  })()

  // Keep participants in React state so the UI updates when NoteEditor mutates extension.storage.participants.
  useEffect(() => {
    const sync = () => {
      const next = extension?.storage?.participants || []
      setAvailableParticipants(next.length ? [...next] : [])
    }

    sync()

    // TipTap editor emits events on transactions/updates; use them when available.
    const anyEditor = editor as unknown as {
      on?: (e: string, cb: () => void) => void
      off?: (e: string, cb: () => void) => void
    }
    if (anyEditor?.on && anyEditor?.off) {
      try {
        anyEditor.on('transaction', sync)
        anyEditor.on('update', sync)
        return () => {
          try {
            anyEditor.off?.('transaction', sync)
            anyEditor.off?.('update', sync)
          } catch {
            // ignore
          }
        }
      } catch {
        // fall back to polling below
      }
    }

    // Fallback: poll occasionally (covers cases where editor event hooks aren't available).
    const interval = window.setInterval(sync, 1000)
    return () => window.clearInterval(interval)
  }, [editor, extension])

  const initialData: KanbanData = (() => {
    const raw = node.attrs.dataJson
    if (raw && typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw) as KanbanData
        if (parsed?.id && Array.isArray(parsed.columns)) return parsed
      } catch {
        // ignore, fallback below
      }
    }
    return {
      id: kanbanId,
      columns: [
        { id: 'todo', title: 'To Do', cards: [] },
        { id: 'in-progress', title: 'In Progress', cards: [] },
        { id: 'done', title: 'Done', cards: [] }
      ]
    }
  })()

  const [data, setData] = useState<KanbanData>(initialData)
  const [assigneeFilterId, setAssigneeFilterId] = useState<string | null>(null)
  const [draggedCard, setDraggedCard] = useState<{ cardId: string; columnId: string } | null>(null)
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null)
  const [editingCard, setEditingCard] = useState<{ cardId: string; columnId: string } | null>(null)
  const [newCardContent, setNewCardContent] = useState<Record<string, string>>({})
  const [editingColumnTitle, setEditingColumnTitle] = useState<Record<string, boolean>>({})
  const [columnTitleInput, setColumnTitleInput] = useState<Record<string, string>>({})
  // Track which card's assignee popover is open (to close it after selection)
  const [openAssigneePopover, setOpenAssigneePopover] = useState<string | null>(null)

  // Debounce updates to avoid too many saves
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Track the last dataJson we processed to detect external changes
  const lastProcessedDataJsonRef = useRef<string | null>(null)

  // Sync local state when node.attrs.dataJson changes externally (e.g., from task list sync)
  useEffect(() => {
    const currentDataJson = node.attrs.dataJson

    // Skip if this is our own update or no change
    if (currentDataJson === lastProcessedDataJsonRef.current) return
    if (!currentDataJson || typeof currentDataJson !== 'string') return

    try {
      const parsed = JSON.parse(currentDataJson) as KanbanData
      if (parsed?.id && Array.isArray(parsed.columns)) {
        // Only update if there's an actual change (compare stringified versions)
        const currentStringified = JSON.stringify(data)
        const newStringified = JSON.stringify(parsed)

        if (currentStringified !== newStringified) {
          console.debug('[KanbanBoard] External data change detected, syncing...')
          setData(parsed)
        }
        lastProcessedDataJsonRef.current = currentDataJson
      }
    } catch {
      // Invalid JSON, ignore
    }
  }, [node.attrs.dataJson, data])

  const persistData = useCallback(
    (newData: KanbanData) => {
      // Update local state immediately for responsive UI
      setData(newData)

      // Clear existing timer
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
      }

      // Debounce the persistence update
      updateTimerRef.current = setTimeout(() => {
        const newDataJson = JSON.stringify(newData)
        // Mark this as our own update so we don't re-process it
        lastProcessedDataJsonRef.current = newDataJson
        updateAttributes({ dataJson: newDataJson })
      }, 300)
    },
    [updateAttributes]
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
      }
    }
  }, [])

  const handleDragStart = useCallback((e: React.DragEvent, cardId: string, columnId: string) => {
    setDraggedCard({ cardId, columnId })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '') // Required for Firefox
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent, columnId: string) => {
      e.preventDefault()
      e.stopPropagation()
      if (draggedCard) {
        setDraggedOverColumn(columnId)
        e.dataTransfer.dropEffect = 'move'
      }
    },
    [draggedCard]
  )

  const handleDragLeave = useCallback(() => {
    setDraggedOverColumn(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetColumnId: string) => {
      e.preventDefault()
      e.stopPropagation()

      if (!draggedCard) return

      const { cardId, columnId: sourceColumnId } = draggedCard

      if (sourceColumnId === targetColumnId) {
        setDraggedCard(null)
        setDraggedOverColumn(null)
        return
      }

      // Find the card and remove it from source column
      const sourceColumn = data.columns.find(col => col.id === sourceColumnId)
      const targetColumn = data.columns.find(col => col.id === targetColumnId)

      if (!sourceColumn || !targetColumn) {
        setDraggedCard(null)
        setDraggedOverColumn(null)
        return
      }

      const card = sourceColumn.cards.find(c => c.id === cardId)
      if (!card) {
        setDraggedCard(null)
        setDraggedOverColumn(null)
        return
      }

      // Update data
      const newColumns = data.columns.map(col => {
        if (col.id === sourceColumnId) {
          return {
            ...col,
            cards: col.cards.filter(c => c.id !== cardId)
          }
        }
        if (col.id === targetColumnId) {
          return {
            ...col,
            cards: [...col.cards, card]
          }
        }
        return col
      })

      persistData({
        ...data,
        columns: newColumns
      })

      setDraggedCard(null)
      setDraggedOverColumn(null)
    },
    [data, draggedCard, persistData]
  )

  const handleAddCard = useCallback(
    (columnId: string) => {
      const newCardId = `card-${Date.now()}`
      const newColumns = data.columns.map(col => {
        if (col.id === columnId) {
          return {
            ...col,
            cards: [...col.cards, { id: newCardId, content: '' }]
          }
        }
        return col
      })

      persistData({
        ...data,
        columns: newColumns
      })

      setEditingCard({ cardId: newCardId, columnId })
      setNewCardContent({ ...newCardContent, [newCardId]: '' })
    },
    [data, newCardContent, persistData]
  )

  const handleCardContentChange = useCallback(
    (cardId: string, columnId: string, content: string) => {
      const newColumns = data.columns.map(col => {
        if (col.id === columnId) {
          return {
            ...col,
            cards: col.cards.map(card => (card.id === cardId ? { ...card, content } : card))
          }
        }
        return col
      })

      persistData({
        ...data,
        columns: newColumns
      })
    },
    [data, persistData]
  )

  const handleDeleteCard = useCallback(
    (cardId: string, columnId: string) => {
      const newColumns = data.columns.map(col => {
        if (col.id === columnId) {
          return {
            ...col,
            cards: col.cards.filter(c => c.id !== cardId)
          }
        }
        return col
      })

      persistData({
        ...data,
        columns: newColumns
      })
    },
    [data, persistData]
  )

  // Direct assignment function - uses functional state update to avoid stale closure issues
  const assignCardToUser = useCallback(
    (cardId: string, columnId: string, participant: KanbanParticipant | null) => {
      console.debug('[KanbanBoard] assignCardToUser called:', { cardId, columnId, participant })

      // Use functional update to always get the latest state
      setData(prevData => {
        const newColumns = prevData.columns.map(col => {
          if (col.id === columnId) {
            return {
              ...col,
              cards: col.cards.map(card =>
                card.id === cardId
                  ? {
                      ...card,
                      assigneeId: participant?.userId,
                      assigneeName: participant?.userName
                    }
                  : card
              )
            }
          }
          return col
        })

        const newData = { ...prevData, columns: newColumns }

        // Persist to TipTap node (debounced)
        if (updateTimerRef.current) {
          clearTimeout(updateTimerRef.current)
        }
        updateTimerRef.current = setTimeout(() => {
          console.debug('[KanbanBoard] Persisting to TipTap:', cardId, participant?.userId)
          updateAttributes({ dataJson: JSON.stringify(newData) })
        }, 300)

        return newData
      })

      // Close the popover
      setOpenAssigneePopover(null)
    },
    [updateAttributes]
  )

  const handleColorChange = useCallback(
    (cardId: string, columnId: string, color: KanbanCardColor) => {
      const newColumns = data.columns.map(col => {
        if (col.id === columnId) {
          return {
            ...col,
            cards: col.cards.map(card => (card.id === cardId ? { ...card, color } : card))
          }
        }
        return col
      })

      persistData({
        ...data,
        columns: newColumns
      })
    },
    [data, persistData]
  )

  const handleColumnTitleChange = useCallback(
    (columnId: string, newTitle: string) => {
      const newColumns = data.columns.map(col => {
        if (col.id === columnId) {
          return { ...col, title: newTitle }
        }
        return col
      })

      persistData({
        ...data,
        columns: newColumns
      })
    },
    [data, persistData]
  )

  const handleAddColumn = useCallback(() => {
    const newColumnId = `column-${Date.now()}`
    const newColumns = [...data.columns, { id: newColumnId, title: 'New Column', cards: [] }]

    persistData({
      ...data,
      columns: newColumns
    })

    setEditingColumnTitle({ ...editingColumnTitle, [newColumnId]: true })
    setColumnTitleInput({ ...columnTitleInput, [newColumnId]: 'New Column' })
  }, [data, editingColumnTitle, columnTitleInput, persistData])

  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      if (data.columns.length <= 1) return // Don't allow deleting the last column

      const newColumns = data.columns.filter(col => col.id !== columnId)
      persistData({
        ...data,
        columns: newColumns
      })
    },
    [data, persistData]
  )

  // Helper to resolve assignee
  const getParticipant = (userId?: string) => availableParticipants.find(p => p.userId === userId)

  // Prevent text selection when clicking inside the Kanban
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement

    // Allow text selection in input fields
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return
    }

    // Allow drag events - check if target or parent is draggable
    const draggableParent = target.closest('[draggable="true"]')
    if (draggableParent) {
      return
    }

    // Prevent selection for all other elements
    e.preventDefault()
  }, [])

  return (
    <NodeViewWrapper
      className="kanban-board-wrapper gba:my-4 gba:select-none"
      data-testid={`kanban-board-${data.id}`}
      onMouseDown={handleMouseDown}
    >
      <div className="gba:rounded-xl gba:overflow-x-auto gba:pb-1">
        <KanbanAssigneeFilter
          participants={availableParticipants}
          value={assigneeFilterId}
          onChange={setAssigneeFilterId}
          testId={`kanban-board-${data.id}`}
        />

        <div className="gba:flex gba:gap-2 gba:min-w-max">
          {data.columns.map(column => (
            <div
              key={column.id}
              className={`gba:flex-shrink-0 gba:w-44 gba:rounded-lg gba:p-1.5 gba:transition-all gba:duration-200 ${
                draggedOverColumn === column.id ? 'gba:bg-primary/5 gba:ring-1 gba:ring-primary/30' : 'gba:bg-muted/40'
              }`}
              onDragOver={e => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-1.5 gba:px-1">
                {editingColumnTitle[column.id] ? (
                  <Input
                    value={columnTitleInput[column.id] || column.title}
                    onChange={e => {
                      setColumnTitleInput({ ...columnTitleInput, [column.id]: e.target.value })
                    }}
                    onBlur={() => {
                      handleColumnTitleChange(column.id, columnTitleInput[column.id] || column.title)
                      setEditingColumnTitle({ ...editingColumnTitle, [column.id]: false })
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleColumnTitleChange(column.id, columnTitleInput[column.id] || column.title)
                        setEditingColumnTitle({ ...editingColumnTitle, [column.id]: false })
                      }
                      if (e.key === 'Escape') {
                        setEditingColumnTitle({ ...editingColumnTitle, [column.id]: false })
                      }
                    }}
                    className="gba:h-5 gba:text-[8px] gba:font-medium"
                    autoFocus
                  />
                ) : (
                  <div className="gba:flex gba:items-center gba:gap-1 gba:flex-1 gba:min-w-0">
                    <h3
                      className="gba:text-[8px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:cursor-pointer gba:truncate gba:flex-1 hover:gba:text-foreground gba:transition-colors"
                      onClick={() => {
                        setEditingColumnTitle({ ...editingColumnTitle, [column.id]: true })
                        setColumnTitleInput({ ...columnTitleInput, [column.id]: column.title })
                      }}
                    >
                      {column.title}
                    </h3>
                    <span className="gba:text-[9px] gba:font-medium gba:text-muted-foreground gba:bg-background gba:px-1 gba:py-0.5 gba:rounded-full">
                      {assigneeFilterId
                        ? column.cards.filter(c => c.assigneeId === assigneeFilterId).length
                        : column.cards.length}
                    </span>
                    {data.columns.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-4 gba:w-4 gba:opacity-0 hover:gba:opacity-100 gba:transition-opacity"
                        onClick={() => handleDeleteColumn(column.id)}
                      >
                        <X className="gba:w-2.5 gba:h-2.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Cards */}
              <div className="gba:space-y-1 gba:min-h-[50px]">
                {(assigneeFilterId ? column.cards.filter(c => c.assigneeId === assigneeFilterId) : column.cards).map(
                  card => {
                    const assigneeFromParticipants = getParticipant(card.assigneeId)
                    const assignee = assigneeFromParticipants
                      ? assigneeFromParticipants
                      : card.assigneeId
                        ? {
                            userId: card.assigneeId,
                            userName: card.assigneeName || `User ${card.assigneeId.slice(0, 8)}`,
                            userAvatar: undefined,
                            userColor: undefined
                          }
                        : undefined

                    // Debug: log assignee resolution
                    if (card.assigneeId) {
                      console.debug('[KanbanBoard] Card render:', {
                        cardId: card.id,
                        assigneeId: card.assigneeId,
                        assigneeName: card.assigneeName,
                        foundInParticipants: !!assigneeFromParticipants,
                        participantsCount: availableParticipants.length,
                        participantIds: availableParticipants.map(p => p.userId),
                        resolvedAssignee: assignee
                          ? { userId: assignee.userId, userName: assignee.userName, hasAvatar: !!assignee.userAvatar }
                          : null
                      })
                    }

                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={e => handleDragStart(e, card.id, column.id)}
                        className={`gba:group gba:rounded-md gba:px-2 gba:py-1.5 gba:cursor-grab active:gba:cursor-grabbing gba:transition-all gba:duration-150 gba:border hover:gba:border-border ${getCardColorClasses(card.color)} ${
                          draggedCard?.cardId === card.id ? 'gba:opacity-40 gba:scale-95' : ''
                        }`}
                        data-testid={`kanban-card-${card.id}`}
                      >
                        <div className="gba:flex gba:items-start gba:gap-1">
                          <div className="gba:mt-0.5 gba:flex-shrink-0 gba:opacity-30 group-hover:gba:opacity-60 gba:transition-opacity">
                            <GripVertical className="gba:w-2.5 gba:h-2.5 gba:text-muted-foreground" />
                          </div>
                          {editingCard?.cardId === card.id && editingCard?.columnId === column.id ? (
                            <div className="gba:flex-1">
                              <Input
                                value={newCardContent[card.id] || card.content}
                                onChange={e => {
                                  setNewCardContent({ ...newCardContent, [card.id]: e.target.value })
                                }}
                                onBlur={() => {
                                  handleCardContentChange(card.id, column.id, newCardContent[card.id] || card.content)
                                  setEditingCard(null)
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleCardContentChange(card.id, column.id, newCardContent[card.id] || card.content)
                                    setEditingCard(null)
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingCard(null)
                                  }
                                }}
                                placeholder="Enter card content..."
                                className="gba:text-[10px] gba:h-5"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div className="gba:flex-1 gba:min-w-0">
                              <div className="gba:flex gba:items-start gba:gap-1">
                                {/* Link indicator for cards linked to task items */}
                                {card.linkedTaskItemId && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="gba:flex-shrink-0 gba:mt-0.5">
                                        <Link2 className="gba:w-2.5 gba:h-2.5 gba:text-primary/60" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="gba:text-[10px]">
                                      Linked to task item
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                <div
                                  className="gba:flex-1 gba:text-[11px] gba:text-foreground gba:cursor-text gba:leading-snug gba:break-words"
                                  onClick={() => {
                                    setEditingCard({ cardId: card.id, columnId: column.id })
                                    setNewCardContent({ ...newCardContent, [card.id]: card.content })
                                  }}
                                >
                                  {card.content || <span className="gba:text-muted-foreground gba:italic">Empty</span>}
                                </div>
                              </div>
                              {/* Card footer with assignee and actions */}
                              <div className="gba:flex gba:items-center gba:justify-between gba:mt-1 gba:pt-1 gba:border-t gba:border-border/30">
                                <div className="gba:flex gba:items-center gba:gap-1">
                                  {/* Assignee */}
                                  <Popover
                                    open={openAssigneePopover === card.id}
                                    onOpenChange={open => setOpenAssigneePopover(open ? card.id : null)}
                                  >
                                    <PopoverTrigger asChild>
                                      <button
                                        type="button"
                                        className="gba:flex gba:items-center gba:rounded-full gba:transition-opacity hover:gba:opacity-80"
                                        draggable={false}
                                        onClick={e => {
                                          e.stopPropagation()
                                          setOpenAssigneePopover(openAssigneePopover === card.id ? null : card.id)
                                        }}
                                        title={assignee ? assignee.userName : 'Assign to someone'}
                                      >
                                        {card.assigneeId ? (
                                          // Show avatar image if available, otherwise show initial
                                          <div
                                            className="gba:h-5 gba:w-5 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:overflow-hidden gba:bg-primary"
                                            style={{ backgroundColor: assignee?.userColor || '#6366f1' }}
                                          >
                                            {assignee?.userAvatar ? (
                                              <img
                                                src={assignee.userAvatar}
                                                alt={assignee.userName || ''}
                                                className="gba:w-full gba:h-full gba:object-cover"
                                              />
                                            ) : (
                                              <span className="gba:text-[9px] gba:font-bold gba:text-primary-foreground">
                                                {(assignee?.userName || card.assigneeName || '?')
                                                  .charAt(0)
                                                  .toUpperCase()}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="gba:h-5 gba:w-5 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:opacity-50 group-hover:gba:opacity-80 gba:transition-opacity">
                                            <User className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
                                          </div>
                                        )}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="gba:w-36 gba:p-1" align="start">
                                      <div className="gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:px-2 gba:py-1">
                                        Assign to
                                      </div>
                                      {card.assigneeId && (
                                        <button
                                          type="button"
                                          className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1 gba:rounded gba:text-[10px] hover:gba:bg-muted gba:text-destructive"
                                          onClick={e => {
                                            e.stopPropagation()
                                            assignCardToUser(card.id, column.id, null)
                                          }}
                                          draggable={false}
                                        >
                                          <X className="gba:w-3 gba:h-3" />
                                          Unassign
                                        </button>
                                      )}
                                      {availableParticipants.map(p => (
                                        <button
                                          type="button"
                                          key={p.userId}
                                          className={`gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1 gba:rounded gba:text-[10px] hover:gba:bg-muted ${
                                            card.assigneeId === p.userId ? 'gba:bg-muted' : ''
                                          }`}
                                          onClick={e => {
                                            e.stopPropagation()
                                            assignCardToUser(card.id, column.id, p)
                                          }}
                                          draggable={false}
                                        >
                                          <Avatar className="gba:h-4 gba:w-4">
                                            {p.userAvatar ? <AvatarImage src={p.userAvatar} alt={p.userName} /> : null}
                                            <AvatarFallback className="gba:text-[8px]">
                                              {p.userName?.charAt(0)?.toUpperCase() || '?'}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="gba:truncate">{p.userName}</span>
                                        </button>
                                      ))}
                                      {availableParticipants.length === 0 && (
                                        <div className="gba:px-2 gba:py-2">
                                          <div className="gba:text-[10px] gba:text-muted-foreground">
                                            {participantsDebug?.status === 'loading'
                                              ? 'Loading participants…'
                                              : 'No participants'}
                                          </div>
                                          {isDebugEnabled && (
                                            <div className="gba:mt-1 gba:text-[10px] gba:text-muted-foreground gba:space-y-0.5">
                                              <div>
                                                status:{' '}
                                                <span className="gba:font-medium">
                                                  {participantsDebug?.status || 'n/a'}
                                                </span>
                                              </div>
                                              <div>
                                                sharedUsers:{' '}
                                                <span className="gba:font-medium">
                                                  {participantsDebug?.sharedUsersCount ?? 'n/a'}
                                                </span>
                                                {' • '}collab:{' '}
                                                <span className="gba:font-medium">
                                                  {participantsDebug?.collaborationParticipantsCount ?? 'n/a'}
                                                </span>
                                              </div>
                                              <div>
                                                hasOwnerId:{' '}
                                                <span className="gba:font-medium">
                                                  {String(participantsDebug?.hasOwnerId ?? 'n/a')}
                                                </span>
                                                {' • '}hasCurrentUserId:{' '}
                                                <span className="gba:font-medium">
                                                  {String(participantsDebug?.hasCurrentUserId ?? 'n/a')}
                                                </span>
                                              </div>
                                              <div>
                                                finalCount:{' '}
                                                <span className="gba:font-medium">
                                                  {participantsDebug?.finalCount ?? 'n/a'}
                                                </span>
                                              </div>
                                              {participantsDebug?.lastError && (
                                                <div className="gba:text-destructive gba:break-words">
                                                  error: {participantsDebug.lastError}
                                                </div>
                                              )}
                                              {participantsDebug?.updatedAt && (
                                                <div>updated: {participantsDebug.updatedAt}</div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </PopoverContent>
                                  </Popover>

                                  {isDebugEnabled && (
                                    <span className="gba:text-[9px] gba:text-muted-foreground gba:ml-1 gba:select-text">
                                      {card.assigneeId ? `assigneeId:${card.assigneeId}` : 'assigneeId:-'}
                                    </span>
                                  )}

                                  {/* Color picker */}
                                  <Popover>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <PopoverTrigger asChild>
                                          <button
                                            type="button"
                                            className="gba:opacity-70 group-hover:gba:opacity-95 hover:gba:opacity-100 gba:transition-opacity"
                                            draggable={false}
                                          >
                                            <Palette className="gba:w-4 gba:h-4 gba:text-foreground/60" />
                                          </button>
                                        </PopoverTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="gba:text-[10px]">
                                        Change color
                                      </TooltipContent>
                                    </Tooltip>
                                    <PopoverContent className="gba:w-28 gba:p-1.5" align="start">
                                      <div className="gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:px-1 gba:pb-1">
                                        Card color
                                      </div>
                                      <div className="gba:grid gba:grid-cols-4 gba:gap-1">
                                        {CARD_COLORS.map(c => (
                                          <Tooltip key={c.id}>
                                            <TooltipTrigger asChild>
                                              <button
                                                className={`gba:w-5 gba:h-5 gba:rounded gba:border ${c.bg} ${c.border} ${
                                                  card.color === c.id || (!card.color && c.id === 'default')
                                                    ? 'gba:ring-1 gba:ring-primary gba:ring-offset-1'
                                                    : ''
                                                } gba:transition-all hover:gba:scale-110`}
                                                onClick={() => handleColorChange(card.id, column.id, c.id)}
                                              />
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="gba:text-[10px]">
                                              {c.label}
                                            </TooltipContent>
                                          </Tooltip>
                                        ))}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>

                                {/* Delete button */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="gba:h-4 gba:w-4 gba:flex-shrink-0 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity"
                                  onClick={() => handleDeleteCard(card.id, column.id)}
                                >
                                  <X className="gba:w-2 gba:h-2" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  }
                )}
              </div>

              {/* Add Card Button */}
              <Button
                variant="ghost"
                size="sm"
                className="gba:w-full gba:mt-1 gba:h-6 gba:justify-start gba:text-muted-foreground gba:text-[10px] gba:px-1.5 hover:gba:bg-background/60"
                onClick={() => handleAddCard(column.id)}
              >
                <Plus className="gba:w-2.5 gba:h-2.5 gba:mr-1" />
                Add
              </Button>
            </div>
          ))}

          {/* Add Column Button */}
          <div className="gba:flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="gba:h-6 gba:px-2 gba:text-[10px] gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-muted/40 gba:rounded-md gba:transition-all"
              onClick={handleAddColumn}
            >
              <Plus className="gba:w-2.5 gba:h-2.5 gba:mr-1" />
              Column
            </Button>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  )
}
