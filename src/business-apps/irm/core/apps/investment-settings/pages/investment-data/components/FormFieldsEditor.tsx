import React from 'react'
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { Button, Input, Card, Badge, Alert, AlertDescription } from '@newwork/nw-design-system'
import { PlusIcon, TrashIcon, CheckIcon, XIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FieldGroup, FieldDefinition } from '../types'
import { FieldEditorDialog } from './FieldEditorDialog'
import { FieldRowRenderer } from './FieldRowRenderer'
import { useFieldManagement } from '../hooks/useFieldManagement'
import { useFieldDragDrop } from '../hooks/useFieldDragDrop'
import { groupFieldsIntoRows } from '../utils/displayOrderUtils'

interface FormFieldsEditorProps extends BusinessAppContextProps {
  fieldGroups: FieldGroup[]
  onChange: (fieldGroups: FieldGroup[]) => void
  prefixDataTestId?: string
  isInherited?: boolean
  inheritedFrom?: string
  onClearInheritance?: () => void
}

export const FormFieldsEditor: React.FC<FormFieldsEditorProps> = ({
  accessToken,
  userInfo,
  additionalData,
  fieldGroups = [],
  onChange,
  prefixDataTestId = 'form-fields-editor',
  isInherited = false,
  inheritedFrom,
  onClearInheritance
}) => {
  // Field management state and handlers
  const {
    normalizedFieldGroups,
    selectedGroupIndex,
    setSelectedGroupIndex,
    isAddingGroup,
    setIsAddingGroup,
    newGroupLabel,
    setNewGroupLabel,
    editingField,
    setEditingField,
    handleAddGroup,
    handleDeleteGroup,
    handleAddField,
    handleAddNewRow,
    handleUpdateField,
    handleDeleteField
  } = useFieldManagement({
    fieldGroups,
    onChange,
    isInherited,
    onClearInheritance
  })

  // Drag and drop functionality
  const { sensors, handleDragStart, handleDragEnd, getActiveField } = useFieldDragDrop({
    fieldGroups: normalizedFieldGroups,
    selectedGroupIndex,
    onChange
  })

  const currentGroup = normalizedFieldGroups[selectedGroupIndex]
  const rows = currentGroup ? groupFieldsIntoRows(currentGroup.fields) : []
  const activeField = getActiveField(normalizedFieldGroups, selectedGroupIndex)

  return (
    <div className="gba:space-y-4" data-testid={prefixDataTestId}>
      {/* Inheritance Notice */}
      {isInherited && inheritedFrom && (
        <Alert data-testid={`${prefixDataTestId}-inheritance-notice`}>
          <AlertDescription>
            Inherited from <strong>{inheritedFrom}</strong>. Add your own fields to customize.
          </AlertDescription>
        </Alert>
      )}

      {/* Group Tabs */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap" data-testid={`${prefixDataTestId}-group-tabs`}>
        {normalizedFieldGroups.map((group, index) => (
          <div key={group.groupId} className="gba:flex gba:items-center gba:gap-1">
            <Badge
              variant={selectedGroupIndex === index ? 'default' : 'outline'}
              className="gba:cursor-pointer gba:px-3 gba:py-1"
              onClick={() => setSelectedGroupIndex(index)}
              data-testid={`${prefixDataTestId}-group-tab-${index}`}
            >
              {group.groupLabel} ({group.fields?.length || 0})
            </Badge>
            {!isInherited && normalizedFieldGroups.length > 1 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDeleteGroup(index)}
                data-testid={`${prefixDataTestId}-delete-group-${index}`}
              >
                <TrashIcon />
              </Button>
            )}
          </div>
        ))}

        {isAddingGroup ? (
          <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${prefixDataTestId}-add-group-form`}>
            <Input
              value={newGroupLabel}
              onChange={e => setNewGroupLabel(e.target.value)}
              placeholder="Group name"
              data-testid={`${prefixDataTestId}-new-group-input`}
              className="gba:w-36"
            />
            <Button size="icon" onClick={handleAddGroup} data-testid={`${prefixDataTestId}-confirm-group`}>
              <CheckIcon />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsAddingGroup(false)}
              data-testid={`${prefixDataTestId}-cancel-group`}
            >
              <XIcon />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddingGroup(true)}
            data-testid={`${prefixDataTestId}-add-group-button`}
          >
            <PlusIcon /> Add Group
          </Button>
        )}
      </div>

      {/* Fields Grid */}
      {currentGroup && (
        <Card className="gba:p-6" data-testid={`${prefixDataTestId}-fields-container`}>
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
            <h3 className="gba:text-lg gba:font-semibold gba:m-0">{currentGroup.groupLabel}</h3>
            <div className="gba:flex gba:gap-2">
              <Button onClick={handleAddField} data-testid={`${prefixDataTestId}-add-field-button`}>
                <PlusIcon /> Add Field
              </Button>
              {!isInherited && (
                <Button variant="outline" onClick={handleAddNewRow} data-testid={`${prefixDataTestId}-add-row-button`}>
                  <PlusIcon /> New Row
                </Button>
              )}
            </div>
          </div>

          {currentGroup.fields.length === 0 ? (
            <Alert data-testid={`${prefixDataTestId}-no-fields`}>No fields yet. Click "Add Field" to create one.</Alert>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={isInherited ? undefined : handleDragStart}
              onDragEnd={isInherited ? undefined : handleDragEnd}
            >
              <SortableContext items={currentGroup.fields.map(f => f.id)} strategy={rectSortingStrategy}>
                <div className={`${isInherited ? 'gba:opacity-60' : 'gba:opacity-100'}`}>
                  <FieldRowRenderer
                    accessToken={accessToken}
                    userInfo={userInfo}
                    additionalData={additionalData}
                    rows={rows}
                    currentGroup={currentGroup}
                    selectedGroupIndex={selectedGroupIndex}
                    onEditField={(groupIndex, fieldIndex) => setEditingField({ groupIndex, fieldIndex })}
                    onDeleteField={handleDeleteField}
                    prefixDataTestId={`${prefixDataTestId}-row`}
                  />
                </div>
              </SortableContext>

              <DragOverlay>
                {activeField ? (
                  <div className="gba:p-3 gba:rounded-md gba:border gba:border-input gba:bg-card gba:shadow-lg">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span className="gba:font-semibold gba:text-sm">{activeField.label}</span>
                      <Badge variant="outline">{activeField.type}</Badge>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </Card>
      )}

      {/* Field Editor Dialog */}
      {editingField && normalizedFieldGroups[editingField.groupIndex]?.fields[editingField.fieldIndex] && (
        <FieldEditorDialog
          field={normalizedFieldGroups[editingField.groupIndex].fields[editingField.fieldIndex]}
          onSave={(updatedField: FieldDefinition) => {
            handleUpdateField(editingField.groupIndex, editingField.fieldIndex, updatedField)
            setEditingField(null)
          }}
          onCancel={() => setEditingField(null)}
          prefixDataTestId={`${prefixDataTestId}-field-dialog`}
        />
      )}
    </div>
  )
}
