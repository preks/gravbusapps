/**
 * Content Entry Selector
 *
 * Select documents from internal knowledge base to add as knowledge sources
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
  Badge
} from '@newwork/nw-design-system'
import { Search, FileText, BookOpen, CheckCircle2 } from 'lucide-react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface ContentEntry {
  id: string
  title: string
  contentType?: { value: string }
  contentGroup?: { value: string }
  publishedOn?: string
  pictureThumbnail?: string
}

interface ContentEntrySelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (entries: ContentEntry[]) => void
  accessToken: string
  'data-testid'?: string
}

const SEARCH_CONTENT_QUERY = `
  query SearchContent($search: String!, $limit: Int!) {
    ContentEntry(
      where: {
        isDeleted: { _eq: false }
        _or: [
          { title: { _ilike: $search } }
          { preview: { _ilike: $search } }
          { content: { _ilike: $search } }
        ]
      }
      limit: $limit
      orderBy: { createdAt: DESC }
    ) {
      id
      title
      preview
      contentType { value }
      contentGroup { value }
      createdAt
    }
  }
`

export const ContentEntrySelector: React.FC<ContentEntrySelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  accessToken,
  'data-testid': testId = 'content-entry-selector'
}) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [searchQuery, setSearchQuery] = useState('')
  const [entries, setEntries] = useState<ContentEntry[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  const searchContent = useCallback(async () => {
    if (!searchQuery) {
      setEntries([])
      return
    }

    setIsLoading(true)
    try {
      const result = await graphqlClient.request<{ ContentEntry: ContentEntry[] }>(SEARCH_CONTENT_QUERY, {
        search: `%${searchQuery}%`,
        limit: 20
      })

      setEntries(result.ContentEntry || [])
    } catch (error) {
      console.error('Failed to search content:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, graphqlClient])

  useEffect(() => {
    const timer = setTimeout(() => { searchContent() }, 300)
    return () => clearTimeout(timer)
  }, [searchContent])

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleConfirm = () => {
    const selected = entries.filter(e => selectedIds.has(e.id))
    onSelect(selected)
    setSelectedIds(new Set())
    setSearchQuery('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="gba:max-w-2xl" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>Select from Knowledge Base</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
          {/* Search */}
          <div className="gba:relative">
            <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <Input
              placeholder="Search policies, documents, articles..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="gba:pl-10"
              data-testid={`${testId}-search-input`}
            />
          </div>

          {/* Results */}
          <div className="gba:max-h-96 gba:overflow-y-auto gba:space-y-2">
            {isLoading ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
                <Spinner size="lg" />
              </div>
            ) : entries.length === 0 ? (
              <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
                <BookOpen className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-3 gba:opacity-50" />
                <p className="gba:text-sm">
                  {searchQuery ? 'No content found' : 'Start typing to search knowledge base'}
                </p>
              </div>
            ) : (
              entries.map(entry => {
                const isSelected = selectedIds.has(entry.id)

                return (
                  <Card
                    key={entry.id}
                    className={`gba:cursor-pointer gba:transition-all ${
                      isSelected ? 'gba:border-primary gba:bg-primary/5' : 'hover:gba:border-primary/50'
                    }`}
                    onClick={() => toggleSelection(entry.id)}
                    data-testid={`${testId}-entry-${entry.id}`}
                  >
                    <CardContent className="gba:p-3">
                      <div className="gba:flex gba:items-start gba:gap-3">
                        <div className="gba:w-8 gba:h-8 gba:rounded gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                          {isSelected ? (
                            <CheckCircle2 className="gba:w-5 gba:h-5 gba:text-primary" />
                          ) : (
                            <FileText className="gba:w-4 gba:h-4 gba:text-primary" />
                          )}
                        </div>

                        <div className="gba:flex-1 gba:min-w-0">
                          <h4 className="gba:font-medium gba:text-sm gba:line-clamp-1">{entry.title}</h4>
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
                            {entry.contentGroup?.value && (
                              <Badge variant="secondary" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                                {entry.contentGroup.value}
                              </Badge>
                            )}
                            {entry.contentType?.value && (
                              <span className="gba:text-xs gba:text-muted-foreground">{entry.contentType.value}</span>
                            )}
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
