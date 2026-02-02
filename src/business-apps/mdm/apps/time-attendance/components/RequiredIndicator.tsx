import React from 'react'

/**
 * Required field indicator component - displays an asterisk positioned at the top-right corner.
 * Use with a parent element that has `className="gba:relative"`.
 *
 * @example
 * ```tsx
 * <div className="gba:relative">
 *   <Input ... />
 *   {isRequired && <RequiredIndicator />}
 * </div>
 * ```
 */
export const RequiredIndicator: React.FC = () => (
  <span aria-hidden="true" className="gba:absolute gba:-top-1 gba:-right-2.5 gba:text-destructive gba:text-sm">
    *
  </span>
)
