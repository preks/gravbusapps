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

  const updateTargetFromUnmapped = useCallback(
    (index: number, newTargetField: string) => {
      const current = mappingsRef.current[index]
      if (!current) return

      const targetFieldInfo = targetFields.find(tf => tf.value === newTargetField)

      // No-op if nothing actually changes
      if (current.targetField === newTargetField) return

      const updated = [...mappingsRef.current]

      if (targetFieldInfo?.type === 'catalog') {
        updated[index] = {
          ...current,
          targetField: newTargetField,
          transformationType: 'catalog',
          catalogIdentifier: targetFieldInfo.catalog
        }
      } else {
        updated[index] = {
          ...current,
          targetField: newTargetField,
          transformationType: 'direct',
          catalogIdentifier: undefined
        }
      }

      setMappings(updated)
      // unmappedSourceFields tracks only source fields — no manipulation needed here.
      // The freed target field becomes available automatically via availableTargetFields in the UI.
    },
    [targetFields, setMappings]
  )

  /**
   * Removes a mapping row. The source field moves to the unmapped pool so the
   * user can re-add it. The freed target field becomes available in other rows
   * automatically (it is no longer referenced in mappings).
   */
  const removeMapping = useCallback(
    (index: number) => {
      const removed = mappingsRef.current[index]
      setMappings(mappingsRef.current.filter((_, i) => i !== index))

      if (removed?.sourceField) {
        setUnmappedSourceFields(prev => (prev.includes(removed.sourceField) ? prev : [...prev, removed.sourceField]))
      }
    },
    [setMappings]
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
