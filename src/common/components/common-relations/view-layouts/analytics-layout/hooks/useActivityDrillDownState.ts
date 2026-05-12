import { useState, useCallback } from 'react'

export interface DateSelection {
  date: string
  fullDate: string
}

export interface ActivityDrillDownState {
  selectedDate: DateSelection | null
  handleDateClick: (date: string, fullDate: string) => void
  handleDateClose: () => void
}

export const useActivityDrillDownState = (): ActivityDrillDownState => {
  const [selectedDate, setSelectedDate] = useState<DateSelection | null>(null)

  const handleDateClick = useCallback((date: string, fullDate: string) => {
    setSelectedDate({ date, fullDate })
  }, [])

  const handleDateClose = useCallback(() => {
    setSelectedDate(null)
  }, [])

  return { selectedDate, handleDateClick, handleDateClose }
}
