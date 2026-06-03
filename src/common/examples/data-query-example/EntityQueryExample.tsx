import React, { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton
} from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, NotePencilIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEntities } from './hooks/useEntities'
import { useEntity } from './hooks/useEntity'

export function EntityQueryExample({ accessToken, userInfo }: BusinessAppContextProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'draft'>('all')
  const [selectedEntityId, setSelectedEntityId] = useState('')

  const queryParams = useMemo(() => ({ search: search || undefined, status }), [search, status])
  const { entities, isLoading, isFetching, isPlaceholderData, isFetched, error, refetch } = useEntities(
    queryParams,
    accessToken
  )
  const { entity, isLoading: isDetailLoading, isFetching: isDetailFetching } = useEntity(selectedEntityId, accessToken)

  return (
    <div className="gba:grid gba:gap-6 gba:p-6" data-testid="entity-query-example">
      <Card className="gba:p-6">
        <div className="gba:flex gba:flex-wrap gba:items-end gba:gap-4">
          <div className="gba:flex-1 gba:min-w-[240px]">
            <Label htmlFor="entity-query-example-search">Search</Label>
            <Input
              id="entity-query-example-search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search entities"
              data-testid="entity-query-example-search"
            />
          </div>

          <div className="gba:w-[180px]">
            <Label htmlFor="entity-query-example-status">Status</Label>
            <Select value={status} onValueChange={value => setStatus(value as 'all' | 'active' | 'draft')}>
              <SelectTrigger id="entity-query-example-status" data-testid="entity-query-example-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => void refetch()} variant="outline" data-testid="entity-query-example-refetch">
            Refetch
          </Button>
        </div>

        <div className="gba:mt-4 gba:flex gba:flex-wrap gba:gap-2">
          <Badge variant="outline">
            Viewer: {userInfo?.employeeDetails.displayName || userInfo?.userName || 'unknown'}
          </Badge>
          {isFetching && <Badge variant="info">Fetching</Badge>}
          {isPlaceholderData && <Badge variant="warning">Placeholder data</Badge>}
        </div>
      </Card>

      <div className="gba:grid gba:gap-6 gba:lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="gba:p-6">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
            <h2 className="gba:text-lg gba:font-semibold">useEntities()</h2>
            <span className="gba:text-sm gba:text-muted-foreground">{entities.length} visible</span>
          </div>

          {isLoading ? (
            <div className="gba:space-y-3">
              <Skeleton className="gba:h-16 gba:w-full" />
              <Skeleton className="gba:h-16 gba:w-full" />
              <Skeleton className="gba:h-16 gba:w-full" />
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="gba:text-sm gba:text-destructive" data-testid="entity-query-example-list-error">
              {error.message}
            </div>
          ) : null}

          {!isLoading && !error && isFetched && entities.length === 0 ? (
            <EmptyState
              type="search"
              config={{
                configs: {
                  search: {
                    title: 'No entities found',
                    description: 'The example keeps previous data visible until the new result is ready.',
                    icon: MagnifyingGlassIcon,
                    size: 'md'
                  }
                }
              }}
              data-testid="entity-query-example-empty"
            />
          ) : null}

          {!isLoading && !error && entities.length > 0 ? (
            <div className="gba:space-y-3">
              {entities.map(exampleEntity => (
                <button
                  key={exampleEntity.id}
                  type="button"
                  className={`gba:w-full gba:rounded-lg gba:border gba:p-4 gba:text-left gba:transition ${
                    selectedEntityId === exampleEntity.id ? 'gba:border-primary gba:bg-primary/5' : 'gba:border-border'
                  }`}
                  onClick={() => setSelectedEntityId(exampleEntity.id)}
                  data-testid={`entity-query-example-item-${exampleEntity.id}`}
                >
                  <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
                    <div className="gba:min-w-0">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span className="gba:font-medium">{exampleEntity.name}</span>
                        <Badge variant={exampleEntity.status === 'active' ? 'success' : 'outline'}>
                          {exampleEntity.status}
                        </Badge>
                      </div>
                      <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{exampleEntity.summary}</p>
                    </div>
                    <span className="gba:text-xs gba:text-muted-foreground">{exampleEntity.category}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="gba:p-6">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
            <h2 className="gba:text-lg gba:font-semibold">useEntity()</h2>
            {isDetailFetching && <Badge variant="info">Fetching</Badge>}
          </div>

          {isDetailLoading ? (
            <div className="gba:space-y-3">
              <Skeleton className="gba:h-6 gba:w-40" />
              <Skeleton className="gba:h-4 gba:w-full" />
              <Skeleton className="gba:h-4 gba:w-5/6" />
            </div>
          ) : null}

          {!isDetailLoading && entity ? (
            <div className="gba:space-y-3" data-testid="entity-query-example-detail">
              <div className="gba:flex gba:items-center gba:gap-2">
                <NotePencilIcon className="gba:h-5 gba:w-5" />
                <span className="gba:text-lg gba:font-semibold">{entity.name}</span>
              </div>
              <Badge variant={entity.status === 'active' ? 'success' : 'outline'}>{entity.status}</Badge>
              <p className="gba:text-sm gba:text-muted-foreground">{entity.summary}</p>
              <div className="gba:text-xs gba:text-muted-foreground">Updated: {entity.updatedAt}</div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  )
}

export default React.memo(EntityQueryExample)
