import React, { useState } from 'react'
import { Button, Input, Badge } from '@newwork/nw-design-system'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'
import { useDatasource } from '../../hooks/useDatasource'

interface EntityPreviewProps {
  entityType: string
  valueField: string
  labelField: string
  isExpanded: boolean
  onToggle: () => void
  'data-testid'?: string
}

export const EntityPreview: React.FC<EntityPreviewProps> = ({
  entityType,
  valueField,
  labelField,
  isExpanded,
  onToggle,
  'data-testid': testId = 'entity-preview'
}) => {
  const [entities, setEntities] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const { list: listEntities } = useDatasource()

  const handleSearch = async (searchTerm: string) => {
    setLoading(true)
    setHasSearched(true)
    try {
      const result = await listEntities(entityType, {
        search: searchTerm,
        limit: 10
      })
      setEntities(result?.entities || [])
    } catch (error) {
      console.error('Failed to load entities:', error)
      setEntities([])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(search)
    }
  }

  return (
    <div className="gba:space-y-2" data-testid={testId}>
      {/* Connection Status Header */}
      <div className="gba:p-2 gba:bg-purple-50 gba:rounded gba:border gba:border-purple-200">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-xs gba:text-gray-700">Entity connected: {entityType}</span>
            <Badge variant="outline" className="gba:text-xs gba:bg-green-100 gba:text-green-800 gba:border-green-300">
              ✓ Connected
            </Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggle}
            className="gba:h-6 gba:px-2 gba:text-xs"
            data-testid={`${testId}-toggle`}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="gba:h-3 gba:w-3 gba:mr-1" />
                Hide
              </>
            ) : (
              <>
                <ChevronDown className="gba:h-3 gba:w-3 gba:mr-1" />
                Preview
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Collapsible Search & Preview */}
      {isExpanded && (
        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Input
              placeholder={`Search ${entityType}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="gba:flex-1"
              data-testid={`${testId}-search-input`}
            />
            <Button
              size="sm"
              onClick={() => handleSearch(search)}
              disabled={loading}
              data-testid={`${testId}-search-button`}
            >
              <Search className="gba:h-4 gba:w-4 gba:mr-1" />
              Search
            </Button>
          </div>

          {loading && <div className="gba:text-xs gba:text-center gba:p-3 gba:text-gray-600">Loading entities...</div>}

          {!loading && hasSearched && entities.length > 0 && (
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:justify-between gba:px-2">
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Preview Results:</span>
                <span className="gba:text-xs gba:text-gray-500">
                  {entities.length} {entities.length === 1 ? 'entity' : 'entities'}
                </span>
              </div>
              <div className="gba:max-h-48 gba:overflow-y-auto gba:border gba:rounded gba:bg-white">
                {entities.map((entity: any) => (
                  <div
                    key={entity.id}
                    className="gba:p-2 gba:text-xs gba:border-b last:gba:border-b-0 gba:flex gba:items-center gba:justify-between hover:gba:bg-gray-50"
                  >
                    <div>
                      <strong className="gba:text-gray-900">{entity[labelField]}</strong>
                      <span className="gba:text-gray-500 gba:ml-2">
                        ({valueField}: {entity[valueField]})
                      </span>
                    </div>
                    {entity.code && entity.code !== entity[valueField] && (
                      <Badge variant="outline" className="gba:text-xs">
                        {entity.code}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && hasSearched && entities.length === 0 && (
            <div className="gba:text-xs gba:text-center gba:p-3 gba:text-gray-500 gba:italic">
              No entities found{search ? ` for "${search}"` : ''}
            </div>
          )}

          {!loading && !hasSearched && (
            <div className="gba:text-xs gba:text-center gba:p-3 gba:text-gray-500 gba:italic">
              Enter a search term and click Search to preview entities
            </div>
          )}
        </div>
      )}
    </div>
  )
}
