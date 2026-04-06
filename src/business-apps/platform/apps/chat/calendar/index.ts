import Calendar from './Calendar'

// Re-export as named exports
export { Calendar }

// Default export for wrapper compatibility
export default {
  Calendar
}

export * from './types'
export * from './hooks/useCalendar'
export * from './components'
