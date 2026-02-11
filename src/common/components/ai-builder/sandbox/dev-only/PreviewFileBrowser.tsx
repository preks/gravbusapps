/**
 * Preview File Browser (Development Only)
 *
 * Debug panel showing all files loaded from the /previews endpoint
 */

import React, { useState, useMemo } from 'react'
import { X, ChevronRight, ChevronDown, File, Folder } from 'lucide-react'
import { Button } from '@newwork/nw-design-system'

interface PreviewFileBrowserProps {
  files: Map<string, string>
  onClose: () => void
}

interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileNode[]
  size?: number
}

export const PreviewFileBrowser: React.FC<PreviewFileBrowserProps> = ({ files, onClose }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']))
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  // Build tree structure from flat file list
  const fileTree = useMemo(() => {
    const root: FileNode = { name: '', path: '', type: 'folder', children: [] }

    Array.from(files.keys()).forEach(filePath => {
      const parts = filePath.split('/').filter(Boolean)
      let currentNode = root

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1
        const path = parts.slice(0, index + 1).join('/')

        currentNode.children ??= []

        let childNode = currentNode.children.find(child => child.name === part)

        if (!childNode) {
          childNode = {
            name: part,
            path,
            type: isFile ? 'file' : 'folder',
            children: isFile ? undefined : [],
            size: isFile ? files.get(filePath)?.length : undefined
          }
          currentNode.children.push(childNode)
        }

        if (!isFile) {
          currentNode = childNode
        }
      })
    })

    // Sort folders first, then files, both alphabetically
    const sortNodes = (nodes: FileNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
      nodes.forEach(node => {
        if (node.children) {
          sortNodes(node.children)
        }
      })
    }

    if (root.children) {
      sortNodes(root.children)
    }

    return root
  }, [files])

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const formatSize = (bytes: number | undefined) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const renderNode = (node: FileNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.path)
    const isSelected = selectedFile === node.path

    return (
      <div key={node.path}>
        <div
          role="button"
          tabIndex={0}
          className={`gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1 gba:cursor-pointer hover:gba:bg-muted/50 ${
            isSelected ? 'gba:bg-primary/10' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.path)
            } else {
              setSelectedFile(node.path)
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (node.type === 'folder') {
                toggleFolder(node.path)
              } else {
                setSelectedFile(node.path)
              }
            }
          }}
        >
          {node.type === 'folder' ? (
            <>
              {isExpanded ? (
                <ChevronDown className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
              ) : (
                <ChevronRight className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
              )}
              <Folder className="gba:w-4 gba:h-4 gba:text-primary" />
            </>
          ) : (
            <>
              <div className="gba:w-4" />
              <File className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
            </>
          )}
          <span className="gba:text-sm gba:flex-1 gba:truncate">{node.name}</span>
          {node.type === 'file' && node.size !== undefined && (
            <span className="gba:text-xs gba:text-muted-foreground">{formatSize(node.size)}</span>
          )}
        </div>

        {node.type === 'folder' && isExpanded && node.children && (
          <div>{node.children.map(child => renderNode(child, level + 1))}</div>
        )}
      </div>
    )
  }

  const selectedContent = selectedFile ? files.get(selectedFile) : null

  return (
    <div className="gba:fixed gba:inset-0 gba:z-50 gba:flex gba:items-center gba:justify-center gba:bg-black/50">
      <div className="gba:bg-card gba:border gba:border-border gba:rounded-lg gba:shadow-lg gba:w-[90vw] gba:h-[90vh] gba:flex gba:flex-col">
        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:border-border">
          <div>
            <h3 className="gba:text-lg gba:font-semibold">Preview Files Debug</h3>
            <p className="gba:text-sm gba:text-muted-foreground">{files.size} files loaded from /previews endpoint</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="gba:w-4 gba:h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="gba:flex gba:flex-1 gba:overflow-hidden">
          {/* File Tree */}
          <div className="gba:w-1/3 gba:border-r gba:border-border gba:overflow-y-auto">
            <div className="gba:py-2">{fileTree.children?.map(node => renderNode(node))}</div>
          </div>

          {/* File Content */}
          <div className="gba:flex-1 gba:overflow-y-auto gba:p-4">
            {selectedContent ? (
              <pre className="gba:text-xs gba:font-mono gba:whitespace-pre-wrap gba:break-words">{selectedContent}</pre>
            ) : (
              <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground">
                Select a file to view its content
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
