import React from 'react'

export interface RowActionsWrapperProps {
  children: React.ReactNode
  /** Accessible label for the row actions toolbar (defaults to "Actions"). */
  toolbarAriaLabel?: string
}

export const RowActionsWrapper = React.memo(function RowActionsWrapper({
  children,
  toolbarAriaLabel = 'Actions'
}: RowActionsWrapperProps) {
  return (
    <div
      role="toolbar"
      aria-label={toolbarAriaLabel}
      className="gba:flex gba:justify-end gba:gap-2 gba:border-0 gba:bg-transparent gba:p-0 gba:cursor-default"
      onClick={e => e.stopPropagation()}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') e.stopPropagation()
      }}
    >
      {children}
    </div>
  )
})

export const RowActionsIcon = React.memo(function RowActionsIcon() {
  return (
    <svg className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
      />
    </svg>
  )
})
