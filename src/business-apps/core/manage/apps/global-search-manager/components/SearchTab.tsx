import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Spinner
} from '@newwork/nw-design-system'
import type { GlobalSearchClient } from '@/common/network/global-search/GlobalSearchClient'
import type {
  GlobalSearchQueryResponse,
  SearchCategory,
  SearchItem
} from '@/business-apps/core/use/apps/global-search/types'

interface SearchTabProps {
  client: GlobalSearchClient
}

const PAGE_SIZE = 8

export const SearchTab: React.FC<SearchTabProps> = ({ client }) => {
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [response, setResponse] = useState<GlobalSearchQueryResponse | null>(null)
  const [selectedItem, setSelectedItem] = useState<SearchItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadResults = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const nextResponse = await client.runQuery({
        q: query,
        categoryIds: selectedCategoryIds,
        paging: { limit: PAGE_SIZE, offset }
      })
      setResponse(nextResponse)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Search failed')
    } finally {
      setIsLoading(false)
    }
  }, [client, offset, query, selectedCategoryIds])

  useEffect(() => {
    const timeoutId = globalThis.setTimeout(() => {
      loadResults().catch(() => undefined)
    }, 350)
    return () => globalThis.clearTimeout(timeoutId)
  }, [loadResults])

  const categories = response?.categories ?? []
  const totalRecords = response?.paging?.totalRecords ?? 0
  const hasPreviousPage = offset > 0
  const hasNextPage = offset + PAGE_SIZE < totalRecords

  const suggestions = useMemo(() => response?.suggestions ?? [], [response?.suggestions])

  const toggleCategory = (category: SearchCategory) => {
    setOffset(0)
    setSelectedCategoryIds(current =>
      current.includes(category.id)
        ? current.filter(categoryId => categoryId !== category.id)
        : [...current, category.id]
    )
  }

  return (
    <div className="gba:space-y-4" data-testid="global-search-manager-search-tab">
      <Card>
        <CardHeader>
          <CardTitle>Global Search</CardTitle>
          <CardDescription>
            Run live queries against the global search API and inspect raw result contracts.
          </CardDescription>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <Input
            value={query}
            onChange={event => {
              setQuery(event.target.value)
              setOffset(0)
            }}
            placeholder="Search across all entities..."
            data-testid="global-search-manager-search-input"
          />

          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {categories.map(category => (
              <Button
                key={category.id}
                size="sm"
                variant={selectedCategoryIds.includes(category.id) ? 'default' : 'outline'}
                onClick={() => toggleCategory(category)}
              >
                {category.label}
                {typeof category.count === 'number' ? ` (${category.count})` : ''}
              </Button>
            ))}
          </div>

          {suggestions.length > 0 && (
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              {suggestions.map(suggestion => (
                <Button
                  key={suggestion.id}
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setQuery(suggestion.queryValue ?? suggestion.label)
                    setOffset(0)
                  }}
                >
                  {suggestion.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {errorMessage && <p className="gba:text-sm gba:text-destructive">{errorMessage}</p>}
      {isLoading && <Spinner size="sm" />}

      {(response?.data ?? []).map(section => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            <CardDescription>{section.total ?? section.items.length} result(s)</CardDescription>
          </CardHeader>
          <CardContent className="gba:space-y-2">
            {section.items.map(item => (
              <button
                key={item.id}
                type="button"
                className="gba:w-full gba:text-left gba:p-3 gba:rounded-md gba:border gba:bg-background hover:gba:bg-muted"
                onClick={() => setSelectedItem(item)}
              >
                <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
                  <div>
                    <p className="gba:font-medium">{item.name}</p>
                    {item.description && <p className="gba:text-sm gba:text-muted-foreground">{item.description}</p>}
                    <p className="gba:text-xs gba:text-muted-foreground">{item.typeLabel || item.type}</p>
                  </div>
                  <div className="gba:flex gba:flex-wrap gba:justify-end gba:gap-1">
                    {item.badges?.map(badge => (
                      <Badge key={badge.id}>{badge.label}</Badge>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="gba:flex gba:items-center gba:justify-between">
        <span className="gba:text-sm gba:text-muted-foreground">{totalRecords} result(s)</span>
        <div className="gba:flex gba:gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!hasPreviousPage}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Previous
          </Button>
          <Button size="sm" variant="outline" disabled={!hasNextPage} onClick={() => setOffset(offset + PAGE_SIZE)}>
            Next
          </Button>
        </div>
      </div>

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="gba:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <pre className="gba:max-h-96 gba:overflow-auto gba:rounded-md gba:bg-muted gba:p-3 gba:text-xs">
            {JSON.stringify(selectedItem, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}
