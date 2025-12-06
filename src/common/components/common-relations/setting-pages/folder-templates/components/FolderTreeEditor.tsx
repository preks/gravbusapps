import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
  toast
} from '@newwork/nw-design-system'
import { Folder, Plus, Pencil, Trash, ChevronRight, ChevronDown, GripVertical } from 'lucide-react'
import { type FolderNode } from '../types'

export interface FolderTreeEditorProps {
  folders: FolderNode[]
  title: string
  isLoading?: boolean
  isSaving?: boolean
  onSave: (folders: FolderNode[]) => Promise<boolean>
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'folder-tree-editor'

// Helper function for deep cloning folder nodes
const cloneFolder = (folder: FolderNode): FolderNode => structuredClone(folder)

// Helper function to get expand/collapse icon
const getExpandIcon = (hasChildren: boolean, isExpanded: boolean): React.ReactNode => {
  if (!hasChildren) {
    return <div className="gba:w-4 gba:h-4" />
  }
  if (isExpanded) {
    return <ChevronDown className="gba:h-4 gba:w-4" />
  }
  return <ChevronRight className="gba:h-4 gba:w-4" />
}

export const FolderTreeEditor: React.FC<FolderTreeEditorProps> = ({
  folders,
  title,
  isLoading = false,
  isSaving = false,
  onSave,
  prefixDataTestId = DATA_TEST_ID
}) => {
  const [localFolders, setLocalFolders] = useState<FolderNode[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [editDialog, setEditDialog] = useState<{
    open: boolean
    path: number[]
    name: string
    isNew: boolean
  }>({ open: false, path: [], name: '', isNew: false })

  // Drag and drop state
  const [draggedPath, setDraggedPath] = useState<number[] | null>(null)
  const [dropTargetPath, setDropTargetPath] = useState<number[] | null>(null)
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null)
  const dragCounterRef = useRef(0)

  // Sync local state with provided folders
  useEffect(() => {
    setLocalFolders(folders)
    // Expand all folders by default
    const allPaths = new Set<string>()
    const collectPaths = (nodes: FolderNode[], prefix: number[] = []) => {
      nodes.forEach((node, index) => {
        const path = [...prefix, index]
        allPaths.add(path.join('-'))
        if (node.folders.length > 0) {
          collectPaths(node.folders, path)
        }
      })
    }
    collectPaths(folders)
    setExpandedFolders(allPaths)
  }, [folders])

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  // Get folder at a specific path
  const getFolderAtPath = (folderList: FolderNode[], path: number[]): FolderNode | null => {
    if (path.length === 0) return null
    let current = folderList[path[0]]
    for (let i = 1; i < path.length; i++) {
      if (!current?.folders?.[path[i]]) return null
      current = current.folders[path[i]]
    }
    return current
  }

  const updateFolderAtPath = useCallback(
    (folderList: FolderNode[], path: number[], updater: (folder: FolderNode) => FolderNode): FolderNode[] => {
      if (path.length === 0) return folderList

      return folderList.map((folder, index) => {
        if (index !== path[0]) return folder
        if (path.length === 1) return updater(folder)
        return {
          ...folder,
          folders: updateFolderAtPath(folder.folders, path.slice(1), updater)
        }
      })
    },
    []
  )

  const addFolderAtPath = (path: number[], name: string) => {
    const newFolder: FolderNode = { name, folders: [] }

    if (path.length === 0) {
      setLocalFolders([...localFolders, newFolder])
    } else {
      setLocalFolders(
        updateFolderAtPath(localFolders, path, folder => ({
          ...folder,
          folders: [...folder.folders, newFolder]
        }))
      )
      setExpandedFolders(prev => new Set([...prev, path.join('-')]))
    }
  }

  const renameFolderAtPath = (path: number[], newName: string) => {
    setLocalFolders(
      updateFolderAtPath(localFolders, path, folder => ({
        ...folder,
        name: newName
      }))
    )
  }

  const deleteFolderAtPath = (path: number[]) => {
    if (path.length === 1) {
      setLocalFolders(localFolders.filter((_, index) => index !== path[0]))
    } else {
      const parentPath = path.slice(0, -1)
      const childIndex = path[path.length - 1]
      setLocalFolders(
        updateFolderAtPath(localFolders, parentPath, folder => ({
          ...folder,
          folders: folder.folders.filter((_, index) => index !== childIndex)
        }))
      )
    }
  }

  // Check if targetPath is a descendant of sourcePath
  const isDescendant = (sourcePath: number[], targetPath: number[]): boolean => {
    if (targetPath.length <= sourcePath.length) return false
    for (let i = 0; i < sourcePath.length; i++) {
      if (sourcePath[i] !== targetPath[i]) return false
    }
    return true
  }

  // Helper: Remove folder from its current location
  const removeFolderFromTree = useCallback(
    (folderList: FolderNode[], sourcePath: number[]): FolderNode[] => {
      if (sourcePath.length === 1) {
        return folderList.filter((_, index) => index !== sourcePath[0])
      }
      const parentPath = sourcePath.slice(0, -1)
      const childIndex = sourcePath[sourcePath.length - 1]
      return updateFolderAtPath(folderList, parentPath, folder => ({
        ...folder,
        folders: folder.folders.filter((_, index) => index !== childIndex)
      }))
    },
    [updateFolderAtPath]
  )

  // Helper: Insert folder at target position
  const insertFolderAtPosition = useCallback(
    (
      folderList: FolderNode[],
      folderToMove: FolderNode,
      targetPath: number[],
      position: 'before' | 'after' | 'inside'
    ): FolderNode[] => {
      if (position === 'inside') {
        if (targetPath.length === 0) {
          return [...folderList, folderToMove]
        }
        return updateFolderAtPath(folderList, targetPath, folder => ({
          ...folder,
          folders: [...folder.folders, folderToMove]
        }))
      }

      const parentPath = targetPath.slice(0, -1)
      const targetIndex = targetPath[targetPath.length - 1]
      const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex

      if (parentPath.length === 0) {
        return [...folderList.slice(0, insertIndex), folderToMove, ...folderList.slice(insertIndex)]
      }

      return updateFolderAtPath(folderList, parentPath, folder => {
        const newChildren = [...folder.folders]
        newChildren.splice(insertIndex, 0, folderToMove)
        return { ...folder, folders: newChildren }
      })
    },
    [updateFolderAtPath]
  )

  // Move folder from sourcePath to targetPath
  const moveFolderToPath = useCallback(
    (sourcePath: number[], targetPath: number[], position: 'before' | 'after' | 'inside') => {
      const sourceFolder = getFolderAtPath(localFolders, sourcePath)
      if (!sourceFolder) return

      if (sourcePath.join('-') === targetPath.join('-')) return
      if (isDescendant(sourcePath, targetPath)) {
        toast.error('Cannot move a folder into its own subfolder')
        return
      }

      const folderToMove = cloneFolder(sourceFolder)
      let newFolders = removeFolderFromTree(localFolders, sourcePath)

      // Adjust target path if needed after removal
      const adjustedTargetPath = [...targetPath]
      if (sourcePath.length === targetPath.length) {
        const sameParent =
          sourcePath.length === 1 || sourcePath.slice(0, -1).join('-') === targetPath.slice(0, -1).join('-')
        if (sameParent && sourcePath[sourcePath.length - 1] < targetPath[targetPath.length - 1]) {
          adjustedTargetPath[adjustedTargetPath.length - 1]--
        }
      }

      newFolders = insertFolderAtPosition(newFolders, folderToMove, adjustedTargetPath, position)

      if (position === 'inside' && adjustedTargetPath.length > 0) {
        setExpandedFolders(prev => new Set([...prev, adjustedTargetPath.join('-')]))
      }

      setLocalFolders(newFolders)
    },
    [localFolders, removeFolderFromTree, insertFolderAtPosition]
  )

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, path: number[]) => {
    setDraggedPath(path)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', path.join('-'))
  }

  const handleDragEnd = () => {
    setDraggedPath(null)
    setDropTargetPath(null)
    setDropPosition(null)
    dragCounterRef.current = 0
  }

  const handleDragEnter = (e: React.DragEvent, path: number[]) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (draggedPath && draggedPath.join('-') !== path.join('-')) {
      setDropTargetPath(path)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setDropTargetPath(null)
      setDropPosition(null)
    }
  }

  const handleDragOver = (e: React.DragEvent, path: number[]) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedPath || draggedPath.join('-') === path.join('-')) return

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    if (y < height * 0.25) {
      setDropPosition('before')
    } else if (y > height * 0.75) {
      setDropPosition('after')
    } else {
      setDropPosition('inside')
    }

    setDropTargetPath(path)
  }

  const handleDrop = (e: React.DragEvent, targetPath: number[]) => {
    e.preventDefault()
    e.stopPropagation()

    if (draggedPath && dropPosition) {
      moveFolderToPath(draggedPath, targetPath, dropPosition)
    }

    handleDragEnd()
  }

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedPath) {
      const sourceFolder = getFolderAtPath(localFolders, draggedPath)
      if (sourceFolder) {
        let newFolders = removeFolderFromTree(localFolders, draggedPath)
        newFolders = [...newFolders, cloneFolder(sourceFolder)]
        setLocalFolders(newFolders)
      }
    }
    handleDragEnd()
  }

  const handleSave = async () => {
    const success = await onSave(localFolders)
    if (success) {
      toast.success('Folder template saved successfully')
    } else {
      toast.error('Failed to save folder template')
    }
  }

  const handleDialogSubmit = () => {
    if (editDialog.name.trim()) {
      if (editDialog.isNew) {
        addFolderAtPath(editDialog.path, editDialog.name.trim())
      } else {
        renameFolderAtPath(editDialog.path, editDialog.name.trim())
      }
      setEditDialog(prev => ({ ...prev, open: false }))
    }
  }

  const handleDeleteClick = (path: number[], folderName: string) => {
    const folder = getFolderAtPath(localFolders, path)
    const hasChildren = folder && folder.folders.length > 0

    if (hasChildren) {
      if (confirm(`Delete "${folderName}" and all its subfolders?`)) {
        deleteFolderAtPath(path)
      }
    } else {
      deleteFolderAtPath(path)
    }
  }

  const renderFolder = (folder: FolderNode, path: number[], depth: number = 0) => {
    const pathKey = path.join('-')
    const isExpanded = expandedFolders.has(pathKey)
    const hasChildren = folder.folders.length > 0
    const isDragging = draggedPath?.join('-') === pathKey
    const isDropTarget = dropTargetPath?.join('-') === pathKey

    let dropIndicatorClass = ''
    if (isDropTarget && dropPosition) {
      if (dropPosition === 'before') {
        dropIndicatorClass = 'gba:border-t-2 gba:border-t-primary'
      } else if (dropPosition === 'after') {
        dropIndicatorClass = 'gba:border-b-2 gba:border-b-primary'
      } else if (dropPosition === 'inside') {
        dropIndicatorClass = 'gba:bg-primary/10 gba:ring-2 gba:ring-primary gba:ring-inset'
      }
    }

    return (
      <li key={pathKey} data-testid={`${prefixDataTestId}-folder-${pathKey}`} className="gba:list-none">
        <button
          type="button"
          className={`gba:w-full gba:flex gba:items-center gba:gap-2 gba:py-2 gba:px-3 gba:rounded-md hover:gba:bg-muted gba:cursor-grab gba:transition-all gba:text-left gba:bg-transparent gba:border-0 ${
            isDragging ? 'gba:opacity-50' : ''
          } ${dropIndicatorClass}`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          draggable
          onDragStart={e => handleDragStart(e, path)}
          onDragEnd={handleDragEnd}
          onDragEnter={e => handleDragEnter(e, path)}
          onDragLeave={handleDragLeave}
          onDragOver={e => handleDragOver(e, path)}
          onDrop={e => handleDrop(e, path)}
          onClick={() => toggleFolder(pathKey)}
        >
          <GripVertical className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:cursor-grab" />

          <span
            className="gba:p-0.5 gba:rounded hover:gba:bg-accent"
            data-testid={`${prefixDataTestId}-toggle-${pathKey}`}
          >
            {getExpandIcon(hasChildren, isExpanded)}
          </span>

          <Folder className="gba:h-4 gba:w-4 gba:text-warning" />
          <span className="gba:flex-1 gba:text-sm gba:font-medium">{folder.name}</span>

          <span className="gba:flex gba:gap-1" onClick={e => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-7 gba:w-7"
              onClick={e => {
                e.stopPropagation()
                setEditDialog({ open: true, path, name: '', isNew: true })
              }}
              data-testid={`${prefixDataTestId}-add-subfolder-${pathKey}`}
              title="Add subfolder"
            >
              <Plus className="gba:h-3.5 gba:w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-7 gba:w-7"
              onClick={e => {
                e.stopPropagation()
                setEditDialog({ open: true, path, name: folder.name, isNew: false })
              }}
              data-testid={`${prefixDataTestId}-rename-${pathKey}`}
              title="Rename"
            >
              <Pencil className="gba:h-3.5 gba:w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-7 gba:w-7 gba:text-destructive hover:gba:bg-destructive/10"
              onClick={e => {
                e.stopPropagation()
                handleDeleteClick(path, folder.name)
              }}
              data-testid={`${prefixDataTestId}-delete-${pathKey}`}
              title="Delete"
            >
              <Trash className="gba:h-3.5 gba:w-3.5" />
            </Button>
          </span>
        </button>

        {isExpanded && hasChildren && (
          <ul className="gba:list-none gba:p-0 gba:m-0">
            {folder.folders.map((child, index) => renderFolder(child, [...path, index], depth + 1))}
          </ul>
        )}
      </li>
    )
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-12" data-testid={prefixDataTestId}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={prefixDataTestId}>
      <Card>
        <CardHeader className="gba:pb-3">
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:text-base">{title}</CardTitle>
            <div className="gba:flex gba:gap-2">
              {localFolders.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('Clear all folders? This cannot be undone until you save.')) {
                      setLocalFolders([])
                    }
                  }}
                  data-testid={`${prefixDataTestId}-clear-all`}
                  className="gba:text-destructive hover:gba:bg-destructive/10"
                >
                  <Trash className="gba:h-4 gba:w-4 gba:mr-2" />
                  Clear All
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialog({ open: true, path: [], name: '', isNew: true })}
                data-testid={`${prefixDataTestId}-add-root-folder`}
              >
                <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
                Add Folder
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {localFolders.length === 0 ? (
            <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
              <Folder className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-3 gba:opacity-50" />
              <p className="gba:text-sm">No folders configured</p>
              <p className="gba:text-xs gba:mt-1">Click &quot;Add Folder&quot; to create a folder structure</p>
            </div>
          ) : (
            <ul
              className={`gba:list-none gba:p-0 gba:m-0 gba:border gba:rounded-lg gba:divide-y ${
                draggedPath ? 'gba:border-dashed gba:border-primary/50' : ''
              }`}
              onDragOver={e => e.preventDefault()}
              onDrop={handleRootDrop}
            >
              {localFolders.map((folder, index) => renderFolder(folder, [index], 0))}

              {draggedPath && (
                <li className="gba:list-none">
                  <button
                    type="button"
                    className="gba:w-full gba:h-8 gba:flex gba:items-center gba:justify-center gba:text-xs gba:text-muted-foreground gba:border-t gba:border-dashed hover:gba:bg-primary/10 gba:bg-transparent gba:border-0 gba:border-t gba:cursor-pointer"
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleRootDrop}
                  >
                    Drop here to move to root level
                  </button>
                </li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="gba:flex gba:justify-end">
        <Button onClick={handleSave} disabled={isSaving} data-testid={`${prefixDataTestId}-save-button`}>
          {isSaving ? <Spinner size="sm" className="gba:mr-2" /> : null}
          Save Configuration
        </Button>
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={editDialog.open} onOpenChange={open => !open && setEditDialog(prev => ({ ...prev, open: false }))}>
        <DialogContent data-testid={`${prefixDataTestId}-edit-dialog`}>
          <DialogHeader>
            <DialogTitle>{editDialog.isNew ? 'Add Folder' : 'Rename Folder'}</DialogTitle>
          </DialogHeader>
          <div className="gba:py-4">
            <Input
              placeholder="Folder name"
              value={editDialog.name}
              onChange={e => setEditDialog(prev => ({ ...prev, name: e.target.value }))}
              data-testid={`${prefixDataTestId}-folder-name-input`}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleDialogSubmit()
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(prev => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button onClick={handleDialogSubmit} disabled={!editDialog.name.trim()}>
              {editDialog.isNew ? 'Add' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FolderTreeEditor
