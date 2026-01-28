/**
 * Entity Mappings Hook (Generic)
 * Manages field mapping CRUD operations for any entity type
 */

import { useState, useCallback } from 'react'
import { FieldMapping, TargetFieldDefinition } from '@/common/data/customer/agents/types'

export interface UseEntityMappingsReturn {
  mappings: FieldMapping[]
  setMappings: (mappings: FieldMapping[]) => void
  updateMapping: (index: number, field: 'targetField' | 'transformationType', value: string) => void
  removeMapping: (index: number) => void
  addMapping: (sourceField: string) => void
}

export function useEntityMappings(
  targetFields: TargetFieldDefinition[],
  initialMappings: FieldMapping[] = []
): UseEntityMappingsReturn {
  const [mappings, setMappings] = useState<FieldMapping[]>(initialMappings)

  const updateMapping = useCallback(
    (index: number, field: 'targetField' | 'transformationType', value: string) => {
      setMappings(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], [field]: value }

        // Update catalog identifier if switching to catalog type
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

        return updated
      })
    },
    [targetFields]
  )

  const removeMapping = useCallback((index: number) => {
    setMappings(prev => prev.filter((_, i) => i !== index))
  }, [])

  const addMapping = useCallback((sourceField: string) => {
    setMappings(prev => [
      ...prev,
      {
        sourceField,
        targetField: 'firstName', // Default target
        transformationType: 'direct'
      }
    ])
  }, [])

  return {
    mappings,
    setMappings,
    updateMapping,
    removeMapping,
    addMapping
  }
}
