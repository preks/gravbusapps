import React, { useMemo } from 'react'
import {
  Button,
  Input,
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
import { Plus, Search, PanelLeftClose, FileText, PenTool, Sparkles, FolderPlus } from 'lucide-react'
import { NoteTreeQuickAccess, type QuickAccessSection } from './NoteTreeQuickAccess'
import { SortableNoteTree } from './SortableNoteTree'
import type { NoteTreeNode } from '../types'
import type { UseNoteTreeDragDropReturn } from '../hooks/useNoteTreeDragDrop'
import translations from '../_i18n'
import '../note-editor.css'

export interface NoteTreeSidebarProps {
  width: number
  isResizing: boolean
  tree: NoteTreeNode[]
  expandedIds: Set<string>
  selectedId: string | null
  isLoadingTree: boolean
  activeQuickAccess: QuickAccessSection | null
  quickAccessCounts?: Partial<Record<QuickAccessSection, number>>
  searchQuery: string
  dragDrop: UseNoteTreeDragDropReturn
  onSearchChange: (query: string) => void
  onQuickAccessChange: (section: QuickAccessSection) => void
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
}

export const NoteTreeSidebar: React.FC<NoteTreeSidebarProps> = ({
  width,
  isResizing,
  tree,
  expandedIds,
  selectedId,
  isLoadingTree,
  activeQuickAccess,
  quickAccessCounts,
  searchQuery,
  dragDrop,
  onSearchChange,
  onQuickAccessChange,
  onSelectNode,
  onToggleExpand,
  onCreateNote,
  onCreateFolder,
  onRename,
  onMove,
  onDelete,
  onTogglePin,
  onCollapse,
  onResizeStart
}) => {
  const { t } = useTranslation(translations)

  const flatRecentNotes = useMemo(() => {
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
  }, [tree])

  return (
    <aside
      className={`note-sidebar-inter gba:flex-shrink-0 gba:bg-sidebar gba:border-r gba:border-sidebar-border gba:flex gba:flex-col gba:relative gba:select-none ${
        isResizing ? '' : 'gba:transition-[width] gba:duration-200'
      }`}
      style={{ width: `${width}px` }}
      data-testid="note-tree-sidebar"
    >
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:pt-3 gba:pb-2 gba:flex-shrink-0">
        <h2 className="gba:font-display gba:font-semibold gba:text-base gba:text-sidebar-foreground gba:tracking-tight">
          {t('sidebar-brand-title')}
        </h2>
        <div className="gba:flex gba:items-center gba:gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-7 gba:w-7 gba:text-sidebar-foreground"
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
              <DropdownMenuItem onClick={() => onCreateNote({ noteType: 'handwriting' })}>
                <PenTool className="gba:w-4 gba:h-4 gba:mr-2" />
                <div>
                  <div className="gba:font-medium gba:text-sm">{t('menu-new-handwriting-title')}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-handwriting-description')}</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onCreateFolder}>
                <FolderPlus className="gba:w-4 gba:h-4 gba:mr-2" />
                <div>
                  <div className="gba:font-medium gba:text-sm">{t('menu-new-folder-title')}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-folder-description')}</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onCreateNote()}>
                <Sparkles className="gba:w-4 gba:h-4 gba:mr-2" />
                <div>
                  <div className="gba:font-medium gba:text-sm">{t('menu-new-template-title')}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-template-description')}</div>
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
                  className="gba:h-7 gba:w-7 gba:text-sidebar-foreground"
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

      {/* Search */}
      <div className="gba:px-2 gba:pb-1 gba:flex-shrink-0">
        <div className="gba:relative">
          <Search className="gba:absolute gba:left-2.5 gba:top-1/2 gba:-translate-y-1/2 gba:w-3.5 gba:h-3.5 gba:text-muted-foreground/50" />
          <Input
            placeholder={t('header-search-placeholder')}
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="gba:h-8 gba:pl-8 gba:text-xs gba:rounded-lg gba:bg-sidebar-accent/40 gba:border-0 gba:shadow-none focus-visible:gba:ring-1 focus-visible:gba:ring-sidebar-ring"
            data-testid="sidebar-search"
          />
        </div>
      </div>

      {/* Quick access */}
      <NoteTreeQuickAccess
        activeSection={activeQuickAccess}
        onSectionChange={onQuickAccessChange}
        counts={quickAccessCounts}
      />

      {/* Section divider */}
      <div className="gba:mx-3 gba:my-1.5 gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0">
        <div className="gba:flex-1 gba:h-px gba:bg-sidebar-border/60" />
        <span className="gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-widest gba:text-muted-foreground/50 gba:select-none">
          {t('sidebar-section-recent')}
        </span>
        <div className="gba:flex-1 gba:h-px gba:bg-sidebar-border/60" />
      </div>

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
        className="gba:absolute gba:top-0 gba:right-0 gba:w-1 gba:h-full gba:cursor-col-resize hover:gba:bg-sidebar-accent gba:transition-colors gba:z-10"
        onMouseDown={onResizeStart}
        data-testid="sidebar-resize-handle"
      />
    </aside>
  )
}
