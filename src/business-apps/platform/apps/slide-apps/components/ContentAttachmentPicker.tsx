/**
 * ContentAttachmentPicker Component
 *
 * Multi-select content picker for attaching reference documents, notes,
 * spreadsheets, and slides to AI slide generation.
 * Adapts the AddContentDialog pattern from spaces.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Button, Input, Checkbox, Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import { FileText, Table2, StickyNote, Presentation, Search, Loader2, X, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import type { ContentReference, ContentType } from '../services/SlideGenerationService'

export interface ContentAttachmentPickerProps {
  selectedItems: ContentReference[]
  onSelectionChange: (items: ContentReference[]) => void
  maxItems?: number
  accessToken: string
  'data-testid'?: string
}

interface ContentItem {
  id: string
  type: ContentType
  title: string
  updatedAt: string
}

type TabKey = 'documents' | 'notes' | 'spreadsheets' | 'slides'

const TABS: { key: TabKey; type: ContentType; label: string; icon: typeof FileText }[] = [
  { key: 'documents', type: 'document', label: 'Documents', icon: FileText },
  { key: 'notes', type: 'note', label: 'Notes', icon: StickyNote },
  { key: 'spreadsheets', type: 'spreadsheet', label: 'Spreadsheets', icon: Table2 },
  { key: 'slides', type: 'slide', label: 'Slides', icon: Presentation }
]

const API_URL = getDocumentServiceApiUrl()

export const ContentAttachmentPicker: React.FC<ContentAttachmentPickerProps> = ({
  selectedItems,
  onSelectionChange,
  maxItems = 5,
  accessToken,
  'data-testid': testId = 'content-attachment-picker'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('documents')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [contentItems, setContentItems] = useState<Record<TabKey, ContentItem[]>>({
    documents: [],
    notes: [],
    spreadsheets: [],
    slides: []
  })

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch content from API
  const fetchContent = useCallback(
    async (query: string = '') => {
      if (!accessToken) return

      setIsLoading(true)
      const searchParams = query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''

      try {
        const [docsRes, notesRes, sheetsRes, slidesRes] = await Promise.all([
          fetch(`${API_URL}/documents${searchParams}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          }),
          fetch(`${API_URL}/notes${searchParams}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          }),
          fetch(`${API_URL}/spreadsheets${searchParams}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          }),
          fetch(`${API_URL}/slides${searchParams}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          })
        ])

        const parseResponse = async (res: Response): Promise<ContentItem[]> => {
          if (!res.ok) return []
          const data = await res.json()
          const items = Array.isArray(data) ? data : data?.items || []
          return items
        }

        const [docs, notes, sheets, slides] = await Promise.all([
          parseResponse(docsRes),
          parseResponse(notesRes),
          parseResponse(sheetsRes),
          parseResponse(slidesRes)
        ])

        const mapItems = (items: unknown[], type: ContentType): ContentItem[] =>
          items.map((item: unknown) => {
            const i = item as Record<string, unknown>
            return {
              id: i.id as string,
              type,
              title: (i.title as string) || (i.name as string) || 'Untitled',
              updatedAt: i.updatedAt as string
            }
          })

        setContentItems({
          documents: mapItems(docs, 'document'),
          notes: mapItems(notes, 'note'),
          spreadsheets: mapItems(sheets, 'spreadsheet'),
          slides: mapItems(slides, 'slide')
        })
      } catch (err) {
        console.error('[ContentAttachmentPicker] Fetch error:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken]
  )

  // Initial fetch when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchContent('')
    }
  }, [isOpen, fetchContent])

  // Debounced search
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => fetchContent(query), 300)
    },
    [fetchContent]
  )

  // Toggle item selection
  const toggleItem = useCallback(
    (item: ContentItem) => {
      const isSelected = selectedItems.some(s => s.id === item.id && s.type === item.type)

      if (isSelected) {
        onSelectionChange(selectedItems.filter(s => !(s.id === item.id && s.type === item.type)))
      } else if (selectedItems.length < maxItems) {
        onSelectionChange([...selectedItems, { id: item.id, type: item.type, title: item.title }])
      }
    },
    [selectedItems, onSelectionChange, maxItems]
  )

  // Remove selected item
  const removeItem = useCallback(
    (item: ContentReference) => {
      onSelectionChange(selectedItems.filter(s => !(s.id === item.id && s.type === item.type)))
    },
    [selectedItems, onSelectionChange]
  )

  // Check if item is selected
  const isItemSelected = useCallback(
    (item: ContentItem) => selectedItems.some(s => s.id === item.id && s.type === item.type),
    [selectedItems]
  )

  // Get icon for content type
  const getIcon = (type: ContentType) => {
    switch (type) {
      case 'document':
        return FileText
      case 'note':
        return StickyNote
      case 'spreadsheet':
        return Table2
      case 'slide':
        return Presentation
    }
  }

  // Active tab items
  const activeItems = contentItems[activeTab]

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      {/* Selected items display */}
      {selectedItems.length > 0 && (
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          {selectedItems.map(item => {
            const Icon = getIcon(item.type)
            return (
              <div
                key={`${item.type}-${item.id}`}
                className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1 gba:text-xs gba:font-medium gba:rounded-md gba:bg-secondary gba:text-secondary-foreground"
              >
                <Icon className="gba:w-3 gba:h-3" />
                <span className="gba:max-w-[150px] gba:truncate">{item.title || 'Untitled'}</span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    removeItem(item)
                  }}
                  className="gba:ml-1 gba:p-0.5 gba:rounded-sm hover:gba:bg-muted-foreground/20"
                  data-testid={`${testId}-remove-${item.id}`}
                >
                  <X className="gba:w-3 gba:h-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add attachment button with popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedItems.length >= maxItems}
            data-testid={`${testId}-trigger`}
          >
            <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
            Add Reference
            {selectedItems.length > 0 && (
              <span className="gba:ml-2 gba:px-1.5 gba:py-0.5 gba:text-xs gba:rounded gba:bg-muted gba:text-muted-foreground">
                {selectedItems.length}/{maxItems}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="gba:w-[400px] gba:p-0" align="start" data-testid={`${testId}-popover`}>
          {/* Search */}
          <div className="gba:p-3 gba:border-b">
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                className="gba:pl-9 gba:h-9"
                data-testid={`${testId}-search`}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="gba:flex gba:border-b">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`gba:flex-1 gba:flex gba:items-center gba:justify-center gba:gap-1.5 gba:px-2 gba:py-2 gba:text-xs gba:font-medium gba:border-b-2 gba:transition-colors ${
                  activeTab === key
                    ? 'gba:border-primary gba:text-foreground'
                    : 'gba:border-transparent gba:text-muted-foreground hover:gba:text-foreground'
                }`}
                data-testid={`${testId}-tab-${key}`}
              >
                <Icon className="gba:w-3.5 gba:h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Content list */}
          <div className="gba:max-h-[250px] gba:overflow-y-auto gba:p-2">
            {isLoading ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
                <Loader2 className="gba:w-5 gba:h-5 gba:animate-spin gba:text-muted-foreground" />
              </div>
            ) : activeItems.length === 0 ? (
              <div className="gba:text-center gba:py-8 gba:text-sm gba:text-muted-foreground">
                {searchQuery ? 'No matching content found' : `No ${activeTab} available`}
              </div>
            ) : (
              <div className="gba:space-y-1">
                {activeItems.map(item => {
                  const Icon = getIcon(item.type)
                  const selected = isItemSelected(item)
                  const disabled = !selected && selectedItems.length >= maxItems

                  return (
                    <div
                      key={item.id}
                      onClick={() => !disabled && toggleItem(item)}
                      className={`gba:flex gba:items-center gba:gap-3 gba:p-2 gba:rounded-md gba:cursor-pointer gba:transition-colors ${
                        selected
                          ? 'gba:bg-primary/5 gba:ring-1 gba:ring-primary/20'
                          : disabled
                            ? 'gba:opacity-50 gba:cursor-not-allowed'
                            : 'hover:gba:bg-muted/50'
                      }`}
                      data-testid={`${testId}-item-${item.id}`}
                    >
                      <Checkbox checked={selected} disabled={disabled} className="gba:pointer-events-none" />
                      <div className="gba:w-8 gba:h-8 gba:rounded gba:bg-muted gba:flex gba:items-center gba:justify-center">
                        <Icon className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                      </div>
                      <div className="gba:flex-1 gba:min-w-0">
                        <p className="gba:text-sm gba:font-medium gba:truncate">{item.title}</p>
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
          {selectedItems.length >= maxItems && (
            <div className="gba:px-3 gba:py-2 gba:border-t gba:bg-muted/30">
              <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
                Maximum {maxItems} references allowed
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Helper text */}
      {selectedItems.length === 0 && (
        <p className="gba:text-xs gba:text-muted-foreground">
          Optionally attach documents, notes, or other content as reference for the AI
        </p>
      )}
    </div>
  )
}

export default ContentAttachmentPicker
