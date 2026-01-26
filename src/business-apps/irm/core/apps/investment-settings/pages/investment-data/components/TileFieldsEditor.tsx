import React from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Button, Card, Alert, AlertDescription, EmptyState } from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TileField } from '../types'
import { SortableTileItem } from './SortableTileItem'

interface TileFieldsEditorProps extends BusinessAppContextProps {
  tileFields: TileField[]
  onChange: (tileFields: TileField[]) => void
  prefixDataTestId?: string
  isInherited?: boolean
  inheritedFrom?: string
  onClearInheritance?: () => void
}

export const TileFieldsEditor: React.FC<TileFieldsEditorProps> = ({
  tileFields = [],
  onChange,
  prefixDataTestId = 'tile-fields-editor',
  isInherited = false,
  inheritedFrom,
  onClearInheritance,
  accessToken
}) => {
  // Ensure tileFields is always an array
  const normalizedTileFields = tileFields || []

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = normalizedTileFields.findIndex(f => f.key === active.id)
    const newIndex = normalizedTileFields.findIndex(f => f.key === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const updatedFields = arrayMove(normalizedTileFields, oldIndex, newIndex).map((field, idx) => ({
        ...field,
        displayOrder: idx + 1
      }))
      onChange(updatedFields)
    }
  }

  const handleAddTile = () => {
    // Capture current fields before clearing inheritance to preserve them
    const fieldsToPreserve = normalizedTileFields

    // If inherited, clear inheritance first
    if (isInherited && onClearInheritance) {
      onClearInheritance()
    }

    const newTile: TileField = {
      key: `tile-${Date.now()}`,
      label: 'New Tile',
      displayOrder: fieldsToPreserve.length + 1,
      icon: 'ArticleIcon'
    }

    onChange([...fieldsToPreserve, newTile])
  }

  const handleUpdateTile = (index: number, updatedTile: TileField) => {
    const updatedTiles = [...normalizedTileFields]
    updatedTiles[index] = updatedTile
    onChange(updatedTiles)
  }

  const handleDeleteTile = (index: number) => {
    const updatedTiles = normalizedTileFields
      .filter((_, i) => i !== index)
      .map((field, idx) => ({
        ...field,
        displayOrder: idx + 1
      }))
    onChange(updatedTiles)
  }

  return (
    <div className="gba:space-y-6" data-testid={prefixDataTestId}>
      <Card className="gba:p-6" data-testid={`${prefixDataTestId}-container`}>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
          <h3 className="gba:text-lg gba:font-semibold gba:m-0">Tile Fields Configuration</h3>
          <Button onClick={handleAddTile} data-testid={`${prefixDataTestId}-add-button`}>
            <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
            Add Tile
          </Button>
        </div>

        {isInherited && inheritedFrom ? (
          <Alert data-testid={`${prefixDataTestId}-inheritance-notice`}>
            <AlertDescription>
              Inherited from <strong>{inheritedFrom}</strong>. Add your own fields to customize.
            </AlertDescription>
          </Alert>
        ) : (
          <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
            Configure the tile fields that appear on investment records. These are stored in
            investment.additionalProperties.tiles.
          </p>
        )}

        {normalizedTileFields.length === 0 ? (
          <div data-testid={`${prefixDataTestId}-no-tiles`}>
            <EmptyState
              title={isInherited ? 'No tile fields in parent group' : 'No tile fields configured yet'}
              description={
                isInherited
                  ? 'The parent group has no tile fields configured'
                  : 'Click "Add Tile" to create your first tile field'
              }
            />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={isInherited ? undefined : handleDragEnd}
          >
            <SortableContext items={normalizedTileFields.map(f => f.key)} strategy={verticalListSortingStrategy}>
              <div className="gba:space-y-2" style={{ opacity: isInherited ? 0.6 : 1 }}>
                {normalizedTileFields.map((tile, index) => (
                  <SortableTileItem
                    key={tile.key}
                    tile={tile}
                    onUpdate={isInherited ? undefined : updatedTile => handleUpdateTile(index, updatedTile)}
                    onDelete={isInherited ? undefined : () => handleDeleteTile(index)}
                    prefixDataTestId={`${prefixDataTestId}-tile-${index}`}
                    isReadOnly={isInherited}
                    accessToken={accessToken}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </Card>
    </div>
  )
}
