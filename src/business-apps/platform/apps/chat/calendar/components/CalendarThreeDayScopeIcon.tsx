import React from 'react'
import { cn } from '@newwork/nw-design-system'

/** Outlook/Teams-style “three day” scope: sheet with header + three vertical columns */
export function CalendarThreeDayScopeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn(className)} aria-hidden>
      <rect x="3" y="3.5" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="3" y1="7.5" x2="21" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="7.5" x2="9" y2="20.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <line x1="15" y1="7.5" x2="15" y2="20.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}
