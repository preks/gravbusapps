import React, { useMemo } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { Plus, PanelLeftClose, FileText, PenTool, FolderPlus } from 'lucide-react'
import { SortableNoteTree } from './SortableNoteTree'
import type { NoteSummary, NoteTreeNode } from '../types'
import type { UseNoteTreeDragDropReturn } from '../hooks/useNoteTreeDragDrop'
import translations from '../_i18n'
import '../note-editor.css'

export interface NoteTreeSidebarProps {
  width: number
  isResizing: boolean
  tree: NoteTreeNode[]
  recentNotes?: NoteSummary[]
  expandedIds: Set<string>
  selectedId: string | null
  isLoadingTree: boolean
  dragDrop: UseNoteTreeDragDropReturn
  onSelectNode: (id: string) => void
  onToggleExpand: (id: string) => void
  onCreateNote: (opts?: { parentId?: string; noteType?: 'text' | 'handwriting' }) => void
  onCreateFolder: () => void
  onRename?: (id: string) => void
  onMove?: (id: string) => void
  onDelete?: (id: string) => void
  onTogglePin?: (id: string) => void
  onCollapse: () => void
  onResizeStart: (e: React.MouseEvent) => void
  handwritingNotesEnabled?: boolean
}

export const NoteTreeSidebar: React.FC<NoteTreeSidebarProps> = ({
  width,
  isResizing,
  tree,
  recentNotes,
  expandedIds,
  selectedId,
  isLoadingTree,
  dragDrop,
  onSelectNode,
  onToggleExpand,
  onCreateNote,
  onCreateFolder,
  onRename,
  onMove,
  onDelete,
  onTogglePin,
  onCollapse,
  onResizeStart,
  handwritingNotesEnabled = true
}) => {
  const { t } = useTranslation(translations)

  const flatRecentNotes = useMemo(() => {
    if (recentNotes) {
      return recentNotes
        .filter(note => note.icon !== '📁')
        .sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        })
        .map(note => ({
          ...note,
          depth: 0,
          children: []
        }))
    }

    const flatten = (nodes: NoteTreeNode[]): NoteTreeNode[] => {
      const result: NoteTreeNode[] = []
      for (const node of nodes) {
        if (node.icon !== '📁') {
          result.push({ ...node, depth: 0, children: [] })
        }
        if (node.children.length > 0) {
          result.push(...flatten(node.children))
        }
      }
      return result
    }
    return flatten(tree).sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [recentNotes, tree])

  return (
    <aside
      className={`note-sidebar-inter gba:flex-shrink-0 gba:bg-muted/30 gba:border-r gba:border-border gba:flex gba:flex-col gba:relative gba:select-none gba:text-foreground ${
        isResizing ? '' : 'gba:transition-[width] gba:duration-200'
      }`}
      style={{ width: `${width}px` }}
      data-testid="note-tree-sidebar"
    >
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:pt-3 gba:pb-2 gba:flex-shrink-0">
        <h2 className="gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-widest gba:text-muted-foreground gba:select-none">
          {t('sidebar-section-recent')}
        </h2>
        <div className="gba:flex gba:items-center gba:gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-7 gba:w-7 gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-muted"
                data-testid="sidebar-new-btn"
              >
                <Plus className="gba:w-4 gba:h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="gba:w-52">
              <DropdownMenuItem onClick={() => onCreateNote()}>
                <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
                <div>
                  <div className="gba:font-medium gba:text-sm">{t('menu-new-text-title')}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-text-description')}</div>
                </div>
              </DropdownMenuItem>
              {handwritingNotesEnabled ? (
                <DropdownMenuItem onClick={() => onCreateNote({ noteType: 'handwriting' })}>
                  <PenTool className="gba:w-4 gba:h-4 gba:mr-2" />
                  <div>
                    <div className="gba:font-medium gba:text-sm">{t('menu-new-handwriting-title')}</div>
                    <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-handwriting-description')}</div>
                  </div>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onCreateFolder}>
                <FolderPlus className="gba:w-4 gba:h-4 gba:mr-2" />
                <div>
                  <div className="gba:font-medium gba:text-sm">{t('menu-new-folder-title')}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-folder-description')}</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="gba:h-7 gba:w-7 gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-muted"
                  onClick={onCollapse}
                >
                  <PanelLeftClose className="gba:w-4 gba:h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{t('sidebar-collapse')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Divider */}
      <div className="gba:mx-3 gba:mb-1.5 gba:h-px gba:bg-border gba:flex-shrink-0" />

      {/* Scrollable flat recent notes list */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:min-h-0">
        <SortableNoteTree
          tree={flatRecentNotes}
          expandedIds={expandedIds}
          selectedId={selectedId}
          isLoading={isLoadingTree}
          dragDrop={dragDrop}
          onSelect={onSelectNode}
          onToggleExpand={onToggleExpand}
          onRename={onRename}
          onMove={onMove}
          onDelete={onDelete}
          onTogglePin={onTogglePin}
        />
      </div>

      {/* Resize handle */}
      <div
        className="gba:absolute gba:top-0 gba:right-0 gba:w-1 gba:h-full gba:cursor-col-resize hover:gba:bg-border gba:transition-colors gba:z-10"
        onMouseDown={onResizeStart}
        data-testid="sidebar-resize-handle"
      />
    </aside>
  )
}
