import React, { useMemo } from 'react'
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { Button, Input, Card, CardContent, Badge, Alert, AlertDescription, EmptyState } from '@newwork/nw-design-system'
import { PlusIcon, TrashIcon, CheckIcon, XIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FieldGroup, FieldDefinition, RequiredSubtypeKey } from '../types'
import { coerceRequiredSubtypeKey } from '../utils/formLayoutChoice'
import { FieldEditorDialog } from './FieldEditorDialog'
import { FieldRowRenderer } from './FieldRowRenderer'
import { FormFieldsCatalogControls } from './FormFieldsCatalogControls'
import { FormFieldsCardHeader } from './FormFieldsCardHeader'
import { useFieldManagement } from '../hooks/useFieldManagement'
import { useFieldDragDrop } from '../hooks/useFieldDragDrop'
import { groupFieldsIntoRows } from '../utils/displayOrderUtils'
import {
  createFieldDefinitionFromRegistryEntry,
  type InvestmentFormFieldRegistryEntry
} from '../utils/investmentFormFieldRegistry'
import { validateInvestmentFormFieldsForLayout } from '../utils/investmentFormFieldValidation'

interface FormFieldsEditorProps extends BusinessAppContextProps {
  fieldGroups: FieldGroup[]
  onChange: (fieldGroups: FieldGroup[]) => void
  prefixDataTestId?: string
  isInherited?: boolean
  inheritedFrom?: string
  onClearInheritance?: () => void
  requiredSubtypeKey: RequiredSubtypeKey
  onRequiredSubtypeKeyChange: (key: RequiredSubtypeKey) => void
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
  onClearInheritance,
  requiredSubtypeKey,
  onRequiredSubtypeKeyChange
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
    handleAppendFieldDefinition,
    handleAddNewRow,
    handleUpdateField,
    handleDeleteField
  } = useFieldManagement({
    fieldGroups,
    onChange,
    isInherited,
    onClearInheritance
  })

  const layoutValidation = useMemo(
    () => validateInvestmentFormFieldsForLayout(normalizedFieldGroups, coerceRequiredSubtypeKey(requiredSubtypeKey)),
    [normalizedFieldGroups, requiredSubtypeKey]
  )

  // Drag and drop functionality
  const { sensors, handleDragStart, handleDragEnd, getActiveField } = useFieldDragDrop({
    fieldGroups: normalizedFieldGroups,
    selectedGroupIndex,
    onChange
  })

  const currentGroup = normalizedFieldGroups[selectedGroupIndex]
  const rows = currentGroup ? groupFieldsIntoRows(currentGroup.fields) : []
  const activeField = getActiveField(normalizedFieldGroups, selectedGroupIndex)

  const handleRegistryPick = (entry: InvestmentFormFieldRegistryEntry) => {
    const placeholderOrder = '1.1'
    const newField = createFieldDefinitionFromRegistryEntry(entry, placeholderOrder)
    handleAppendFieldDefinition(newField, { openEditor: true })
  }

  return (
    <div className="gba:space-y-6" data-testid={prefixDataTestId}>
      <FormFieldsCatalogControls
        layoutValidation={layoutValidation}
        prefixDataTestId={prefixDataTestId}
        fieldGroups={normalizedFieldGroups}
        requiredSubtypeKey={requiredSubtypeKey}
        onRequiredSubtypeKeyChange={onRequiredSubtypeKeyChange}
      />

      {/* Inheritance Notice */}
      {isInherited && inheritedFrom && (
        <Alert data-testid={`${prefixDataTestId}-inheritance-notice`}>
          <AlertDescription>
            Currently viewing form fields inherited from <strong>{inheritedFrom}</strong>. Add or change fields to
            create a configuration for this selected level.
          </AlertDescription>
        </Alert>
      )}

      {/* Section tabs and add section button */}
      <Card variant="default" data-testid={`${prefixDataTestId}-groups-card`}>
        <CardContent
          className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:flex-wrap"
          data-testid={`${prefixDataTestId}-group-header`}
        >
          <div
            className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap"
            role="tablist"
            aria-label="Field sections"
            data-testid={`${prefixDataTestId}-group-tabs`}
          >
            {normalizedFieldGroups.map((group, index) => {
              const isSelected = selectedGroupIndex === index
              return (
                <div key={group.groupId} className="gba:flex gba:items-center gba:gap-1">
                  <Button
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedGroupIndex(index)}
                    data-testid={`${prefixDataTestId}-group-tab-${index}`}
                  >
                    {group.groupLabel} ({group.fields?.length || 0})
                  </Button>
                  {!isInherited && normalizedFieldGroups.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteGroup(index)}
                      aria-label={`Delete section ${group.groupLabel}`}
                      data-testid={`${prefixDataTestId}-delete-group-${index}`}
                    >
                      <TrashIcon />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>

          {isAddingGroup ? (
            <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${prefixDataTestId}-add-group-form`}>
              <Input
                value={newGroupLabel}
                onChange={e => setNewGroupLabel(e.target.value)}
                placeholder="Section name"
                data-testid={`${prefixDataTestId}-new-group-input`}
                className="gba:w-48"
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
            <Button onClick={() => setIsAddingGroup(true)} data-testid={`${prefixDataTestId}-add-group-button`}>
              <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
              Add Section
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Fields Grid */}
      {currentGroup ? (
        <div className="gba:flex gba:flex-col gba:gap-4" data-testid={`${prefixDataTestId}-fields-container`}>
          <FormFieldsCardHeader
            groupLabel={currentGroup.groupLabel}
            isInherited={isInherited}
            requiredSubtypeKey={requiredSubtypeKey}
            onRequiredSubtypeKeyChange={onRequiredSubtypeKeyChange}
            normalizedFieldGroups={normalizedFieldGroups}
            onRegistryPick={handleRegistryPick}
            onAddBlankField={handleAddField}
            onAddNewRow={handleAddNewRow}
            prefixDataTestId={prefixDataTestId}
          />

          <Card variant="surface" data-testid={`${prefixDataTestId}-fields-grid-card`}>
            <CardContent className="gba:p-6">
              {currentGroup.fields.length === 0 ? (
                <div data-testid={`${prefixDataTestId}-no-fields`}>
                  <EmptyState
                    title="No fields configured yet"
                    description="Search the catalog above or click Add blank field to start. You can mark a blank field as a custom attribute inside the editor."
                  />
                </div>
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
                      <Card variant="default" className="gba:py-3 gba:shadow-lg">
                        <CardContent className="gba:px-3">
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                            <span className="gba:font-semibold gba:text-sm">{activeField.label}</span>
                          </div>
                          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1">
                            {activeField.required && <Badge variant="destructive">Required</Badge>}
                            <Badge variant="outline">{activeField.type}</Badge>
                            <Badge variant="info">{activeField.displayOrder}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div data-testid={`${prefixDataTestId}-no-group`}>
          <EmptyState
            title="No field section selected"
            description='Click "Add Section" to create your first field section'
          />
        </div>
      )}

      {/* Field Editor Dialog */}
      {editingField &&
        normalizedFieldGroups[editingField.groupIndex]?.fields[editingField.fieldIndex] &&
        (() => {
          const editingFieldDef = normalizedFieldGroups[editingField.groupIndex].fields[editingField.fieldIndex]
          const isNewField = editingFieldDef.label === 'New Field' && editingFieldDef.property === 'investment.newField'
          return (
            <FieldEditorDialog
              field={editingFieldDef}
              onSave={(updatedField: FieldDefinition) => {
                handleUpdateField(editingField.groupIndex, editingField.fieldIndex, updatedField)
                setEditingField(null)
              }}
              onCancel={() => setEditingField(null)}
              prefixDataTestId={`${prefixDataTestId}-field-dialog`}
              lockPropertyAndType={Boolean(editingFieldDef.registryEntryId)}
              requiredSubtypeKey={requiredSubtypeKey}
              isNewField={isNewField}
            />
          )
        })()}
    </div>
  )
}
