/**
 * SpaceFolderSidebar
 *
 * Nested folder navigation for the Space "drive" view.
 * Modern, sleek design with refined visual hierarchy.
 */

import React, { useMemo, useState, useCallback } from 'react'
import {
  Button,
  ScrollArea,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Trash2,
  Edit3,
  FolderTree
} from 'lucide-react'
import type { SpaceFolder } from '../types/space.types'

export interface SpaceFolderSidebarProps {
  folders: SpaceFolder[]
  selectedFolderId: string | null
  canEdit: boolean
  onSelectRoot: () => void
  onSelectFolder: (folderId: string) => void
  onCreateFolder: (parentId?: string) => void
  onRenameFolder: (folderId: string) => void
  onDeleteFolder: (folderId: string) => void
  'data-testid'?: string
}

type FolderNode = SpaceFolder & { children: FolderNode[] }

function sortFolders(a: SpaceFolder, b: SpaceFolder): number {
  if (a.position !== b.position) return a.position - b.position
  return a.name.localeCompare(b.name)
}

const buildTree = (folders: SpaceFolder[]): FolderNode[] => {
  const byId = new Map<string, FolderNode>()
  for (const f of folders) byId.set(f.id, { ...f, children: [] })

  const roots: FolderNode[] = []
  for (const f of byId.values()) {
    const parentId = f.parentId ?? null
    if (!parentId) {
      roots.push(f)
      continue
    }
    const parent = byId.get(parentId)
    if (parent) parent.children.push(f)
    else roots.push(f)
  }

  const sortNode = (node: FolderNode) => {
    node.children.sort(sortFolders)
    node.children.forEach(sortNode)
  }
  roots.sort(sortFolders)
  roots.forEach(sortNode)
  return roots
}

export const SpaceFolderSidebar: React.FC<SpaceFolderSidebarProps> = ({
  folders,
  selectedFolderId,
  canEdit,
  onSelectRoot,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  'data-testid': testId = 'space-folder-sidebar'
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const tree = useMemo(() => buildTree(folders), [folders])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const FolderRow: React.FC<{ node: FolderNode; depth: number }> = ({ node, depth }) => {
    const isExpanded = expandedIds.has(node.id)
    const isSelected = selectedFolderId === node.id
    const hasChildren = node.children.length > 0

    return (
      <div>
        <div
          className={`gba:flex gba:items-center gba:gap-1.5 gba:py-1.5 gba:px-2 gba:rounded-lg gba:cursor-pointer gba:group gba:transition-all gba:duration-150 ${
            isSelected
              ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
              : 'gba:hover:bg-muted/60 gba:text-foreground'
          }`}
          onClick={() => onSelectFolder(node.id)}
          data-testid={`${testId}-folder-${node.id}`}
        >
          {/* Expand */}
          <button
            className={`gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center gba:rounded gba:transition-colors ${
              hasChildren
                ? 'gba:opacity-70 gba:hover:opacity-100 gba:hover:bg-muted'
                : 'gba:opacity-0 gba:pointer-events-none'
            }`}
            onClick={e => {
              e.stopPropagation()
              toggleExpand(node.id)
            }}
            data-testid={`${testId}-folder-expand-${node.id}`}
            type="button"
          >
            {isExpanded ? (
              <ChevronDown className="gba:w-3.5 gba:h-3.5" />
            ) : (
              <ChevronRight className="gba:w-3.5 gba:h-3.5" />
            )}
          </button>

          {/* Icon */}
          <div
            className={`gba:w-6 gba:h-6 gba:rounded-md gba:flex gba:items-center gba:justify-center gba:transition-colors ${
              isSelected ? 'gba:bg-primary/20' : 'gba:bg-warning/10'
            }`}
          >
            {isExpanded ? (
              <FolderOpen className={`gba:w-3.5 gba:h-3.5 ${isSelected ? 'gba:text-primary' : 'gba:text-warning'}`} />
            ) : (
              <Folder className={`gba:w-3.5 gba:h-3.5 ${isSelected ? 'gba:text-primary' : 'gba:text-warning'}`} />
            )}
          </div>

          {/* Name */}
          <span className="gba:flex-1 gba:truncate gba:text-sm">{node.name}</span>

          {/* Actions */}
          {canEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="gba:w-6 gba:h-6 gba:flex gba:items-center gba:justify-center gba:rounded-md gba:opacity-0 gba:group-hover:opacity-100 gba:hover:bg-muted gba:transition-all"
                  onClick={e => e.stopPropagation()}
                  data-testid={`${testId}-folder-actions-${node.id}`}
                  type="button"
                >
                  <MoreHorizontal className="gba:w-3.5 gba:h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="gba:w-44" onClick={e => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={() => onCreateFolder(node.id)}
                  data-testid={`${testId}-folder-add-${node.id}`}
                >
                  <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                  New subfolder
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onRenameFolder(node.id)}
                  data-testid={`${testId}-folder-rename-${node.id}`}
                >
                  <Edit3 className="gba:w-4 gba:h-4 gba:mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gba:text-destructive gba:focus:text-destructive"
                  onClick={() => onDeleteFolder(node.id)}
                  data-testid={`${testId}-folder-delete-${node.id}`}
                >
                  <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {hasChildren && isExpanded && (
          <div className="gba:ml-3 gba:pl-3 gba:border-l gba:border-border/40">
            {node.children.map(child => (
              <FolderRow key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="gba:w-64 gba:flex-shrink-0 gba:border-r gba:border-border/50 gba:bg-muted/30 gba:flex gba:flex-col"
      data-testid={testId}
    >
      {/* Header */}
      <div className="gba:p-4 gba:border-b gba:border-border/50 gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2">
          <FolderTree className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <span className="gba:font-medium gba:text-sm gba:text-foreground">Navigation</span>
        </div>
        {canEdit ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="gba:h-7 gba:w-7"
                  onClick={() => onCreateFolder(undefined)}
                  data-testid={`${testId}-new-folder`}
                >
                  <Plus className="gba:w-4 gba:h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New folder</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>

      {/* Quick access */}
      <div className="gba:p-3 gba:space-y-1">
        <p className="gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:px-2 gba:mb-2">
          Quick access
        </p>
        <button
          onClick={onSelectRoot}
          className={`gba:w-full gba:flex gba:items-center gba:gap-2 gba:py-2 gba:px-2 gba:rounded-lg gba:text-sm gba:transition-all gba:duration-150 ${
            selectedFolderId === null
              ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
              : 'gba:hover:bg-muted/60 gba:text-foreground'
          }`}
          data-testid={`${testId}-root`}
          type="button"
        >
          <div
            className={`gba:w-6 gba:h-6 gba:rounded-md gba:flex gba:items-center gba:justify-center ${
              selectedFolderId === null ? 'gba:bg-primary/20' : 'gba:bg-muted'
            }`}
          >
            <Folder
              className={`gba:w-3.5 gba:h-3.5 ${
                selectedFolderId === null ? 'gba:text-primary' : 'gba:text-muted-foreground'
              }`}
            />
          </div>
          Root
        </button>
      </div>

      {/* Divider */}
      <div className="gba:px-3">
        <div className="gba:border-t gba:border-border/50" />
      </div>

      {/* Tree */}
      <ScrollArea className="gba:flex-1">
        <div className="gba:p-3">
          <p className="gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:px-2 gba:mb-2">
            Folders
          </p>
          {tree.length === 0 ? (
            <div className="gba:text-center gba:py-8 gba:px-4">
              <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-muted/50 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-3">
                <Folder className="gba:w-6 gba:h-6 gba:text-muted-foreground/50" />
              </div>
              <p className="gba:text-sm gba:font-medium gba:text-muted-foreground">No folders yet</p>
              <p className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1">Create one to organize your space</p>
            </div>
          ) : (
            <div className="gba:space-y-0.5">
              {tree.map(node => (
                <FolderRow key={node.id} node={node} depth={0} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default SpaceFolderSidebar
