import { useState, useEffect } from 'react'
import { useGetEmployeeNotes } from '../queries/EmployeeNoteQueries'

export const useEmployeeNotesCount = (accessToken: string, employeeId: string, enabled: boolean) => {
  const [count, setCount] = useState<number | null>(null)
  const { fetchEmployeeNotes } = useGetEmployeeNotes({ accessToken })

  useEffect(() => {
    if (!enabled || !employeeId) {
      setCount(null)
      return
    }

    setCount(null)
    let cancelled = false

    fetchEmployeeNotes({ employeeId })
      .then(result => {
        if (!cancelled) {
          setCount(result.EmployeeNote?.length ?? 0)
        }
      })
      .catch(error => {
        if (!cancelled) {
          console.error('Failed to fetch employee notes count:', error)
          setCount(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [enabled, employeeId, fetchEmployeeNotes])

  return { count, setCount }
}
