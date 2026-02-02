/**
 * Entity Linking Panel Component
 *
 * Panel for linking entities (users, employees, org units) to cases
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Combobox, Button, Badge } from '@newwork/nw-design-system'
import { Link2, X, Building, User as UserIcon, Users, Plus } from 'lucide-react'
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
  entityTypes = ['employee', 'organizationalUnit'],
  context,
  readOnly = false
}) => {
  const { searchResults, isSearching, searchEntities } = useEntityLinking(context)
  const [selectedEntityId, setSelectedEntityId] = useState('')
  const [isLinking, setIsLinking] = useState(false)

  // Handle search input change
  const handleSearch = (query: string) => {
    searchEntities(query, entityTypes)
  }

  // Handle entity selection from combobox
  const handleSelectEntity = (entityId: string) => {
    setSelectedEntityId(entityId)
  }

  // Handle link button click
  const handleLinkEntity = async () => {
    if (!selectedEntityId) return

    const entity = searchResults.find(e => e.id === selectedEntityId)
    if (!entity) return

    // Check if already linked
    if (linkedEntities.some(e => e.id === entity.id)) {
      setSelectedEntityId('')
      return
    }

    try {
      setIsLinking(true)
      await onLinkEntity({
        type: entity.type,
        id: entity.id,
        name: entity.name,
        metadata: entity.metadata
      })
      setSelectedEntityId('')
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

  // Get options for combobox, excluding already linked entities
  const comboboxOptions = searchResults
    .filter(entity => !linkedEntities.some(linked => linked.id === entity.id))
    .map(entity => ({
      value: entity.id,
      label: `${entity.name} (${entity.type === 'organizationalUnit' ? 'Org Unit' : 'Employee'})`
    }))

  return (
    <div className="gba:space-y-4">
      {/* Search and Link Entity */}
      {!readOnly && (
        <Card>
          <CardHeader className="gba:pb-3">
            <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
              <Plus className="gba:h-4 gba:w-4" />
              Link Entity
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:pt-0">
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:flex-1">
                <Combobox
                  value={selectedEntityId}
                  onValueChange={handleSelectEntity}
                  onSearch={handleSearch}
                  options={comboboxOptions}
                  placeholder="Search employees or org units..."
                  searchPlaceholder="Type to search..."
                  emptyText="No results found. Type at least 2 characters."
                  loading={isSearching}
                  loadingText="Searching..."
                  disabled={isLinking}
                />
              </div>
              <Button onClick={handleLinkEntity} disabled={!selectedEntityId || isLinking} size="sm">
                {isLinking ? 'Linking...' : 'Link'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Entities List */}
      <Card>
        <CardHeader className="gba:pb-3">
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <Link2 className="gba:h-4 gba:w-4" />
            Linked Entities {linkedEntities.length > 0 && `(${linkedEntities.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:pt-0">
          {linkedEntities.length === 0 ? (
            <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
              <Link2 className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:opacity-40" />
              <p className="gba:text-sm">No entities linked</p>
              {!readOnly && <p className="gba:text-xs gba:mt-1">Use the search above to link employees or org units</p>}
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
                      {entity.type === 'organizationalUnit' ? 'Org Unit' : entity.type}
                    </Badge>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlinkEntity(entity.id)}
                        className="gba:h-8 gba:w-8 gba:p-0 hover:gba:text-destructive"
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
