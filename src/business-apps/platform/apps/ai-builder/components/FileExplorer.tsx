import React, { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, RefreshCw, Search, X } from 'lucide-react'
import { Button } from '@newwork/nw-design-system'
import { ENV } from '../config/environment'

interface TreeNode {
  type: 'file' | 'directory'
  name: string
  path: string
  modified?: boolean
  children?: Record<string, TreeNode>
}

interface FileExplorerProps {
  repoId: string
  sessionId: string
  onFileClick?: (path: string) => void
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ repoId, sessionId, onFileClick }) => {
  const [tree, setTree] = useState<TreeNode | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const loadTree = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${ENV.AI_SERVICE_API_URL}/api/tools/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'get_repository_explorer',
          args: { path: '.', max_depth: 15 },
          repoId,
          sessionId
        })
      })
      const data = await response.json()
      if (data.success && data.tree) {
        setTree(data.tree)
        // Auto-expand root level
        if (data.tree.children) {
          const rootPaths = Object.values(data.tree.children as Record<string, TreeNode>).map(
            (node: TreeNode) => node.path
          )
          setExpanded(new Set(rootPaths))
        }
      }
    } catch {
      // Failed to load file tree, silent failure
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTree()
  }, [repoId, sessionId])

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpanded(newExpanded)
  }

  const expandAll = () => {
    if (!tree?.children) return
    const allPaths = new Set<string>()

    const collectPaths = (node: TreeNode) => {
      if (node.type === 'directory' && node.path) {
        allPaths.add(node.path)
      }
      if (node.children) {
        Object.values(node.children).forEach(collectPaths)
      }
    }

    Object.values(tree.children).forEach(collectPaths)
    setExpanded(allPaths)
  }

  const collapseAll = () => {
    setExpanded(new Set())
  }

  const matchesSearch = (node: TreeNode): boolean => {
    if (!search) return true
    const searchLower = search.toLowerCase()

    // Check if node name matches
    if (node.name.toLowerCase().includes(searchLower)) return true

    // Check if any children match
    if (node.children) {
      return Object.values(node.children).some(matchesSearch)
    }

    return false
  }

  const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode | null => {
    if (!matchesSearch(node)) return null

    const isExpanded = expanded.has(node.path)
    const hasChildren = node.children && Object.keys(node.children).length > 0

    return (
      <div key={node.path}>
        <div
          className={`gba:flex gba:items-center gba:gap-2 gba:py-1 gba:px-2 gba:cursor-pointer gba:hover:bg-accent gba:rounded gba:transition-colors ${node.modified ? 'gba:bg-warning/10' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleExpand(node.path)
            } else {
              onFileClick?.(node.path)
            }
          }}
        >
          {node.type === 'directory' &&
            hasChildren &&
            (isExpanded ? (
              <ChevronDown size={16} className="gba:text-muted-foreground gba:flex-shrink-0" />
            ) : (
              <ChevronRight size={16} className="gba:text-muted-foreground gba:flex-shrink-0" />
            ))}

          {node.type === 'directory' && !hasChildren && <span className="gba:w-4 gba:flex-shrink-0" />}

          {node.type === 'directory' ? (
            isExpanded ? (
              <FolderOpen size={16} className="gba:text-primary gba:flex-shrink-0" />
            ) : (
              <Folder size={16} className="gba:text-primary gba:flex-shrink-0" />
            )
          ) : (
            <File size={16} className="gba:text-muted-foreground gba:flex-shrink-0" />
          )}

          <span
            className={`gba:text-sm gba:truncate ${node.modified ? 'gba:text-warning gba:font-semibold' : 'gba:text-foreground'}`}
          >
            {node.name}
          </span>

          {node.modified && (
            <span className="gba:text-warning gba:text-xs gba:font-bold gba:ml-auto gba:flex-shrink-0">●</span>
          )}
        </div>

        {node.type === 'directory' && isExpanded && node.children && (
          <div>
            {Object.values(node.children)
              .sort((a, b) => {
                // Directories first, then files
                if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
                return a.name.localeCompare(b.name)
              })
              .map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-card">
      {/* Toolbar */}
      <div className="gba:p-4 gba:border-b gba:border-border">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
          <h3 className="gba:text-sm gba:font-semibold gba:flex-1">Files</h3>
          <Button size="sm" variant="ghost" onClick={loadTree} disabled={loading} className="gba:h-8 gba:w-8 gba:p-0">
            <RefreshCw size={16} className={loading ? 'gba:animate-spin' : ''} />
          </Button>
        </div>

        {/* Search */}
        <div className="gba:relative gba:mb-2">
          <Search
            size={14}
            className="gba:absolute gba:left-3 gba:top-2.5 gba:text-muted-foreground gba:pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="gba:w-full gba:pl-9 gba:pr-8 gba:py-2 gba:text-sm gba:bg-background gba:border gba:border-border gba:rounded-md gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-primary"
          />
          {search && (
            <X
              size={14}
              className="gba:absolute gba:right-3 gba:top-2.5 gba:cursor-pointer gba:text-muted-foreground gba:hover:text-foreground"
              onClick={() => setSearch('')}
            />
          )}
        </div>

        {/* Expand/Collapse buttons */}
        <div className="gba:flex gba:gap-2">
          <Button size="sm" variant="ghost" onClick={expandAll} className="gba:text-xs gba:h-7 gba:flex-1">
            Expand All
          </Button>
          <Button size="sm" variant="ghost" onClick={collapseAll} className="gba:text-xs gba:h-7 gba:flex-1">
            Collapse All
          </Button>
        </div>
      </div>

      {/* Tree */}
      <div className="gba:flex-1 gba:overflow-auto gba:text-sm">
        {loading && !tree ? (
          <div className="gba:p-4 gba:text-center gba:text-muted-foreground gba:text-sm">Loading files...</div>
        ) : tree?.children ? (
          <div className="gba:p-2">
            {Object.values(tree.children)
              .sort((a, b) => {
                // Directories first, then files
                if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
                return a.name.localeCompare(b.name)
              })
              .map(node => renderNode(node))}
          </div>
        ) : (
          <div className="gba:p-4 gba:text-center gba:text-muted-foreground gba:text-sm">No files found</div>
        )}
      </div>

      {/* Legend */}
      <div className="gba:p-3 gba:border-t gba:border-border gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
        <span className="gba:text-warning gba:font-bold">●</span>
        <span>Modified in session</span>
      </div>
    </div>
  )
}
