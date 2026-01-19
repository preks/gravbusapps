import { useState } from 'react'
import { FieldGroup, FieldDefinition } from '../types'
import {
  groupFieldsIntoRows,
  recalculateDisplayOrders,
  generateGroupId,
  createDefaultGroup,
  createDefaultField
} from '../utils'

interface UseFieldManagementProps {
  fieldGroups: FieldGroup[]
  onChange: (fieldGroups: FieldGroup[]) => void
  isInherited?: boolean
  onClearInheritance?: () => void
}

export const useFieldManagement = ({
  fieldGroups,
  onChange,
  isInherited = false,
  onClearInheritance
}: UseFieldManagementProps) => {
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0)
  const [isAddingGroup, setIsAddingGroup] = useState(false)
  const [newGroupLabel, setNewGroupLabel] = useState('')
  const [editingField, setEditingField] = useState<{ groupIndex: number; fieldIndex: number } | null>(null)

  // Ensure all field groups have a fields array
  const normalizedFieldGroups = fieldGroups.map(group => ({
    ...group,
    fields: group.fields || []
  }))

  const handleAddGroup = () => {
    if (!newGroupLabel.trim()) return

    // If inherited, clear inheritance first
    if (isInherited && onClearInheritance) {
      onClearInheritance()
    }

    const newGroup: FieldGroup = {
      groupId: generateGroupId(),
      groupLabel: newGroupLabel,
      displayOrder: normalizedFieldGroups.length + 1,
      fields: []
    }

    // If inherited, start with empty array + new group; otherwise append
    const updatedGroups = isInherited ? [newGroup] : [...normalizedFieldGroups, newGroup]
    onChange(updatedGroups)
    setNewGroupLabel('')
    setIsAddingGroup(false)
    setSelectedGroupIndex(isInherited ? 0 : normalizedFieldGroups.length)
  }

  const handleDeleteGroup = (index: number) => {
    const updatedGroups = normalizedFieldGroups
      .filter((_, i) => i !== index)
      .map((group, idx) => ({
        ...group,
        displayOrder: idx + 1
      }))
    onChange(updatedGroups)
    setSelectedGroupIndex(Math.max(0, Math.min(selectedGroupIndex, updatedGroups.length - 1)))
  }

  const handleAddField = () => {
    // If inherited, clear inheritance first
    if (isInherited && onClearInheritance) {
      onClearInheritance()
    }

    const currentGroup = isInherited ? createDefaultGroup() : normalizedFieldGroups[selectedGroupIndex]

    if (!currentGroup) return

    const rows = groupFieldsIntoRows(currentGroup.fields)
    const lastRow = rows[rows.length - 1]

    let newDisplayOrder: string
    if (lastRow && lastRow.fields.length < 3) {
      // Add to the last row if it has space (less than 3 columns)
      newDisplayOrder = `${lastRow.row}.${lastRow.fields.length + 1}`
    } else {
      // Create a new row
      const maxRow = Math.max(0, ...rows.map(r => r.row))
      newDisplayOrder = `${maxRow + 1}.1`
    }

    const newField = createDefaultField(newDisplayOrder)

    const updatedGroup = {
      ...currentGroup,
      fields: [...currentGroup.fields, newField]
    }

    const updatedGroups = isInherited ? [updatedGroup] : [...normalizedFieldGroups]
    if (!isInherited) {
      updatedGroups[selectedGroupIndex] = updatedGroup
    }

    onChange(updatedGroups)
    setEditingField({ groupIndex: isInherited ? 0 : selectedGroupIndex, fieldIndex: updatedGroup.fields.length - 1 })
  }

  const handleAddNewRow = () => {
    // If inherited, clear inheritance first
    if (isInherited && onClearInheritance) {
      onClearInheritance()
    }

    const currentGroup = isInherited ? createDefaultGroup() : normalizedFieldGroups[selectedGroupIndex]

    if (!currentGroup) return

    const rows = groupFieldsIntoRows(currentGroup.fields)
    const maxRow = Math.max(0, ...rows.map(r => r.row))
    const newDisplayOrder = `${maxRow + 1}.1`

    const newField = createDefaultField(newDisplayOrder)

    const updatedGroup = {
      ...currentGroup,
      fields: [...currentGroup.fields, newField]
    }

    const updatedGroups = isInherited ? [updatedGroup] : [...normalizedFieldGroups]
    if (!isInherited) {
      updatedGroups[selectedGroupIndex] = updatedGroup
    }

    onChange(updatedGroups)
    setEditingField({ groupIndex: isInherited ? 0 : selectedGroupIndex, fieldIndex: updatedGroup.fields.length - 1 })
  }

  const handleUpdateField = (groupIndex: number, fieldIndex: number, updatedField: FieldDefinition) => {
    const updatedGroups = [...normalizedFieldGroups]
    const targetGroup = { ...updatedGroups[groupIndex] }
    const updatedFields = [...targetGroup.fields]
    updatedFields[fieldIndex] = updatedField
    targetGroup.fields = updatedFields
    updatedGroups[groupIndex] = targetGroup
    onChange(updatedGroups)
  }

  const handleDeleteField = (groupIndex: number, fieldIndex: number) => {
    const currentGroup = normalizedFieldGroups[groupIndex]

    // Remove the field
    const remainingFields = currentGroup.fields.filter((_, i) => i !== fieldIndex)

    // Regroup into rows
    const rows = groupFieldsIntoRows(remainingFields)

    // Recalculate display orders
    const updatedFields = recalculateDisplayOrders(rows)

    const updatedGroups = [...normalizedFieldGroups]
    updatedGroups[groupIndex] = {
      ...currentGroup,
      fields: updatedFields
    }

    onChange(updatedGroups)
  }

  return {
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
  }
}
