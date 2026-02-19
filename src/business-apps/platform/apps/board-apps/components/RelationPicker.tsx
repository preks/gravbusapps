/**
 * RelationPicker - search and select rows from another board to create cross-board relations.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Button, Input, Spinner, Badge } from '@newwork/nw-design-system'
import { Search, X, ExternalLink } from 'lucide-react'
import type { BoardRow, RelationConfig } from '../types'
import { BoardApiService } from '../services/BoardApiService'

export interface RelationPickerProps {
  config: RelationConfig
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onPeek?: (targetBoardId: string, targetRowId: string) => void
  'data-testid'?: string
}

export const RelationPicker: React.FC<RelationPickerProps> = ({
  config,
  selectedIds,
  onChange,
  onPeek,
  'data-testid': testId = 'relation-picker'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<BoardRow[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedRows, setSelectedRows] = useState<BoardRow[]>([])
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (selectedIds.length === 0 && selectedRows.length > 0) {
      setSelectedRows([])
    }
  }, [selectedIds.length, selectedRows.length])

  useEffect(() => {
    if (!isOpen || !searchQuery.trim()) {
      setResults([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await BoardApiService.getRows(config.targetAppId, config.targetSheetId, {
          search: searchQuery,
          limit: 20
        })
        setResults(response.items)
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [isOpen, searchQuery, config.targetAppId, config.targetSheetId])

  const handleSelect = useCallback(
    (row: BoardRow) => {
      const isMulti = config.cardinality !== 'one-to-one'
      if (selectedIds.includes(row.id)) {
        onChange(selectedIds.filter(id => id !== row.id))
        setSelectedRows(prev => prev.filter(r => r.id !== row.id))
      } else {
        const newIds = isMulti ? [...selectedIds, row.id] : [row.id]
        onChange(newIds)
        setSelectedRows(prev => (isMulti ? [...prev, row] : [row]))
        if (!isMulti) setIsOpen(false)
      }
    },
    [selectedIds, onChange, config.cardinality]
  )

  const handleRemove = useCallback(
    (id: string) => {
      onChange(selectedIds.filter(i => i !== id))
      setSelectedRows(prev => prev.filter(r => r.id !== id))
    },
    [selectedIds, onChange]
  )

  const displayColumn = config.displayColumn || 'name'
  const primaryFallbacks = ['name', 'title', 'displayName', 'label', 'subject']

  const getRowLabel = (row: Pick<BoardRow, 'id' | 'data'>): string => {
    if (row.data[displayColumn]) return String(row.data[displayColumn])
    for (const key of primaryFallbacks) {
      if (key !== displayColumn && row.data[key]) return String(row.data[key])
    }
    return row.id.slice(0, 8)
  }

  const displayRows: Array<Pick<BoardRow, 'id' | 'data'>> = selectedIds.map(id => {
    const found = selectedRows.find(r => r.id === id)
    return found || { id, data: {} }
  })

  return (
    <div className="gba:relative" data-testid={testId}>
      <div className="gba:flex gba:flex-wrap gba:gap-1 gba:min-h-7">
        {displayRows.map(row => (
          <Badge key={row.id} variant="secondary" className="gba:text-xs gba:gap-1 gba:pr-0.5">
            <button
              className="gba:hover:underline gba:text-xs"
              onClick={() => onPeek?.(config.targetAppId, row.id)}
              data-testid={`${testId}-peek-${row.id}`}
            >
              {getRowLabel(row)}
            </button>
            <button
              onClick={() => handleRemove(row.id)}
              className="gba:p-0.5 gba:rounded gba:hover:bg-muted"
              data-testid={`${testId}-remove-${row.id}`}
            >
              <X className="gba:w-2.5 gba:h-2.5" />
            </button>
          </Badge>
        ))}
        <button
          onClick={() => setIsOpen(true)}
          className="gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:px-1.5 gba:py-0.5 gba:rounded gba:hover:bg-muted gba:transition-colors"
          data-testid={`${testId}-open`}
        >
          + Link
        </button>
      </div>

      {isOpen && (
        <div className="gba:absolute gba:top-full gba:left-0 gba:mt-1 gba:w-72 gba:bg-popover gba:border gba:rounded-lg gba:ring-1 gba:ring-border gba:z-50 gba:overflow-hidden">
          <div className="gba:p-2 gba:border-b">
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-2 gba:top-1/2 gba:-translate-y-1/2 gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
              <Input
                placeholder="Search rows..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="gba:pl-7 gba:h-7 gba:text-xs"
                autoFocus
                data-testid={`${testId}-search`}
              />
            </div>
          </div>
          <div className="gba:max-h-48 gba:overflow-auto">
            {isSearching && (
              <div className="gba:flex gba:justify-center gba:py-4">
                <Spinner />
              </div>
            )}
            {!isSearching && results.length === 0 && searchQuery && (
              <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:py-4">No results</p>
            )}
            {results.map(row => {
              const isSelected = selectedIds.includes(row.id)
              return (
                <button
                  key={row.id}
                  onClick={() => handleSelect(row)}
                  className={`gba:w-full gba:text-left gba:px-3 gba:py-1.5 gba:text-xs gba:hover:bg-muted/50 gba:flex gba:items-center gba:justify-between ${isSelected ? 'gba:bg-accent/10' : ''}`}
                  data-testid={`${testId}-result-${row.id}`}
                >
                  <span className="gba:truncate">{getRowLabel(row)}</span>
                  <div className="gba:flex gba:items-center gba:gap-1">
                    {isSelected && (
                      <Badge variant="secondary" className="gba:text-xs gba:px-1 gba:py-0">
                        linked
                      </Badge>
                    )}
                    {onPeek && (
                      <ExternalLink
                        className="gba:w-3 gba:h-3 gba:text-muted-foreground gba:hover:text-foreground"
                        onClick={e => {
                          e.stopPropagation()
                          onPeek(config.targetAppId, row.id)
                        }}
                      />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="gba:p-1.5 gba:border-t">
            <Button
              variant="ghost"
              size="sm"
              className="gba:w-full gba:h-6 gba:text-xs"
              onClick={() => setIsOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
