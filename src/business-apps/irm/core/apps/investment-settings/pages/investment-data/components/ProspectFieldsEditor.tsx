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
import { Button, Card, Alert, AlertDescription, cn, EmptyState } from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ProspectField } from '../types'
import { SortableProspectItem } from './SortableProspectItem'
import { ProspectFieldDialog } from './ProspectFieldDialog'
import { useTranslation } from 'react-i18next'
import { ConfigurationInfoPopover } from './ConfigurationInfoPopover'

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
  const { t } = useTranslation()
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
    <div className="gba:space-y-6" data-testid={prefixDataTestId}>
      <Card className="gba:p-6" data-testid={`${prefixDataTestId}-container`}>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
          <h3 className="gba:flex gba:items-center gba:gap-2 gba:text-lg gba:font-semibold gba:m-0">
            {t('crm.investment_data.prospect_fields.title', 'Prospect Detail Fields')}
            <ConfigurationInfoPopover
              title={t('crm.investment_data.info.prospect_fields.title', 'Prospect fields')}
              description={t(
                'crm.investment_data.info.prospect_fields.description',
                'Configure which investment fields are shown when investments appear in related account, contact, and opportunity records.'
              )}
              items={[
                t(
                  'crm.investment_data.info.prospect_fields.item_accounts',
                  'Account, contact, and opportunity records use this compact field set for investment context.'
                ),
                t(
                  'crm.investment_data.info.prospect_fields.item_difference',
                  'This is separate from the full investment form field layout.'
                )
              ]}
              ariaLabel={t('crm.investment_data.info.prospect_fields.aria', 'Learn about prospect fields')}
              prefixDataTestId={`${prefixDataTestId}-info`}
            />
          </h3>
          <Button onClick={handleAddField} data-testid={`${prefixDataTestId}-add-button`}>
            <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('crm.investment_data.prospect_fields.add_field', 'Add Field')}
          </Button>
        </div>

        {isInherited && inheritedFrom ? (
          <Alert data-testid={`${prefixDataTestId}-inheritance-notice`}>
            <AlertDescription>
              Currently viewing prospect fields inherited from <strong>{inheritedFrom}</strong>. Add or change fields to
              create a configuration for this selected level.
            </AlertDescription>
          </Alert>
        ) : (
          <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
            {t(
              'crm.investment_data.prospect_fields.description',
              'Configure the fields that appear in the investment prospect detail view header.'
            )}
          </p>
        )}

        {normalizedProspectFields.length === 0 ? (
          <div data-testid={`${prefixDataTestId}-no-fields`}>
            <EmptyState
              title={isInherited ? 'No prospect fields in parent group' : 'No prospect fields configured yet'}
              description={
                isInherited
                  ? 'The parent group has no prospect fields configured'
                  : 'Click "Add Field" to create your first prospect field'
              }
            />
          </div>
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
