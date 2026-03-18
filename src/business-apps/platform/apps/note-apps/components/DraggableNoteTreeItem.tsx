import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  MoreHorizontal,
  Plus,
  Edit3,
  FolderInput,
  Trash2,
  Pin,
  PinOff,
  GripVertical
} from 'lucide-react'
import type { NoteTreeNode } from '../types'
import translations from '../_i18n'

const INDENT_PX = 20

export interface DraggableNoteTreeItemProps {
  node: NoteTreeNode
  isSelected: boolean
  isExpanded: boolean
  isOverlay?: boolean
  onSelect: (id: string) => void
  onToggleExpand: (id: string) => void
  onCreateChild?: (parentId: string) => void
  onRename?: (id: string) => void
  onMove?: (id: string) => void
  onDelete?: (id: string) => void
  onTogglePin?: (id: string) => void
}

export const DraggableNoteTreeItem: React.FC<DraggableNoteTreeItemProps> = ({
  node,
  isSelected,
  isExpanded,
  isOverlay = false,
  onSelect,
  onToggleExpand,
  onCreateChild,
  onRename,
  onMove,
  onDelete,
  onTogglePin
}) => {
  const { t } = useTranslation(translations)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    disabled: isOverlay
  })

  const hasChildren = node.children && node.children.length > 0
  const isFolder = hasChildren
  const showIcon = isFolder || !!node.icon

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    paddingLeft: `${(hasChildren ? 4 : 8) + node.depth * INDENT_PX}px`,
    opacity: isDragging ? 0.4 : 1
  }

  if (isOverlay) {
    return (
      <div className="gba:flex gba:items-center gba:gap-1.5 gba:py-1.5 gba:px-3 gba:rounded-lg gba:bg-card-decorative gba:shadow-lg gba:border gba:border-white/10 gba:rotate-1 gba:scale-[1.02] gba:w-56">
        <span className="gba:text-sm gba:font-medium gba:truncate gba:text-white">
          {node.title || t('title-untitled')}
        </span>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`gba:relative gba:flex gba:items-center gba:gap-1 gba:py-1.5 gba:pr-1 gba:rounded-md gba:cursor-pointer gba:group gba:transition-all gba:duration-150 ${
        isSelected
          ? 'gba:bg-white/15 gba:text-white gba:font-medium before:gba:absolute before:gba:left-0 before:gba:top-1 before:gba:bottom-1 before:gba:w-[3px] before:gba:rounded-full before:gba:bg-white'
          : 'gba:text-white/70 hover:gba:bg-white/10 hover:gba:text-white'
      }`}
      onClick={() => onSelect(node.id)}
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={hasChildren ? isExpanded : undefined}
      data-testid={`tree-item-${node.id}`}
    >
      {/* Drag handle -- absolute overlay, visible on hover only */}
      <button
        className="gba:absolute gba:left-0 gba:top-1/2 gba:-translate-y-1/2 gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center gba:rounded gba:opacity-0 group-hover:gba:opacity-50 hover:!gba:opacity-100 gba:cursor-grab gba:transition-opacity gba:z-10"
        {...attributes}
        {...listeners}
        tabIndex={-1}
      >
        <GripVertical className="gba:w-3 gba:h-3" />
      </button>

      {/* Expand/collapse -- only rendered for nodes with children */}
      {hasChildren && (
        <button
          className="gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center gba:rounded hover:gba:bg-white/10 gba:transition-colors gba:flex-shrink-0"
          onClick={e => {
            e.stopPropagation()
            onToggleExpand(node.id)
          }}
          tabIndex={-1}
        >
          {isExpanded ? (
            <ChevronDown className="gba:w-3.5 gba:h-3.5" />
          ) : (
            <ChevronRight className="gba:w-3.5 gba:h-3.5" />
          )}
        </button>
      )}

      {/* Icon -- only for folders or items with custom emoji */}
      {showIcon && (
        <span className="gba:flex-shrink-0 gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center">
          {node.icon ? (
            <span className="gba:text-sm">{node.icon}</span>
          ) : isExpanded ? (
            <FolderOpen className="gba:w-4 gba:h-4 gba:text-white/50" />
          ) : (
            <Folder className="gba:w-4 gba:h-4 gba:text-white/50" />
          )}
        </span>
      )}

      {/* Title */}
      <span className="gba:flex-1 gba:truncate gba:text-[13px] gba:leading-tight">
        {node.title || t('title-untitled')}
      </span>

      {/* Pin indicator */}
      {node.isPinned && <Pin className="gba:w-3 gba:h-3 gba:text-white/50 gba:fill-current gba:flex-shrink-0" />}

      {/* Context menu -- faintly visible at rest */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="gba:w-6 gba:h-6 gba:flex gba:items-center gba:justify-center gba:rounded-md gba:opacity-30 group-hover:gba:opacity-100 hover:gba:bg-white/15 gba:transition-opacity gba:flex-shrink-0"
            onClick={e => e.stopPropagation()}
            tabIndex={-1}
          >
            <MoreHorizontal className="gba:w-4 gba:h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="gba:w-44" onClick={e => e.stopPropagation()}>
          {onCreateChild && (
            <DropdownMenuItem onClick={() => onCreateChild(node.id)}>
              <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('folder-add-note-inside')}
            </DropdownMenuItem>
          )}
          {onRename && (
            <DropdownMenuItem onClick={() => onRename(node.id)}>
              <Edit3 className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('folder-rename')}
            </DropdownMenuItem>
          )}
          {onTogglePin && (
            <DropdownMenuItem onClick={() => onTogglePin(node.id)}>
              {node.isPinned ? (
                <>
                  <PinOff className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('menu-unpin')}
                </>
              ) : (
                <>
                  <Pin className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('menu-pin')}
                </>
              )}
            </DropdownMenuItem>
          )}
          {onMove && (
            <DropdownMenuItem onClick={() => onMove(node.id)}>
              <FolderInput className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('folder-move-to')}
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(node.id)}
                className="gba:text-destructive focus:gba:text-destructive"
              >
                <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('menu-delete')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
