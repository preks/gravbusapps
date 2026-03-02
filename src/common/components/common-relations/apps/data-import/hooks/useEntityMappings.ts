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

  /** Returns the human-readable display label for a stored targetField value. */
  const getDisplayLabel = useCallback(
    (targetFieldValue: string): string => {
      const entityField = targetFields.find(tf => tf.value === targetFieldValue)
      return entityField ? entityField.label : targetFieldValue
    },
    [targetFields]
  )

  const updateTargetFromUnmapped = useCallback(
    (index: number, newTargetField: string) => {
      const current = mappingsRef.current[index]
      if (!current) return

      // Resolve: look up by API value first, then by human-readable label
      const targetFieldInfo =
        targetFields.find(tf => tf.value === newTargetField) || targetFields.find(tf => tf.label === newTargetField)

      const resolvedValue = targetFieldInfo ? targetFieldInfo.value : newTargetField

      // No-op if nothing actually changes
      if (current.targetField === resolvedValue) return

      const oldTargetField = current.targetField
      const updated = [...mappingsRef.current]

      if (targetFieldInfo?.type === 'catalog') {
        updated[index] = {
          ...current,
          targetField: resolvedValue,
          transformationType: 'catalog',
          catalogIdentifier: targetFieldInfo.catalog
        }
      } else {
        updated[index] = {
          ...current,
          targetField: resolvedValue,
          transformationType: 'direct',
          catalogIdentifier: undefined
        }
      }

      setMappings(updated)

      setUnmappedSourceFields(prev => {
        // Remove the newly selected display name from the pool
        let result = prev.filter(f => f !== newTargetField)

        // Return the old target's display label to the pool
        if (oldTargetField) {
          const oldDisplayLabel = getDisplayLabel(oldTargetField)
          if (!result.includes(oldDisplayLabel)) {
            result = [...result, oldDisplayLabel]
          }
        }

        return result
      })
    },
    [targetFields, getDisplayLabel, setMappings]
  )

  /**
   * Removes a mapping row and returns only the target's display label to the
   * unmapped pool (source field is intentionally NOT restored).
   */
  const removeMapping = useCallback(
    (index: number) => {
      const removed = mappingsRef.current[index]
      setMappings(mappingsRef.current.filter((_, i) => i !== index))

      if (removed?.targetField) {
        setUnmappedSourceFields(prev => {
          const targetDisplayLabel = getDisplayLabel(removed.targetField)
          return prev.includes(targetDisplayLabel) ? prev : [...prev, targetDisplayLabel]
        })
      }
    },
    [getDisplayLabel, setMappings]
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
