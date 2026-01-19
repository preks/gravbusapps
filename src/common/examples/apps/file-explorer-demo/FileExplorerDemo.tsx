import React, { useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FileExplorer, type FileExplorerNode, type FileExplorerAction } from '@newwork/nw-design-system'

const createInitialNodes = (): FileExplorerNode[] => {
  const now = new Date()
  return [
    {
      id: 'folder-contracts',
      name: 'Contracts',
      type: 'folder',
      size: 0,
      modified: new Date('2024-01-25T10:00:00Z'),
      parentId: null,
      starred: true,
      metadata: { description: 'Customer and vendor contracts' }
    },
    {
      id: 'file-master-agreement',
      name: 'Master Service Agreement.pdf',
      type: 'file',
      size: 2_048_576,
      modified: new Date('2024-01-24T09:30:00Z'),
      parentId: 'folder-contracts',
      mimeType: 'application/pdf'
    },
    {
      id: 'file-nda',
      name: 'Mutual NDA.docx',
      type: 'file',
      size: 512_000,
      modified: new Date('2024-01-23T12:15:00Z'),
      parentId: 'folder-contracts',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    },
    {
      id: 'folder-marketing',
      name: 'Marketing',
      type: 'folder',
      size: 0,
      modified: new Date('2024-01-22T08:00:00Z'),
      parentId: null,
      metadata: { description: 'Assets and materials' }
    },
    {
      id: 'file-logo',
      name: 'Company Logo.png',
      type: 'file',
      size: 256_000,
      modified: new Date('2024-01-21T16:45:00Z'),
      parentId: 'folder-marketing',
      mimeType: 'image/png'
    },
    {
      id: 'file-press-release',
      name: 'Press Release Q1.txt',
      type: 'file',
      size: 64_000,
      modified: new Date('2024-01-20T14:00:00Z'),
      parentId: 'folder-marketing',
      mimeType: 'text/plain'
    },
    {
      id: 'readme-root',
      name: 'README.md',
      type: 'file',
      size: 8_192,
      modified: now,
      parentId: null,
      mimeType: 'text/markdown'
    }
  ]
}

const FileExplorerDemo: React.FC<BusinessAppContextProps> = () => {
  const [nodes, setNodes] = useState<FileExplorerNode[]>(createInitialNodes())

  const customActions: FileExplorerAction[] = useMemo(
    () => [
      {
        id: 'view',
        label: 'View',
        onClick: node => {
          if (node.type === 'file') {
            // Demo only: open a blank tab with file name in URL for visual feedback
            const url = `about:blank#${encodeURIComponent(node.name)}`
            window.open(url, '_blank')
          }
        }
      },
      {
        id: 'rename',
        label: 'Rename',
        onClick: node => {
          const newName = window.prompt('Rename item', node.name)
          if (newName && newName.trim() && newName !== node.name) {
            setNodes(prev =>
              prev.map(n => (n.id === node.id ? { ...n, name: newName.trim(), modified: new Date() } : n))
            )
          }
        }
      },
      {
        id: 'delete',
        label: 'Delete',
        destructive: true,
        onClick: node => {
          const confirm = window.confirm(`Delete "${node.name}"?`)
          if (!confirm) return
          const toRemove = new Set<string>()
          const collect = (id: string) => {
            toRemove.add(id)
            nodes.filter(n => n.parentId === id).forEach(child => collect(child.id))
          }
          collect(node.id)
          setNodes(prev => prev.filter(n => !toRemove.has(n.id)))
        }
      }
    ],
    [nodes]
  )

  const handleNodesChange = (updated: FileExplorerNode[]) => {
    setNodes(updated)
  }

  const handleSelectionChange = () => {
    // Selection can be handled here if needed for external state
  }

  const handleFileUpload = (files: File[], parentId: string | null) => {
    const timestamp = Date.now()
    const newItems: FileExplorerNode[] = files.map((file, index) => ({
      id: `upload-${timestamp}-${index}`,
      name: file.name,
      type: 'file',
      size: file.size,
      modified: new Date(),
      parentId: parentId ?? null,
      mimeType: file.type
    }))
    setNodes(prev => [...prev, ...newItems])
  }

  return (
    <div data-testid="file-explorer-demo-container">
      <FileExplorer
        nodes={nodes}
        showSearch
        allowDragDrop
        allowMultiSelect
        showHeader
        title="File Explorer Demo"
        defaultExpanded={['folder-contracts', 'folder-marketing']}
        customActions={customActions}
        allowUpload
        allowCreateFolder
        onNodesChange={handleNodesChange}
        onSelectionChange={handleSelectionChange}
        onFileUpload={handleFileUpload}
        onNodeAction={() => {
          /* actions are handled in customActions onClick */
        }}
        labels={{
          searchPlaceholder: 'Search files and folders...',
          newFolder: 'New Folder',
          uploadFiles: 'Upload Files',
          expandAll: 'Expand All',
          collapseAll: 'Collapse All',
          emptyStateTitle: 'No items',
          emptyStateDescription: 'Create a folder or upload files to get started.'
        }}
      />
    </div>
  )
}

export { FileExplorerDemo }
export default FileExplorerDemo
