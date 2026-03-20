/**
 * Workspace Content Selector
 *
 * Browse and select documents, spreadsheets, slides, and notes from
 * platform Spaces to add as RAG knowledge sources for Task Experts.
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Spinner,
  Card,
  CardContent,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger
} from '@newwork/nw-design-system'
import { Search, FileText, StickyNote, TableProperties, Presentation, FolderOpen, CheckCircle2 } from 'lucide-react'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

const API_URL = getDocumentServiceApiUrl()

interface ContentItem {
  id: string
  type: 'document' | 'note' | 'spreadsheet' | 'slide'
  title: string
  description?: string
  updatedAt: string
  spaceId?: string
}

interface PaginatedResponse {
  items: Array<{
    id: string
    title?: string
    name?: string
    description?: string
    updatedAt: string
    spaceId?: string
  }>
  total: number
}

interface WorkspaceContentSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (items: ContentItem[]) => void
  accessToken: string
  'data-testid'?: string
}

const typeIcons: Record<string, React.ElementType> = {
  document: FileText,
  note: StickyNote,
  spreadsheet: TableProperties,
  slide: Presentation
}

const typeLabels: Record<string, string> = {
  document: 'Document',
  note: 'Note',
  spreadsheet: 'Spreadsheet',
  slide: 'Presentation'
}

export const WorkspaceContentSelector: React.FC<WorkspaceContentSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  accessToken,
  'data-testid': testId = 'workspace-content-selector'
}) => {
  const [allContent, setAllContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<string>('all')

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set())
      setSearchQuery('')
      setActiveTab('all')
    }
  }, [isOpen])

  // Fetch all accessible content from standalone endpoints
  useEffect(() => {
    if (!isOpen || !accessToken) return

    let mounted = true
    setLoading(true)

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }

    const fetchAll = async (endpoint: string): Promise<PaginatedResponse> => {
      const allItems: PaginatedResponse['items'] = []
      let page = 1
      const limit = 100
      try {
        while (true) {
          const res = await fetch(`${API_URL}/${endpoint}?limit=${limit}&page=${page}&includeShared=true`, { headers })
          if (!res.ok) break
          const data = await res.json()
          const items = data.items || []
          allItems.push(...items)
          if (items.length < limit || allItems.length >= data.total) break
          page++
        }
      } catch {
        /* ignore */
      }
      return { items: allItems, total: allItems.length }
    }

    Promise.all([fetchAll('documents'), fetchAll('notes'), fetchAll('spreadsheets'), fetchAll('slides')])
      .then(([docs, notes, sheets, slides]) => {
        if (!mounted) return

        const mapItems = (res: PaginatedResponse, type: ContentItem['type']): ContentItem[] =>
          (res.items || []).map(item => ({
            id: item.id,
            type,
            title: item.title || item.name || 'Untitled',
            description: item.description,
            updatedAt: item.updatedAt,
            spaceId: item.spaceId
          }))

        const items = [
          ...mapItems(docs, 'document'),
          ...mapItems(notes, 'note'),
          ...mapItems(sheets, 'spreadsheet'),
          ...mapItems(slides, 'slide')
        ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

        setAllContent(items)
      })
      .catch(err => {
        console.error('[WorkspaceContentSelector] Error:', err)
        if (mounted) setAllContent([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [isOpen, accessToken])

  // Filter content
  const filteredContent = React.useMemo(() => {
    let items = allContent
    if (activeTab !== 'all') {
      items = items.filter(i => i.type === activeTab)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(i => i.title.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q))
    }
    return items
  }, [allContent, activeTab, searchQuery])

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleConfirm = useCallback(() => {
    const selected = allContent.filter(i => selectedIds.has(i.id))
    onSelect(selected)
    onClose()
  }, [allContent, selectedIds, onSelect, onClose])

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return ''
    }
  }

  const typeCounts = React.useMemo(
    () => ({
      all: allContent.length,
      document: allContent.filter(i => i.type === 'document').length,
      note: allContent.filter(i => i.type === 'note').length,
      spreadsheet: allContent.filter(i => i.type === 'spreadsheet').length,
      slide: allContent.filter(i => i.type === 'slide').length
    }),
    [allContent]
  )

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="gba:max-w-3xl" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>Browse Workspace Content</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
          {/* Search */}
          <div className="gba:relative">
            <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <Input
              placeholder="Search documents, notes, spreadsheets, slides..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="gba:pl-10"
              data-testid={`${testId}-search-input`}
            />
          </div>

          {/* Type tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList data-testid={`${testId}-type-tabs`}>
              <TabsTrigger value="all" data-testid={`${testId}-tab-all`}>
                All ({typeCounts.all})
              </TabsTrigger>
              <TabsTrigger value="document" data-testid={`${testId}-tab-documents`}>
                Documents ({typeCounts.document})
              </TabsTrigger>
              <TabsTrigger value="note" data-testid={`${testId}-tab-notes`}>
                Notes ({typeCounts.note})
              </TabsTrigger>
              <TabsTrigger value="spreadsheet" data-testid={`${testId}-tab-spreadsheets`}>
                Spreadsheets ({typeCounts.spreadsheet})
              </TabsTrigger>
              <TabsTrigger value="slide" data-testid={`${testId}-tab-slides`}>
                Slides ({typeCounts.slide})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Results */}
          <div className="gba:max-h-96 gba:overflow-y-auto gba:space-y-2">
            {loading ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
                <Spinner size="lg" />
              </div>
            ) : filteredContent.length === 0 ? (
              <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
                <FolderOpen className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-3 gba:opacity-50" />
                <p className="gba:text-sm">
                  {searchQuery ? 'No content matching your search' : 'No content found in your spaces'}
                </p>
              </div>
            ) : (
              filteredContent.map(item => {
                const isSelected = selectedIds.has(item.id)
                const Icon = typeIcons[item.type] || FileText

                return (
                  <Card
                    key={item.id}
                    className={`gba:cursor-pointer gba:transition-all ${
                      isSelected ? 'gba:border-primary gba:bg-primary/5' : 'gba:hover:border-primary/50'
                    }`}
                    onClick={() => toggleSelection(item.id)}
                    data-testid={`${testId}-item-${item.id}`}
                  >
                    <CardContent className="gba:p-3">
                      <div className="gba:flex gba:items-start gba:gap-3">
                        <div className="gba:w-8 gba:h-8 gba:rounded gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                          {isSelected ? (
                            <CheckCircle2 className="gba:w-5 gba:h-5 gba:text-primary" />
                          ) : (
                            <Icon className="gba:w-4 gba:h-4 gba:text-primary" />
                          )}
                        </div>

                        <div className="gba:flex-1 gba:min-w-0">
                          <h4 className="gba:font-medium gba:text-sm gba:line-clamp-1">{item.title}</h4>
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
                            <Badge variant="secondary" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                              {typeLabels[item.type] || item.type}
                            </Badge>
                            <span className="gba:text-xs gba:text-muted-foreground">{formatDate(item.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="gba:text-sm gba:text-muted-foreground">
              {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            data-testid={`${testId}-confirm-button`}
          >
            Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
