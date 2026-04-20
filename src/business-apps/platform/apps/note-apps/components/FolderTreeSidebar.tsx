/**
 * FolderTreeSidebar Component
 *
 * A collapsible sidebar showing the hierarchical folder structure.
 * Supports drag-and-drop reordering and expansion/collapse of folders.
 */

import React, { useState, useCallback } from 'react'
import {
  Button,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit3,
  FolderInput,
  Pin,
  Star,
  Archive,
  Settings,
  PanelLeftClose
} from 'lucide-react'
import type { NoteTreeNode, NoteColor } from '../types'
import translations from '../_i18n'

export interface FolderTreeSidebarProps {
  tree: NoteTreeNode[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onCreateNote?: (options?: { parentId?: string; color?: NoteColor }) => void
  onRename?: (id: string) => void
  onDelete?: (id: string) => void
  onMove?: (id: string) => void
  onCollapse?: () => void
  'data-testid'?: string
}

interface TreeNodeProps {
  node: NoteTreeNode
  selectedId: string | null
  expandedIds: Set<string>
  onSelect: (id: string) => void
  onToggleExpand: (id: string) => void
  onCreateNote?: (parentId: string) => void
  onRename?: (id: string) => void
  onDelete?: (id: string) => void
  onMove?: (id: string) => void
}

const TreeNode: React.FC<TreeNodeProps & { t: (key: string) => string }> = ({
  node,
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand,
  onCreateNote,
  onRename,
  onDelete,
  onMove,
  t
}) => {
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  const hasChildren = node.children && node.children.length > 0
  const isFolder = hasChildren || !node.title // Folders may not have children yet

  const paddingLeft = 12 + node.depth * 16

  const handleClick = () => {
    onSelect(node.id)
  }

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleExpand(node.id)
  }

  return (
    <div>
      <div
        className={`gba:flex gba:items-center gba:gap-1 gba:py-1.5 gba:px-2 gba:rounded-md gba:cursor-pointer gba:group gba:transition-colors ${
          isSelected ? 'gba:bg-primary/10 gba:text-primary' : 'hover:gba:bg-muted gba:text-foreground'
        }`}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick()
          }
        }}
      >
        {/* Expand/Collapse button */}
        <button
          className={`gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center gba:rounded hover:gba:bg-muted-foreground/10 ${
            hasChildren ? 'gba:opacity-100' : 'gba:opacity-0 gba:pointer-events-none'
          }`}
          onClick={handleExpandClick}
        >
          {isExpanded ? <ChevronDown className="gba:w-4 gba:h-4" /> : <ChevronRight className="gba:w-4 gba:h-4" />}
        </button>

        {/* Icon */}
        <span className="gba:flex-shrink-0">
          {node.icon ? (
            <span className="gba:text-base">{node.icon}</span>
          ) : isFolder ? (
            isExpanded ? (
              <FolderOpen className="gba:w-4 gba:h-4 gba:text-amber-500" />
            ) : (
              <Folder className="gba:w-4 gba:h-4 gba:text-amber-500" />
            )
          ) : (
            <FileText className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
          )}
        </span>

        {/* Title */}
        <span className="gba:flex-1 gba:truncate gba:text-sm">{node.title || t('title-untitled')}</span>

        {/* Pin indicator */}
        {node.isPinned && <Pin className="gba:w-3 gba:h-3 gba:text-warning gba:fill-current" />}

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="gba:w-6 gba:h-6 gba:flex gba:items-center gba:justify-center gba:rounded gba:opacity-0 group-hover:gba:opacity-100 hover:gba:bg-muted-foreground/10 gba:transition-opacity"
              onClick={e => e.stopPropagation()}
            >
              <MoreHorizontal className="gba:w-4 gba:h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
            {onCreateNote && (
              <DropdownMenuItem onClick={() => onCreateNote(node.id)}>
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
            {onMove && (
              <DropdownMenuItem onClick={() => onMove(node.id)}>
                <FolderInput className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('folder-move-to')}
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={() => onDelete(node.id)} className="gba:text-destructive">
                <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('menu-delete')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onCreateNote={onCreateNote}
              onRename={onRename}
              onDelete={onDelete}
              onMove={onMove}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const FolderTreeSidebar: React.FC<FolderTreeSidebarProps> = ({
  tree,
  selectedId,
  onSelect,
  onCreateNote,
  onRename,
  onDelete,
  onMove,
  onCollapse,
  'data-testid': testId = 'folder-tree-sidebar'
}) => {
  const { t } = useTranslation(translations)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id)
    },
    [onSelect]
  )

  const handleAllNotes = useCallback(() => {
    onSelect(null)
  }, [onSelect])

  return (
    <div className="gba:w-64 gba:flex-shrink-0 gba:border-r gba:bg-card gba:flex gba:flex-col" data-testid={testId}>
      {/* Header */}
      <div className="gba:p-3 gba:border-b gba:flex gba:items-center gba:justify-between">
        <h2 className="gba:font-semibold gba:text-sm gba:text-foreground">{t('folder-folders')}</h2>
        <div className="gba:flex gba:items-center gba:gap-1">
          {onCreateNote && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="gba:h-7 gba:w-7" onClick={() => onCreateNote()}>
                    <Plus className="gba:w-4 gba:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('folder-new-note')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {onCollapse && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="gba:h-7 gba:w-7" onClick={onCollapse}>
                    <PanelLeftClose className="gba:w-4 gba:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('folder-collapse-sidebar')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Quick Access */}
      <div className="gba:p-2 gba:border-b">
        <div
          className={`gba:flex gba:items-center gba:gap-2 gba:py-1.5 gba:px-3 gba:rounded-md gba:cursor-pointer gba:transition-colors ${
            selectedId === null ? 'gba:bg-primary/10 gba:text-primary' : 'hover:gba:bg-muted gba:text-foreground'
          }`}
          onClick={handleAllNotes}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleAllNotes()
            }
          }}
        >
          <FileText className="gba:w-4 gba:h-4" />
          <span className="gba:text-sm gba:font-medium">{t('folder-all-notes')}</span>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2 gba:py-1.5 gba:px-3 gba:rounded-md gba:cursor-pointer hover:gba:bg-muted gba:text-muted-foreground gba:transition-colors">
          <Star className="gba:w-4 gba:h-4" />
          <span className="gba:text-sm">{t('folder-favorites')}</span>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2 gba:py-1.5 gba:px-3 gba:rounded-md gba:cursor-pointer hover:gba:bg-muted gba:text-muted-foreground gba:transition-colors">
          <Archive className="gba:w-4 gba:h-4" />
          <span className="gba:text-sm">{t('folder-archive')}</span>
        </div>
      </div>

      {/* Tree */}
      <ScrollArea className="gba:flex-1">
        <div className="gba:p-2">
          {tree.length === 0 ? (
            <div className="gba:text-center gba:py-8 gba:text-muted-foreground gba:text-sm">
              <Folder className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-2 gba:text-muted-foreground/50" />
              <p>{t('folder-no-folders')}</p>
              <p className="gba:text-xs gba:mt-1">{t('folder-create-to-start')}</p>
            </div>
          ) : (
            tree.map(node => (
              <TreeNode
                key={node.id}
                node={node}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onSelect={handleSelect}
                onToggleExpand={handleToggleExpand}
                onCreateNote={onCreateNote ? parentId => onCreateNote({ parentId }) : undefined}
                onRename={onRename}
                onDelete={onDelete}
                onMove={onMove}
                t={t}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="gba:p-2 gba:border-t">
        <Button variant="ghost" size="sm" className="gba:w-full gba:justify-start gba:text-muted-foreground">
          <Settings className="gba:w-4 gba:h-4 gba:mr-2" />
          {t('folder-settings')}
        </Button>
      </div>
    </div>
  )
}

export default FolderTreeSidebar
