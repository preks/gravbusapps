import React, { useState } from 'react'
import { Badge, Button, Input } from '@newwork/nw-design-system'
import { CaretDownIcon, CaretUpIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useDatasource } from '@/common/data/flow/hooks/useDatasource'

interface EntityPreviewProps {
  dataSourceType: 'CUSTOM_ENTITY' | 'INTERNAL_ENTITY'
  entityType: string
  namespace?: string
  accessToken?: string
  valueField: string
  labelField: string
  isExpanded: boolean
  onToggle: () => void
  'data-testid'?: string
}

const getEntityRowKey = (entity: any, valueField: string, labelField: string): string =>
  String(entity[valueField] ?? entity.id ?? entity.code ?? entity[labelField])

export const EntityPreview: React.FC<EntityPreviewProps> = ({
  dataSourceType,
  entityType,
  namespace,
  accessToken,
  valueField,
  labelField,
  isExpanded,
  onToggle,
  'data-testid': testId = 'entity-preview'
}) => {
  const { list: listEntities } = useDatasource(accessToken)
  const [entities, setEntities] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (searchTerm: string) => {
    setIsLoading(true)
    setHasSearched(true)
    try {
      const result = await listEntities(entityType, {
        kind: dataSourceType,
        namespace,
        labelField,
        search: searchTerm,
        limit: 10
      })
      setEntities(result?.entities || [])
    } catch (error) {
      console.error('Failed to load entities:', error)
      setEntities([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      void handleSearch(search)
    }
  }

  return (
    <div className="gba:space-y-2" data-testid={testId}>
      <div className="gba:rounded gba:border gba:border-purple-200 gba:bg-purple-50 gba:p-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-xs gba:text-gray-700">Entity connected: {entityType}</span>
            <Badge variant="outline" className="gba:text-xs gba:bg-green-100 gba:text-green-800 gba:border-green-300">
              Connected
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
                <CaretUpIcon className="gba:mr-1 gba:h-3 gba:w-3" />
                Hide
              </>
            ) : (
              <>
                <CaretDownIcon className="gba:mr-1 gba:h-3 gba:w-3" />
                Preview
              </>
            )}
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Input
              placeholder={`Search ${entityType}...`}
              value={search}
              onChange={event => setSearch(event.target.value)}
              onKeyDown={handleKeyDown}
              className="gba:flex-1"
              data-testid={`${testId}-search-input`}
            />
            <Button
              size="sm"
              onClick={() => void handleSearch(search)}
              disabled={isLoading}
              data-testid={`${testId}-search-button`}
            >
              <MagnifyingGlassIcon className="gba:mr-1 gba:h-4 gba:w-4" />
              Search
            </Button>
          </div>

          {isLoading ? (
            <div className="gba:p-3 gba:text-center gba:text-xs gba:text-gray-600">Loading entities...</div>
          ) : null}

          {!isLoading && hasSearched && entities.length > 0 ? (
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:justify-between gba:px-2">
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Preview Results:</span>
                <span className="gba:text-xs gba:text-gray-500">
                  {entities.length} {entities.length === 1 ? 'entity' : 'entities'}
                </span>
              </div>
              <div className="gba:max-h-48 gba:overflow-y-auto gba:rounded gba:border gba:bg-white">
                {entities.map(entity => (
                  <div
                    key={getEntityRowKey(entity, valueField, labelField)}
                    className="gba:flex gba:items-center gba:justify-between gba:border-b gba:p-2 gba:text-xs last:gba:border-b-0 hover:gba:bg-gray-50"
                  >
                    <div>
                      <strong className="gba:text-gray-900">{String(entity[labelField] || '')}</strong>
                      <span className="gba:ml-2 gba:text-gray-500">
                        ({valueField}: {String(entity[valueField] || '')})
                      </span>
                    </div>
                    {entity.code && entity.code !== entity[valueField] ? (
                      <Badge variant="outline" className="gba:text-xs">
                        {entity.code}
                      </Badge>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!isLoading && hasSearched && entities.length === 0 ? (
            <div className="gba:p-3 gba:text-center gba:text-xs gba:italic gba:text-gray-500">
              No entities found{search ? ` for "${search}"` : ''}
            </div>
          ) : null}

          {!isLoading && !hasSearched ? (
            <div className="gba:p-3 gba:text-center gba:text-xs gba:italic gba:text-gray-500">
              Enter a search term and click Search to preview entities
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
