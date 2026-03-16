import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import type { DriveItem, DriveFolder } from '../types/drive.types'

interface UseDriveSelectionOptions {
  items: DriveItem[]
  folders: DriveFolder[]
}

export interface SelectModifiers {
  meta: boolean
  shift: boolean
}

export function useDriveSelection({ items, folders }: UseDriveSelectionOptions) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const lastClickedRef = useRef<string | null>(null)

  const allKeys = useMemo(() => {
    const keys: string[] = []
    folders.forEach(f => keys.push(`drive_folder:${f.id}`))
    items.forEach(i => keys.push(`${i.type}:${i.id}`))
    return keys
  }, [items, folders])

  useEffect(() => {
    setSelectedKeys(new Set())
    lastClickedRef.current = null
  }, [allKeys])

  const handleSelect = useCallback(
    (key: string, { meta, shift }: SelectModifiers) => {
      if (meta) {
        setSelectedKeys(prev => {
          const next = new Set(prev)
          if (next.has(key)) next.delete(key)
          else next.add(key)
          return next
        })
        lastClickedRef.current = key
      } else if (shift && lastClickedRef.current) {
        const lastIdx = allKeys.indexOf(lastClickedRef.current)
        const currentIdx = allKeys.indexOf(key)
        if (lastIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(lastIdx, currentIdx)
          const end = Math.max(lastIdx, currentIdx)
          setSelectedKeys(new Set(allKeys.slice(start, end + 1)))
        }
      } else {
        setSelectedKeys(new Set([key]))
        lastClickedRef.current = key
      }
    },
    [allKeys]
  )

  const selectOnly = useCallback((key: string) => {
    setSelectedKeys(new Set([key]))
    lastClickedRef.current = key
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set())
    lastClickedRef.current = null
  }, [])

  const getSelectedRefs = useCallback(() => {
    return Array.from(selectedKeys).map(key => {
      const i = key.indexOf(':')
      return { entityType: key.substring(0, i), entityId: key.substring(i + 1) }
    })
  }, [selectedKeys])

  return {
    selectedKeys,
    handleSelect,
    selectOnly,
    clearSelection,
    getSelectedRefs,
    selectedCount: selectedKeys.size
  }
}
