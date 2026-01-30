/**
 * AddContentDialog - Dialog for adding content to a space
 *
 * Clean, professional dialog with server-side search
 * Following NEWWORK design system
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Checkbox,
  Badge
} from '@newwork/nw-design-system'
import { FileText, Table2, StickyNote, Search, Loader2, FolderOpen } from 'lucide-react'
import { useAvailableContent, type AvailableContentItem } from '../hooks/useAvailableContent'
import { formatDistanceToNow } from 'date-fns'

export interface AddContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddContent: (items: { type: 'document' | 'note' | 'spreadsheet'; id: string }[]) => Promise<void>
  spaceId: string
  'data-testid'?: string
}

type ContentTab = 'documents' | 'notes' | 'spreadsheets'
type ContentType = 'document' | 'note' | 'spreadsheet'

const tabs: { key: ContentTab; type: ContentType; label: string; icon: typeof FileText }[] = [
  { key: 'documents', type: 'document', label: 'Documents', icon: FileText },
  { key: 'notes', type: 'note', label: 'Notes', icon: StickyNote },
  { key: 'spreadsheets', type: 'spreadsheet', label: 'Spreadsheets', icon: Table2 }
]

export const AddContentDialog: React.FC<AddContentDialogProps> = ({
  open,
  onOpenChange,
  onAddContent,
  spaceId,
  'data-testid': testId = 'add-content-dialog'
}) => {
  const [activeTab, setActiveTab] = useState<ContentTab>('documents')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Map<string, { type: ContentType; id: string }>>(new Map())
  const [isAdding, setIsAdding] = useState(false)

  const { documents, notes, spreadsheets, isLoading, error, search, refresh } = useAvailableContent(spaceId)

  // Get items for active tab
  const activeItems = useMemo(() => {
    switch (activeTab) {
      case 'documents':
        return documents
      case 'notes':
        return notes
      case 'spreadsheets':
        return spreadsheets
      default:
        return []
    }
  }, [activeTab, documents, notes, spreadsheets])

  // Handle search input change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value
      setSearchQuery(query)
      search(query)
    },
    [search]
  )

  // Toggle item selection
  const toggleItem = useCallback((item: AvailableContentItem) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev)
      const key = `${item.type}-${item.id}`
      if (newMap.has(key)) {
        newMap.delete(key)
      } else {
        // Store with the correct singular type
        newMap.set(key, { type: item.type as ContentType, id: item.id })
      }
      return newMap
    })
  }, [])

  // Check if item is selected
  const isSelected = useCallback(
    (item: AvailableContentItem) => selectedItems.has(`${item.type}-${item.id}`),
    [selectedItems]
  )

  // Handle add
  const handleAdd = useCallback(async () => {
    if (selectedItems.size === 0) return

    setIsAdding(true)
    try {
      // Items are already stored with correct type ('document', 'note', 'spreadsheet')
      const items = Array.from(selectedItems.values())
      await onAddContent(items)
      setSelectedItems(new Map())
      onOpenChange(false)
    } finally {
      setIsAdding(false)
    }
  }, [selectedItems, onAddContent, onOpenChange])

  // Reset on close
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setSelectedItems(new Map())
        setSearchQuery('')
        setActiveTab('documents')
      }
      onOpenChange(newOpen)
    },
    [onOpenChange]
  )

  const getItemName = (item: AvailableContentItem) => item.title || item.name || 'Untitled'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gba:max-w-2xl gba:p-0 gba:overflow-hidden gba:max-h-[85vh]" data-testid={testId}>
        {/* Header */}
        <DialogHeader className="gba:p-6 gba:pb-4">
          <DialogTitle className="gba:text-lg gba:font-semibold">Add Content</DialogTitle>
          <DialogDescription className="gba:text-sm gba:text-muted-foreground">
            Select your content to add to this space
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="gba:px-6 gba:pb-4">
          <div className="gba:relative">
            <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="gba:pl-9 gba:h-10"
              data-testid={`${testId}-search`}
            />
            {isLoading && searchQuery && (
              <Loader2 className="gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:animate-spin gba:text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="gba:px-6 gba:flex gba:gap-1 gba:border-b gba:border-border">
          {tabs.map(({ key, label, icon: Icon }) => {
            const count = key === 'documents' ? documents.length : key === 'notes' ? notes.length : spreadsheets.length
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-3 gba:text-sm gba:font-medium gba:border-b-2 gba:transition-colors gba:-mb-px ${
                  activeTab === key
                    ? 'gba:border-primary gba:text-foreground'
                    : 'gba:border-transparent gba:text-muted-foreground hover:gba:text-foreground'
                }`}
                data-testid={`${testId}-tab-${key}`}
              >
                <Icon className="gba:w-4 gba:h-4" />
                {label}
                <Badge variant="secondary" className="gba:text-xs gba:px-1.5 gba:py-0 gba:min-w-[20px]">
                  {count}
                </Badge>
              </button>
            )
          })}
        </div>

        {/* Content List */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:p-4 gba:max-h-[400px]">
          {isLoading && !searchQuery ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
              <Loader2 className="gba:w-6 gba:h-6 gba:animate-spin gba:text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="gba:text-center gba:py-12">
              <p className="gba:text-sm gba:text-destructive gba:mb-4">{error}</p>
              <Button variant="secondary" size="sm" onClick={refresh}>
                Try Again
              </Button>
            </div>
          ) : activeItems.length === 0 ? (
            <div className="gba:text-center gba:py-12">
              <FolderOpen className="gba:w-10 gba:h-10 gba:text-muted-foreground/40 gba:mx-auto gba:mb-3" />
              <p className="gba:text-sm gba:text-muted-foreground">
                {searchQuery ? 'No matching content found' : `No ${activeTab} available to add`}
              </p>
              <p className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1">
                Only content you own can be added to a space
              </p>
            </div>
          ) : (
            <div className="gba:space-y-1">
              {activeItems.map(item => {
                const Icon = item.type === 'document' ? FileText : item.type === 'note' ? StickyNote : Table2
                const selected = isSelected(item)

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className={`gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:cursor-pointer gba:transition-colors ${
                      selected ? 'gba:bg-primary/5 gba:ring-1 gba:ring-primary/20' : 'hover:gba:bg-muted/50'
                    }`}
                    data-testid={`${testId}-item-${item.id}`}
                  >
                    <Checkbox checked={selected} className="gba:pointer-events-none" />
                    <div className="gba:w-9 gba:h-9 gba:rounded-md gba:bg-muted gba:flex gba:items-center gba:justify-center">
                      <Icon className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                    </div>
                    <div className="gba:flex-1 gba:min-w-0">
                      <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                        {getItemName(item)}
                      </p>
                      <p className="gba:text-xs gba:text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="gba:border-t gba:border-border gba:p-4 gba:flex gba:items-center gba:justify-between gba:bg-card">
          <p className="gba:text-sm gba:text-muted-foreground">
            {selectedItems.size > 0
              ? `${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''} selected`
              : 'Select items to add'}
          </p>
          <div className="gba:flex gba:gap-2">
            <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={isAdding}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={selectedItems.size === 0 || isAdding}
              data-testid={`${testId}-add-button`}
            >
              {isAdding ? <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" /> : 'Add to Space'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AddContentDialog
