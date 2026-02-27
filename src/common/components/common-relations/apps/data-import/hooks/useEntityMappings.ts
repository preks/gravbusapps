/**
 * Entity Mappings Hook (Generic)
 * Manages field mapping CRUD operations for any entity type
 */

import { useState, useCallback, useRef } from 'react'
import { FieldMapping, TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'

export interface UseEntityMappingsReturn {
  mappings: FieldMapping[]
  setMappings: (mappings: FieldMapping[]) => void
  updateMapping: (index: number, field: 'targetField' | 'transformationType', value: string) => void
  updateTargetFromUnmapped: (index: number, newTargetField: string) => void
  removeMapping: (index: number) => void
  addMapping: (sourceField: string) => void
  unmappedSourceFields: string[]
  setUnmappedSourceFields: (fields: string[]) => void
}

export function useEntityMappings(
  targetFields: TargetFieldDefinition[],
  initialMappings: FieldMapping[] = [],
  initialUnmappedFields: string[] = []
): UseEntityMappingsReturn {
  const [mappings, setMappingsState] = useState<FieldMapping[]>(initialMappings)
  const [unmappedSourceFields, setUnmappedSourceFields] = useState<string[]>(initialUnmappedFields)

  // Keep a ref so callbacks can read the latest mappings without stale closure issues
  const mappingsRef = useRef<FieldMapping[]>(mappings)

  const setMappings = useCallback((next: FieldMapping[]) => {
    mappingsRef.current = next
    setMappingsState(next)
  }, [])

  const updateMapping = useCallback(
    (index: number, field: 'targetField' | 'transformationType', value: string) => {
      const updated = [...mappingsRef.current]
      updated[index] = { ...updated[index], [field]: value }

      if (field === 'targetField') {
        const targetFieldInfo = targetFields.find(tf => tf.value === value)
        if (targetFieldInfo?.type === 'catalog') {
          updated[index].transformationType = 'catalog'
          updated[index].catalogIdentifier = targetFieldInfo.catalog
        } else {
          updated[index].transformationType = 'direct'
          delete updated[index].catalogIdentifier
        }
      }

      setMappings(updated)
    },
    [targetFields, setMappings]
  )

  // Updates the target field from the unmapped source fields pool.
  // • Removes the chosen field from unmapped.
  // • If the previous target came from the unmapped pool (not an entity field), returns it.
  const updateTargetFromUnmapped = useCallback(
    (index: number, newTargetField: string) => {
      const oldTargetField = mappingsRef.current[index]?.targetField
      if (oldTargetField === newTargetField) return

      const updated = [...mappingsRef.current]
      updated[index] = {
        ...updated[index],
        targetField: newTargetField,
        transformationType: 'direct',
        catalogIdentifier: undefined
      }
      setMappings(updated)

      const entityFieldValues = new Set(targetFields.map(tf => tf.value))
      setUnmappedSourceFields(prevUnmapped => {
        let result = prevUnmapped.filter(f => f !== newTargetField)
        // Return old target to unmapped only if it was a source field (not an entity field)
        if (oldTargetField && !entityFieldValues.has(oldTargetField) && !result.includes(oldTargetField)) {
          result = [...result, oldTargetField]
        }
        return result
      })
    },
    [targetFields, setMappings]
  )

  const removeMapping = useCallback(
    (index: number) => {
      const removed = mappingsRef.current[index]
      const entityFieldValues = new Set(targetFields.map(tf => tf.value))

      setMappings(mappingsRef.current.filter((_, i) => i !== index))

      setUnmappedSourceFields(prevUnmapped => {
        let result = prevUnmapped
        if (removed?.sourceField && !result.includes(removed.sourceField)) {
          result = [...result, removed.sourceField]
        }
        if (
          removed?.targetField &&
          !entityFieldValues.has(removed.targetField) &&
          !result.includes(removed.targetField)
        ) {
          result = [...result, removed.targetField]
        }
        return result
      })
    },
    [targetFields, setMappings]
  )

  const addMapping = useCallback(
    (sourceField: string) => {
      setMappings([...mappingsRef.current, { sourceField, targetField: '', transformationType: 'direct' }])
      setUnmappedSourceFields(prev => prev.filter(f => f !== sourceField))
    },
    [setMappings]
  )

  return {
    mappings,
    setMappings,
    updateMapping,
    updateTargetFromUnmapped,
    removeMapping,
    addMapping,
    unmappedSourceFields,
    setUnmappedSourceFields
  }
}
