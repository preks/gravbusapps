import { useState, useEffect, useRef } from 'react'

/**
 * Returns true only after `value` has been true for at least `delayMs`.
 * Returns false immediately when `value` becomes false.
 * Use to avoid showing loading indicators for very short operations (flicker).
 */
export function useDelayedBoolean(value: boolean, delayMs: number): boolean {
  const [delayed, setDelayed] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (value) {
      timeoutRef.current = setTimeout(() => setDelayed(true), delayMs)
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
      }
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      setDelayed(false)
    }
  }, [value, delayMs])

  return delayed
}
