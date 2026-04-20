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
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import { FileText, Table2, StickyNote, Search, Loader2, FolderOpen } from 'lucide-react'
import { useAvailableContent, type AvailableContentItem } from '../hooks/useAvailableContent'
import translations from '../_i18n'
import { formatLocalizedDistance } from '../utils/spaceLocalization'

export interface AddContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddContent: (items: { type: 'document' | 'note' | 'spreadsheet'; id: string }[]) => Promise<void>
  spaceId: string
  accessToken?: string
  'data-testid'?: string
}

type ContentTab = 'documents' | 'notes' | 'spreadsheets'
type ContentType = 'document' | 'note' | 'spreadsheet'

const tabs: { key: ContentTab; type: ContentType; labelKey: string; icon: typeof FileText }[] = [
  { key: 'documents', type: 'document', labelKey: 'content-type-documents', icon: FileText },
  { key: 'notes', type: 'note', labelKey: 'content-type-notes', icon: StickyNote },
  { key: 'spreadsheets', type: 'spreadsheet', labelKey: 'content-type-spreadsheets', icon: Table2 }
]

export const AddContentDialog: React.FC<AddContentDialogProps> = ({
  open,
  onOpenChange,
  onAddContent,
  spaceId,
  accessToken,
  'data-testid': testId = 'add-content-dialog'
}) => {
  const { t, locale } = useTranslation(translations)
  const [activeTab, setActiveTab] = useState<ContentTab>('documents')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Map<string, { type: ContentType; id: string }>>(new Map())
  const [isAdding, setIsAdding] = useState(false)

  const { documents, notes, spreadsheets, isLoading, error, search, refresh } = useAvailableContent(
    accessToken,
    spaceId
  )

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

  const getItemName = (item: AvailableContentItem) => item.title || item.name || t('common-untitled')
  const getEmptyStateLabel = () => {
    switch (activeTab) {
      case 'documents':
        return t('add-content-empty-documents')
      case 'notes':
        return t('add-content-empty-notes')
      case 'spreadsheets':
        return t('add-content-empty-spreadsheets')
      default:
        return t('add-content-empty-documents')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gba:max-w-2xl gba:p-0 gba:overflow-hidden gba:max-h-[85vh]" data-testid={testId}>
        {/* Header */}
        <DialogHeader className="gba:p-6 gba:pb-4">
          <DialogTitle className="gba:text-lg gba:font-semibold">{t('add-content-title')}</DialogTitle>
          <DialogDescription className="gba:text-sm gba:text-muted-foreground">
            {t('add-content-description')}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="gba:px-6 gba:pb-4">
          <div className="gba:relative">
            <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <Input
              placeholder={t('common-search-files-placeholder')}
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
          {tabs.map(({ key, labelKey, icon: Icon }) => {
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
                {t(labelKey)}
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
                {t('common-try-again')}
              </Button>
            </div>
          ) : activeItems.length === 0 ? (
            <div className="gba:text-center gba:py-12">
              <FolderOpen className="gba:w-10 gba:h-10 gba:text-muted-foreground/40 gba:mx-auto gba:mb-3" />
              <p className="gba:text-sm gba:text-muted-foreground">
                {searchQuery ? t('add-content-empty-search-title') : getEmptyStateLabel()}
              </p>
              <p className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1">{t('add-content-owned-only')}</p>
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
                        {t('common-updated-relative', {
                          time: formatLocalizedDistance(new Date(item.updatedAt), locale)
                        })}
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
              ? t('common-selected-items', { count: selectedItems.size })
              : t('add-content-select-items')}
          </p>
          <div className="gba:flex gba:gap-2">
            <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={isAdding}>
              {t('common-cancel')}
            </Button>
            <Button
              onClick={handleAdd}
              disabled={selectedItems.size === 0 || isAdding}
              data-testid={`${testId}-add-button`}
            >
              {isAdding ? <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" /> : t('add-content-button')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AddContentDialog
