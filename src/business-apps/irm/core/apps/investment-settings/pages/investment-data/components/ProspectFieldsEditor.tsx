import React, { useState } from 'react'
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
import { Button, Card, Alert, AlertDescription, cn } from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ProspectField } from '../types'
import { SortableProspectItem } from './SortableProspectItem'
import { ProspectFieldDialog } from './ProspectFieldDialog'

interface ProspectFieldsEditorProps extends BusinessAppContextProps {
  prospectFields: ProspectField[]
  onChange: (prospectFields: ProspectField[]) => void
  prefixDataTestId?: string
  isInherited?: boolean
  inheritedFrom?: string
  onClearInheritance?: () => void
}

export const ProspectFieldsEditor: React.FC<ProspectFieldsEditorProps> = ({
  prospectFields = [],
  onChange,
  prefixDataTestId = 'prospect-fields-editor',
  isInherited = false,
  inheritedFrom,
  onClearInheritance
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Ensure prospectFields is always an array
  const normalizedProspectFields = prospectFields || []

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = normalizedProspectFields.findIndex(f => f.key === active.id)
    const newIndex = normalizedProspectFields.findIndex(f => f.key === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const updatedFields = arrayMove(normalizedProspectFields, oldIndex, newIndex).map((field, idx) => ({
        ...field,
        displayOrder: idx + 1
      }))
      onChange(updatedFields)
    }
  }

  const handleAddField = () => {
    // If inherited, clear inheritance first
    if (isInherited && onClearInheritance) {
      onClearInheritance()
    }

    const baseFields = isInherited ? [] : normalizedProspectFields

    // Calculate next display order sequentially
    const maxDisplayOrder = baseFields.length > 0 ? Math.max(...baseFields.map(f => f.displayOrder || 0)) : 0

    const newField: ProspectField = {
      key: `field-${Date.now()}`,
      label: 'New Field',
      property: 'investment.newField',
      displayOrder: maxDisplayOrder + 1,
      section: 'overview',
      type: 'text'
    }

    onChange([...baseFields, newField])
    setEditingIndex(baseFields.length)
  }

  const handleUpdateField = (index: number, updatedField: ProspectField) => {
    const updatedFields = [...normalizedProspectFields]
    updatedFields[index] = updatedField
    onChange(updatedFields)
  }

  const handleDeleteField = (index: number) => {
    const updatedFields = normalizedProspectFields
      .filter((_, i) => i !== index)
      .map((field, idx) => ({
        ...field,
        displayOrder: idx + 1
      }))
    onChange(updatedFields)
  }

  return (
    <div className="gba:space-y-4" data-testid={prefixDataTestId}>
      <Card className="gba:p-6" data-testid={`${prefixDataTestId}-container`}>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <h3 className="gba:text-lg gba:font-semibold gba:m-0">Prospect Detail Fields</h3>
          <Button onClick={handleAddField} data-testid={`${prefixDataTestId}-add-button`}>
            <PlusIcon /> Add Field
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
            Configure the fields that appear in the investment prospect detail view header.
          </p>
        )}

        {normalizedProspectFields.length === 0 ? (
          <Alert data-testid={`${prefixDataTestId}-no-fields`}>
            {isInherited
              ? 'No prospect fields configured in the parent group.'
              : 'No prospect fields configured. Click "Add Field" to create one.'}
          </Alert>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={isInherited ? undefined : handleDragEnd}
          >
            <SortableContext items={normalizedProspectFields.map(f => f.key)} strategy={verticalListSortingStrategy}>
              <div className={cn('gba:space-y-2', isInherited ? 'gba:opacity-60' : 'gba:opacity-100')}>
                {normalizedProspectFields.map((field, index) => (
                  <SortableProspectItem
                    key={field.key}
                    field={field}
                    onEdit={isInherited ? undefined : () => setEditingIndex(index)}
                    onDelete={isInherited ? undefined : () => handleDeleteField(index)}
                    prefixDataTestId={`${prefixDataTestId}-field-${index}`}
                    isReadOnly={isInherited}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </Card>

      {/* Prospect Field Editor Dialog */}
      {!isInherited && editingIndex !== null && normalizedProspectFields[editingIndex] && (
        <ProspectFieldDialog
          field={normalizedProspectFields[editingIndex]}
          onSave={updatedField => {
            handleUpdateField(editingIndex, updatedField)
            setEditingIndex(null)
          }}
          onCancel={() => setEditingIndex(null)}
          prefixDataTestId={`${prefixDataTestId}-dialog`}
        />
      )}
    </div>
  )
}
