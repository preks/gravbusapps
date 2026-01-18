import { useState, useCallback } from 'react'

export const useLocalStorage = () => {
  const [data, setData] = useState<Record<string, any>>({})

  const refresh = useCallback(() => {
    const localStorageData: Record<string, any> = {}
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key) {
        const value = window.localStorage.getItem(key)
        if (value !== null) {
          // Try to parse as JSON, if it fails, keep as string
          try {
            const parsed = JSON.parse(value)
            localStorageData[key] = parsed
          } catch {
            // Not valid JSON, keep as string
            localStorageData[key] = value
          }
        }
      }
    }
    // Match original Lowcoder behavior: stringify then parse
    const jsonString = JSON.stringify(localStorageData)
    const parsed = JSON.parse(jsonString)
    setData(parsed)
  }, [])

  return { data, refresh }
}
