/**
 * Entity Linking Panel Component
 *
 * Panel for linking entities (users, employees, org units) to cases
 */

import React, { useState } from 'react'
import { Card, CardContent, Combobox, Button, Badge } from '@newwork/nw-design-system'
import { Link2, X, Building, User as UserIcon, Users, Search } from 'lucide-react'
import { BusinessAppContextProps } from '@/business-apps/types'
import { LinkedEntity } from '../types'
import { useEntityLinking } from '../hooks'
import { ENTITY_TYPE_LABELS } from '../utils'

interface EntityLinkingPanelProps {
  linkedEntities: LinkedEntity[]
  onLinkEntity: (entity: LinkedEntity) => Promise<void>
  onUnlinkEntity: (entityId: string) => Promise<void>
  entityTypes?: ('user' | 'employee' | 'organizationalUnit')[]
  context: BusinessAppContextProps
  readOnly?: boolean
}

export const EntityLinkingPanel: React.FC<EntityLinkingPanelProps> = ({
  linkedEntities,
  onLinkEntity,
  onUnlinkEntity,
  entityTypes = ['user', 'employee', 'organizationalUnit'],
  context,
  readOnly = false
}) => {
  const { searchResults, isSearching, searchEntities } = useEntityLinking(context)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLinking, setIsLinking] = useState(false)

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length >= 2) {
      await searchEntities(query, entityTypes)
    }
  }

  const handleLinkEntity = async (entityId: string) => {
    const entity = searchResults.find(e => e.id === entityId)
    if (!entity) return

    try {
      setIsLinking(true)
      await onLinkEntity({
        type: entity.type,
        id: entity.id,
        name: entity.name,
        metadata: entity.metadata
      })
      setSearchQuery('')
    } catch (error) {
      console.error('Failed to link entity:', error)
    } finally {
      setIsLinking(false)
    }
  }

  const handleUnlinkEntity = async (entityId: string) => {
    try {
      await onUnlinkEntity(entityId)
    } catch (error) {
      console.error('Failed to unlink entity:', error)
    }
  }

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <UserIcon className="gba:h-4 gba:w-4" />
      case 'employee':
        return <Users className="gba:h-4 gba:w-4" />
      case 'organizationalUnit':
        return <Building className="gba:h-4 gba:w-4" />
      default:
        return <Link2 className="gba:h-4 gba:w-4" />
    }
  }

  const getEntityBadgeVariant = (type: string): 'default' | 'secondary' | 'outline' => {
    switch (type) {
      case 'user':
        return 'default'
      case 'employee':
        return 'secondary'
      case 'organizationalUnit':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="gba:space-y-4">
      {/* Search and Link Entity */}
      {!readOnly && (
        <Card>
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:gap-3">
              <Search className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
              <div className="gba:flex-1">
                <Combobox
                  value={searchQuery}
                  onValueChange={handleSearch}
                  onSelect={handleLinkEntity}
                  options={searchResults.map(entity => ({
                    value: entity.id,
                    label: entity.name
                  }))}
                  placeholder="Search users, employees, or org units..."
                  emptyText={isSearching ? 'Searching...' : 'No results found'}
                  disabled={isLinking}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Entities List */}
      <Card>
        <CardContent className="gba:p-4">
          {linkedEntities.length === 0 ? (
            <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
              <Link2 className="gba:h-10 gba:w-10 gba:mx-auto gba:mb-3 gba:opacity-40" />
              <p className="gba:font-medium">No entities linked</p>
              {!readOnly && <p className="gba:text-sm gba:mt-1">Search and link users, employees, or org units</p>}
            </div>
          ) : (
            <div className="gba:space-y-2">
              {linkedEntities.map(entity => (
                <div
                  key={entity.id}
                  className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg gba:bg-muted/30 hover:gba:bg-muted/50 gba:transition-colors"
                >
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div className="gba:flex gba:items-center gba:justify-center gba:w-9 gba:h-9 gba:rounded-full gba:bg-background gba:border gba:shadow-sm">
                      {getEntityIcon(entity.type)}
                    </div>
                    <div>
                      <p className="gba:font-medium gba:text-sm">{entity.name}</p>
                      <p className="gba:text-xs gba:text-muted-foreground">{ENTITY_TYPE_LABELS[entity.type]}</p>
                    </div>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Badge variant={getEntityBadgeVariant(entity.type)} className="gba:text-xs">
                      {entity.type}
                    </Badge>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlinkEntity(entity.id)}
                        className="gba:h-8 gba:w-8 gba:p-0"
                      >
                        <X className="gba:h-4 gba:w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
